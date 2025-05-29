package models

import "time"

// CheckDefinition represents the definition of a compliance check.
type CheckDefinition struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	// Type could be "file_exists", "port_open", "config_value", etc.
	// This would determine how the check is executed.
	CheckType   string            `json:"checkType"`
	Target      string            `json:"target"`     // e.g., server IP, API endpoint
	Parameters  map[string]string `json:"parameters"` // e.g., {"filePath": "/etc/passwd"}
	CreatedAt   time.Time         `json:"createdAt"`
	ScheduledAt *time.Time        `json:"scheduledAt,omitempty"` // For scheduled checks
}

// CheckResult stores the outcome of a compliance check execution.
type CheckResult struct {
	ID                string    `json:"id"`
	CheckDefinitionID string    `json:"checkDefinitionId"`
	Timestamp         time.Time `json:"timestamp"`
	Status            string    `json:"status"` // "PASS", "FAIL", "ERROR", "PENDING"
	Output            string    `json:"output"` // Details, error message, or path to evidence
	// Evidence []Evidence // Link to collected evidence items
}

// Evidence could be a more complex struct if storing metadata about files, etc.
// For now, output in CheckResult can hold simple evidence or a link.
