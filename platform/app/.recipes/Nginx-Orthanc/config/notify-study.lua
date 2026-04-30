-- notify-study.lua
--
-- Notifies the BIEDX backend when a study is stable. Also handles optional
-- auto-anonymization (admin sets isAnonymized=true at upload time → metadata
-- 1024). Anonymization rewrites PatientName while keeping Study/Series/SOP
-- InstanceUIDs (so Cases.study_instance_uid linkage and student measurement
-- UIDs survive untouched) and then DELETES the original source study so only
-- the anonymized copy remains in Orthanc and the backend.


-- ====================================
--  Configuration: Webhook URL
-- ====================================
-- Read from environment variable (set in docker-compose.yml → .env).
local WEBHOOK_URL = os.getenv("WEBHOOK_URL")


-- ====================================
--  Cross-event tracking
-- ====================================
-- Studies we deleted ourselves right after a successful /anonymize. Used to
-- (a) skip the source's StudyModified webhook in OnStableStudy, and
-- (b) skip the spurious Delete webhook in OnDeletedStudy.
-- Lua globals persist across event invocations within the same Orthanc
-- process, which is exactly the lifetime we need.
local studiesDeletedAfterAnonymize = {}


-- ====================================
--  Function: Handle study auto-anonymization
-- ====================================
-- Uses Orthanc's /studies/{id}/anonymize (NOT /modify). /modify rejects
-- patient-tag changes when the source patient has other studies in Orthanc;
-- /anonymize sidesteps that by reassigning the result to a new anonymous
-- patient.
--
-- Why KeepSource:true here?
-- We Keep all 3 UID levels (Study/Series/SOP). When all UIDs are kept,
-- Orthanc REQUIRES KeepSource:true (otherwise it would delete the freshly
-- written anonymized files at the end of the process — the source-delete
-- step matches the same dedup signature as the result). So Orthanc
-- temporarily holds BOTH studies (source + anonymized copy) sharing the
-- same DICOM UIDs but with different Orthanc UUIDs. To avoid duplicate
-- dashboard entries / duplicate webhooks / duplicate Cases rows, we
-- explicitly delete the source via REST after the anonymize completes.
--
-- Returns:
--   "anonymized"  → caller (OnStableStudy) MUST skip the StudyModified
--                   webhook for `studyId`. The anonymized copy will fire
--                   its own OnStableStudy ~StableAge seconds later and
--                   send the webhook with the anonymized state.
--   nil           → caller proceeds with the normal webhook.
local function handleAutoModification(studyId)
    local success, metaStr = pcall(function()
        return RestApiGet('/studies/' .. studyId .. '/metadata?expand')
    end)

    if not success or not metaStr then
        print("WARN", "Failed to fetch metadata for study: " .. studyId)
        return nil
    end

    local meta = ParseJson(metaStr)
    print("DEBUG: Parsed metadata", DumpJson(meta))

    -- Recursion / re-entry guards:
    --  • 1025 / isModifiedByLua — flag we set ourselves on the source
    --    before deleting it. Defends against retries if the delete fails.
    --  • AnonymizedFrom / ModifiedFrom — auto-set by Orthanc on the
    --    derived (anonymized) study. This is the primary signal that the
    --    current event is for the anonymized copy, not the source — and
    --    we must NOT re-anonymize it.
    if meta["1025"] == "true" or meta["isModifiedByLua"] == "true"
       or (meta["AnonymizedFrom"] and meta["AnonymizedFrom"] ~= "")
       or (meta["ModifiedFrom"] and meta["ModifiedFrom"] ~= "") then
        print("INFO", "Study " .. studyId .. " already processed (or is a derived study). Skipping.")
        return nil
    end

    -- Only run if upload pipeline flagged this study for anonymization
    if meta["1024"] == "true" or meta["isAnonymized"] == "true" then
        print("INFO", "Auto-anonymization enabled for study: " .. studyId)

        local dummyName = "DummyName_" .. tostring(math.random(100, 999))
        print("INFO", "Replacing PatientName with: " .. dummyName)

        -- Flag the source first so a retry won't double-anonymize it if
        -- the source ends up sticking around (e.g. delete fails below).
        pcall(function()
            return RestApiPut('/studies/' .. studyId .. '/metadata/1025', "true")
        end)

        local anonymizeRequest = {
            Force = true,
            KeepSource = true,
            KeepLabels = true,
            Synchronous = true,
            Replace = {
                PatientName = dummyName
            },
            Keep = {
                "StudyDescription",
                "SeriesDescription",
                "StudyDate",
                "StudyTime",
                "SeriesDate",
                "SeriesTime",
                "StudyInstanceUID",
                "SeriesInstanceUID",
                "SOPInstanceUID"
            }
        }

        local ok, response = pcall(function()
            return RestApiPost('/studies/' .. studyId .. '/anonymize', DumpJson(anonymizeRequest))
        end)

        -- RestApiPost can return nil on a 4xx without throwing a Lua
        -- error, so `ok` alone is not enough — check for a non-empty body.
        if not ok or response == nil or response == "" then
            print("ERROR", "Failed to anonymize study " .. studyId .. ": " .. tostring(response))
            -- Roll back the recursion flag so a future retry isn't blocked.
            pcall(function()
                return RestApiDelete('/studies/' .. studyId .. '/metadata/1025')
            end)
            return nil
        end

        print("INFO", "Anonymize call succeeded for " .. studyId .. ", response: " .. tostring(response))

        -- Parse the new (anonymized) study's Orthanc UUID. With
        -- KeepSource:true, Orthanc returns a brand-new resource ID even
        -- though the DICOM UIDs are the same as the source.
        local newStudyId = nil
        local parseOk, parsedResp = pcall(function() return ParseJson(response) end)
        if parseOk and parsedResp and parsedResp["ID"] then
            newStudyId = parsedResp["ID"]
        end

        if not newStudyId then
            print("WARN", "Could not parse anonymized study ID from response — leaving source in place to avoid losing data.")
            return nil
        end

        if newStudyId == studyId then
            -- Defensive: shouldn't happen with KeepSource:true, but if it
            -- did, deleting "source" would also delete the result. Bail.
            print("WARN", "Anonymize returned the same ID as source — skipping source delete.")
            return nil
        end

        -- Copy our custom UserMetadata from source → new study. With
        -- KeepSource:true Orthanc creates a brand-new resource and
        -- does NOT inherit UserMetadata (1024 isAnonymized, 1026
        -- folderName, 1027 subSpecialitySlug, 1028 modalitySlug). Without
        -- this copy the new study's OnStableStudy webhook would arrive at
        -- Node with empty metadata.folderName / slugs and the Cases row
        -- would land with folder_name=NULL ("N/A" in admin). Read by
        -- alias (that's what /metadata?expand returns per orthanc.json
        -- UserMetadata config) and write by numeric key (canonical form
        -- Orthanc accepts on PUT). Labels are already carried by
        -- KeepLabels:true so we don't touch them here.
        local metaPairs = {
            { num = "1024", alias = "isAnonymized" },
            { num = "1026", alias = "folderName" },
            { num = "1027", alias = "subSpecialitySlug" },
            { num = "1028", alias = "modalitySlug" }
        }
        for _, pair in ipairs(metaPairs) do
            local val = meta[pair.num] or meta[pair.alias]
            if val and val ~= "" then
                local mOk, mErr = pcall(function()
                    return RestApiPut('/studies/' .. newStudyId .. '/metadata/' .. pair.num, val)
                end)
                if not mOk then
                    print("WARN", "Failed to copy metadata " .. pair.num .. " to new study " .. newStudyId .. ": " .. tostring(mErr))
                end
            end
        end

        print("INFO", "Anonymized " .. studyId .. " => new study " .. newStudyId .. ". Deleting source.")

        -- Mark BEFORE the delete so OnDeletedStudy can see the flag the
        -- moment Orthanc fires it.
        studiesDeletedAfterAnonymize[studyId] = true

        local delOk, delResp = pcall(function()
            return RestApiDelete('/studies/' .. studyId)
        end)

        if not delOk then
            print("ERROR", "Failed to delete source study " .. studyId .. " after anonymize: " .. tostring(delResp))
            -- Source still exists — clear the tracking flag so its
            -- eventual deletion (manual or otherwise) still propagates a
            -- normal Delete webhook to the backend.
            studiesDeletedAfterAnonymize[studyId] = nil
            -- Even though the source wasn't deleted, the anonymized copy
            -- IS in Orthanc and will fire its own OnStableStudy. Skip the
            -- source webhook to avoid double Cases rows. Admin can clean
            -- up the leftover source manually.
            return "anonymized"
        end

        print("INFO", "Source study " .. studyId .. " deleted successfully.")
        return "anonymized"
    end

    print("INFO", "No auto-anonymization requested for study: " .. studyId)
    return nil
