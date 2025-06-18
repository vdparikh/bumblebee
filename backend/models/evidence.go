package models

import (
	"time"
	// "gorm.io/gorm" // No longer using GORM for this model directly
)

type Evidence struct {
	// gorm.Model // Removed GORM base model
	ID                     string    `json:"id" db:"id"`
	TaskID                 *string   `json:"taskId,omitempty" db:"task_id"`                                   // Added for master task evidence
	CampaignTaskInstanceID *string   `json:"campaignTaskInstanceId,omitempty" db:"campaign_task_instance_id"` // Can be null if TaskID is set
	UploadedByUserID       string    `json:"uploaderUserId" db:"uploaded_by_user_id"`
	FileName               string    `json:"fileName" db:"file_name"`
	FilePath               string    `json:"filePath" db:"file_path"`
	MimeType               string    `json:"mime_type" db:"mime_type"`
	FileSize               int64     `json:"fileSize" db:"file_size"`
	Description            *string   `json:"description,omitempty" db:"description"`
	UploadedAt             time.Time `json:"uploadedAt" db:"uploaded_at"`
	CreatedAt              time.Time `json:"created_at" db:"created_at"`
	UpdatedAt              time.Time `json:"updated_at" db:"updated_at"`
	// DeletedAt gorm.DeletedAt `gorm:"index" json:"-" db:"deleted_at"` // Only if using soft deletes with a manual mechanism

	ReviewStatus     *string    `json:"review_status,omitempty" db:"review_status"`
	ReviewedByUserID *string    `json:"reviewed_by_user_id,omitempty" db:"reviewed_by_user_id"`
	ReviewedAt       *time.Time `json:"reviewed_at,omitempty" db:"reviewed_at"`
	ReviewComments   *string    `json:"review_comments,omitempty" db:"review_comments"`

	// Fields for JOINs - these will be populated by sqlx if db tags match aliased columns
	UploadedByUser *User `json:"uploadedByUser,omitempty" db:"uploadedbyuser"` // Example, adjust db tag based on actual JOIN alias
	ReviewedByUser *User `json:"reviewedByUser,omitempty" db:"reviewedbyuser"` // Example, adjust db tag based on actual JOIN alias
}
