package common

import (
	"context"

	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

// Execution Status Constants
const (
	StatusSuccess = "Success"
	StatusFailed  = "Failed"
	StatusError   = "Error"
	// Add other statuses used by plugins if any, e.g., "completed", "pending"
	StatusCompleted = "completed"
	StatusPending   = "pending"
)

// ExecutionResult holds the outcome of a check execution.
// This structure is returned by an IntegrationPlugin's ExecuteCheck method.
type ExecutionResult struct {
	Status string // Should be one of the Status* constants (e.g., StatusSuccess, StatusFailed, StatusCompleted)
	Output string // Detailed output of the execution, often JSON or plain text
}

// CheckContext provides all necessary information for a plugin to execute a check.
// This structure is passed to an IntegrationPlugin's ExecuteCheck method.
type CheckContext struct {
	// TaskInstance contains the specific details of the task being executed, including its parameters.
	TaskInstance *models.CampaignTaskInstance
	// ConnectedSystem provides details about the target system against which the check is run, including its configuration.
	ConnectedSystem *models.ConnectedSystem
	// Store allows the plugin to access the database if needed (use with caution to maintain plugin isolation).
	Store *store.DBStore
	// StdContext is the standard Go context, allowing for cancellation and deadlines.
	StdContext context.Context
}
