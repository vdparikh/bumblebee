package models

import "time"

// Evidence represents a piece of evidence uploaded for a task.
// It can be linked to a master Task (via TaskID) or a CampaignTaskInstance (via CampaignTaskInstanceID).
type Evidence struct {
	ID                     string    `json:"id" db:"id"`
	TaskID                 *string   `json:"taskId,omitempty" db:"task_id"`                                   // Pointer to allow null, for master task evidence
	CampaignTaskInstanceID *string   `json:"campaignTaskInstanceId,omitempty" db:"campaign_task_instance_id"` // Pointer to allow null, for campaign task evidence
	UploaderUserID         string    `json:"uploaderUserId" db:"uploader_user_id"`
	UploaderName           string    `json:"uploaderName,omitempty" db:"uploader_name"` // Populated by join, for display
	FileName               string    `json:"fileName" db:"file_name"`
	FilePath               string    `json:"filePath" db:"file_path"` // This might be a URL if stored in cloud
	MimeType               string    `json:"mimeType" db:"mime_type"`
	FileSize               int64     `json:"fileSize" db:"file_size"`
	Description            *string   `json:"description,omitempty" db:"description"`
	UploadedAt             time.Time `json:"uploadedAt" db:"uploaded_at"`
}