end


-- ====================================
--  Event: OnStableStudy
-- ====================================
function OnStableStudy(studyId, tags, metadata)
    -- 1️⃣ Run optional auto-anonymization. Returns "anonymized" if the
    --    source was just anonymized + (attempted to be) deleted. In that
    --    case we MUST suppress the webhook for this studyId — the new
    --    (anonymized) study will fire its own OnStableStudy event ~60s
    --    later and that webhook will arrive at the backend with the
    --    anonymized PatientName + same StudyInstanceUID. Letting the
    --    source's webhook through here would race the new study's
    --    webhook and cause duplicate Cases rows / case_id unique errors.
    local modResult = nil
    local ok, err = pcall(function()
        modResult = handleAutoModification(studyId)
    end)
    if not ok then
        print("ERROR", "Auto-modification failed: " .. tostring(err))
    end

    if modResult == "anonymized" then
        print("INFO", "Skipping StudyModified webhook for source " .. studyId .. " (anonymized; new study will notify backend).")
        return
    end

    -- 2️⃣ Send the StudyModified webhook to BIEDX backend.
    local modifiedFrom = metadata['ModifiedFrom'] or nil
    local payload = {
        Event = "StudyModified",
        StudyId = studyId,
        ModifiedFrom = modifiedFrom,
        StudyInstanceUID = tags.StudyInstanceUID or "Unknown",
        tags = tags,
        metadata = metadata,
    }
    local headers = {
        ["Content-Type"] = "application/json"
    }
    SetHttpTimeout(30)

    local success = HttpPost(WEBHOOK_URL, DumpJson(payload), headers)
    if success then
        print("INFO", "Webhook sent successfully for study: " .. studyId .. " to " .. WEBHOOK_URL)
    else
        print("ERROR", "Failed to send webhook for study: " .. studyId .. " to " .. WEBHOOK_URL)
    end
end


-- ====================================
--  Event: OnDeletedStudy
-- ====================================
function OnDeletedStudy(studyId)
    -- Suppress the Delete webhook for studies we deleted ourselves right
    -- after anonymizing. The backend never received a StudyModified
    -- webhook for those source IDs (we suppressed it above), so there is
    -- nothing in the Cases table to clean up — and a stale Delete
    -- webhook here could interact badly with future logic that looks up
    -- by study_id.
    if studiesDeletedAfterAnonymize[studyId] then
        studiesDeletedAfterAnonymize[studyId] = nil
        print("INFO", "Skipping Delete webhook for study " .. studyId .. " (deleted by Lua after anonymize).")
        return
    end

    local payload = {
        Event = "Delete",
        StudyId = studyId
    }
    local headers = {
        ["Content-Type"] = "application/json"
    }
    SetHttpTimeout(10)

    local success = HttpPost(WEBHOOK_URL, DumpJson(payload), headers)
    if success then
        print("INFO", "Delete webhook sent successfully for study: " .. studyId .. " to " .. WEBHOOK_URL)
    else
        print("ERROR", "Failed to send delete webhook for study: " .. studyId .. " to " .. WEBHOOK_URL)
    end
end
