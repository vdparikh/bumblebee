package models

import "time"

type Evidence struct {
	ID                     string    `json:"id" db:"id"`
	TaskID                 *string   `json:"taskId,omitempty" db:"task_id"`                                   
	CampaignTaskInstanceID *string   `json:"campaignTaskInstanceId,omitempty" db:"campaign_task_instance_id"` 
	UploaderUserID         string    `json:"uploaderUserId" db:"uploader_user_id"`
	UploaderName           string    `json:"uploaderName,omitempty" db:"uploader_name"` 
	FileName               string    `json:"fileName" db:"file_name"`
	FilePath               string    `json:"filePath" db:"file_path"` 
	MimeType               string    `json:"mimeType" db:"mime_type"`
	FileSize               int64     `json:"fileSize" db:"file_size"`
	Description            *string   `json:"description,omitempty" db:"description"`
	UploadedAt             time.Time `json:"uploadedAt" db:"uploaded_at"`
}
