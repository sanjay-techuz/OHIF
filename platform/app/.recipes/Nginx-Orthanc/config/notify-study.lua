-- notify-study.lua

-- This script is used to notify the backend when a study is stable
-- It is called when a study is stable and is used to send the study to the backend
-- It is called when a study is stable and is used to send the study to the backend


-- ====================================
--  Function: Handle study modifications
-- ====================================
local function handleAutoModification(studyId)
    local success, metaStr = pcall(function()
        return RestApiGet('/studies/' .. studyId .. '/metadata?expand')
    end)

    if not success or not metaStr then
        print("WARN", "Failed to fetch metadata for study: " .. studyId)
        return
    end

    local meta = ParseJson(metaStr)
    print("DEBUG: Parsed metadata", DumpJson(meta))

    -- Prevent infinite recursion
    if meta["1025"] == "true" then
        print("INFO", "Study " .. studyId .. " already modified by Lua. Skipping.")
        return
    end

    -- Only modify if flag is true
    if meta["1024"] == "true" then
        print("INFO", "Auto-modification enabled for study: " .. studyId)

        local dummyName = "DummyName_" .. tostring(math.random(100, 999))
        print("INFO", "Updating PatientName to: " .. dummyName)

        -- ✅ Mark study as modified to avoid recursion
        local okMeta, errMeta = pcall(function()
            return RestApiPut('/studies/' .. studyId .. '/metadata/1025', "true")
        end)
        if not okMeta then
            print("ERROR", "Failed to set metadata flag: " .. tostring(errMeta))
        end

        -- ✅ Proper full modify request
        local modifyRequest = {
            Force = true,
            KeepSource = true,
            KeepLabels = true,
            Synchronous = true,
            Replace = {
                PatientName = dummyName
            },
            Remove = {},
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
            return RestApiPost('/studies/' .. studyId .. '/modify', DumpJson(modifyRequest))
        end)

        if not ok then
            print("ERROR", "Failed to modify study " .. studyId .. ": " .. tostring(response))
        else
            print("INFO", "Successfully modified study " .. studyId, " response: " .. tostring(response))
        end
    else
        print("INFO", "No auto-modification requested for study: " .. studyId)
    end
end





function OnStableStudy(studyId, tags, metadata)

    -- 1️⃣ Handle optional auto-modification
    local ok, err = pcall(function()
        handleAutoModification(studyId)
    end)
    if not ok then
        print("ERROR", "Auto-modification failed: " .. tostring(err))
    end

    local modifiedFrom = metadata['ModifiedFrom'] or nil  -- Explicitly extract for clarity
    local payload = {
        Event = "StudyModified",
        StudyId = studyId,
        ModifiedFrom = modifiedFrom,  -- Include this for backend to detect modification type
        StudyInstanceUID = tags.StudyInstanceUID or "Unknown",
        tags = tags, -- Table of DICOM tags
        metadata = metadata, -- Table of metadata
    }
    local headers = {
        ["Content-Type"] = "application/json"
    }
    SetHttpTimeout(30)
    local success = HttpPost("http://52.230.96.116/api/admin/cases/orthanc-webhook", DumpJson(payload), headers)
    if success then
        print("INFO", "Webhook sent successfully for study: " .. studyId)
    else
        print("ERROR", "Failed to send webhook for study: " .. studyId)
    end
end


-- Function for study deletion
function OnDeletedStudy(studyId)
    local payload = {
        Event = "Delete",
        StudyId = studyId
    }
    local headers = {
        ["Content-Type"] = "application/json"
    }
    SetHttpTimeout(10)
    local success = HttpPost("http://52.230.96.116/api/admin/cases/orthanc-webhook", DumpJson(payload), headers)
    if success then
        print("INFO", "Delete webhook sent successfully for study: " .. studyId)
    else
        print("ERROR", "Failed to send delete webhook for study: " .. studyId)
    end
end
