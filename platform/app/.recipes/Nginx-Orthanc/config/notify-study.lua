-- notify-study.lua

-- This script is used to notify the backend when a study is stable
-- It is called when a study is stable and is used to send the study to the backend
-- It is called when a study is stable and is used to send the study to the backend

function OnStableStudy(studyId, tags, metadata)
    local payload = {
        Event = "NewStudy",
        StudyId = studyId,
        tags = tags, -- tags is a table of tags
        metadata = metadata, -- metadata is a table of metadata
    }
    local headers = {
        ["Content-Type"] = "application/json"
    }
    SetHttpTimeout(1)
    local success = HttpPost("http://172.16.16.242:4000/api/admin/cases/orthanc-webhook", DumpJson(payload), headers)
    if success then
        OrthancRestApiLog("INFO", "Webhook sent successfully for study: " .. studyId)
    else
        OrthancRestApiLog("ERROR", "Failed to send webhook for study: " .. studyId)
    end
end
