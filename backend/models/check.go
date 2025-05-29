package models

import (
	"time"
)

// User represents an individual interacting with the system.
type User struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"` // e.g., "auditor", "admin", "owner"
}

// ComplianceStandard represents a regulatory standard like NYDFS, SOX, PCI.
type ComplianceStandard struct {
	ID          string `json:"id"`
	Name        string `json:"name"`      // e.g., "NYDFS Cybersecurity Regulation"
	ShortName   string `json:"shortName"` // e.g., "NYDFS"
	Description string `json:"description"`
}

// // Requirement represents a specific rule or control within a ComplianceStandard.
// type Requirement struct {
// 	ID                 string `json:"id"`
// 	StandardID         string `json:"standardId"`
// 	RequirementText    string `json:"requirementText"`
// 	ControlIDReference string `json:"controlIdReference"` // e.g., "NYDFS 500.02"
// }

// Task represents an actionable item created by an auditor based on a Requirement.
// This now incorporates the aspects of the previous CheckDefinition.
type Task struct {
	ID             string    `json:"id"`
	RequirementID  string    `json:"requirementId"` // Link to a specific compliance requirement
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	Category       string    `json:"category"`
	OwnerUserID    string    `json:"ownerUserId"`    // User responsible for this task
	AssigneeUserID string    `json:"assigneeUserId"` // User assigned to perform the task
	Status         string    `json:"status"`         // e.g., "Open", "In Progress", "Pending Review", "Closed", "Failed"
	DueDate        time.Time `json:"dueDate"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`

	// Fields for automated checks (if applicable to the task)
	// CheckType could be "automated_script", "manual_review", "api_check", etc.
	CheckType  *string                `json:"checkType,omitempty"`
	Target     *string                `json:"target,omitempty"`     // e.g., server IP, API endpoint, system name
	Parameters map[string]interface{} `json:"parameters,omitempty"` // e.g., {"filePath": "/etc/passwd"}
}

// TaskExecutionResult stores the outcome of a task's execution (especially for automated parts).
type TaskExecutionResult struct {
	ID               string    `json:"id"`
	TaskID           string    `json:"taskId"`
	Timestamp        time.Time `json:"timestamp"`
	Status           string    `json:"status"` // "PASS", "FAIL", "ERROR", "PENDING"
	Output           string    `json:"output"` // Details, error message, or path to evidence
	ExecutedByUserID string    `json:"executedByUserId"`
}

// // Evidence represents a piece of collected evidence linked to a Task.
// type Evidence struct {
// 	ID               string    `json:"id"`
// 	TaskID           string    `json:"taskId"`
// 	FileName         string    `json:"fileName"`
// 	FilePath         string    `json:"filePath"` // Could be a URL to S3 or local path
// 	Description      string    `json:"description"`
// 	UploadedAt       time.Time `json:"uploadedAt"`
// 	UploadedByUserID string    `json:"uploadedByUserId"`
// }

// // Comment represents a comment made on a Task for collaboration.
// type Comment struct {
// 	ID        string    `json:"id"`
// 	TaskID    string    `json:"taskId"`
// 	UserID    string    `json:"userId"`
// 	Text      string    `json:"text"`
// 	CreatedAt time.Time `json:"createdAt"`
// }
