package models

import "time"

// Comment represents a comment made on a task.
type Comment struct {
	// ID        string    `json:"id" db:"id"`
	// TaskID    string    `json:"taskId" db:"task_id"`
	// UserID    string    `json:"userId" db:"user_id"`               // User who made the comment
	// UserName  string    `json:"userName,omitempty" db:"user_name"` // Populated by join, for display
	// Text      string    `json:"text" db:"text"`
	// CreatedAt time.Time `json:"createdAt" db:"created_at"`

	ID                     string  `json:"id" db:"id"`
	TaskID                 *string `json:"taskId,omitempty" db:"task_id"`                                   // Pointer to allow null
	CampaignTaskInstanceID *string `json:"campaignTaskInstanceId,omitempty" db:"campaign_task_instance_id"` // Pointer to allow null
	UserID                 string  `json:"userId" db:"user_id"`                                             // User who made the comment
	UserName               string  `json:"userName,omitempty" db:"user_name"`                               // Populated by join, for display
	Text                   string  `json:"text" db:"text"`
	TaskTitle              *string `json:"taskTitle,omitempty"` // Title of the task the comment is on, for feed display

	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}
