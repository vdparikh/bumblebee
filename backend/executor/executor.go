package executor

import (
	"encoding/json"
	"fmt"

	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

// ExecutionResult holds the outcome of a check execution.
type ExecutionResult struct {
	Status string // e.g., "Success", "Failed", "Error", "Not Applicable"
	Output string // Detailed output or logs from the execution
}

// CheckContext provides necessary information for an executor.
type CheckContext struct {
	TaskInstance    *models.CampaignTaskInstance
	ConnectedSystem *models.ConnectedSystem // Optional, populated if TaskInstance.Target refers to a ConnectedSystem ID
	Store           *store.DBStore          // Allows executors to fetch additional data if necessary (e.g. secrets)
}

// CheckExecutor defines the interface for different types of automated checks.
type CheckExecutor interface {
	// Execute performs the check using the provided context.
	Execute(ctx CheckContext) (ExecutionResult, error)

	// ValidateParameters checks if the TaskInstance.Parameters and ConnectedSystem.Configuration (if applicable)
	// are valid for this executor. It returns true if valid, a description of expected parameters, and any error.
	ValidateParameters(taskParams map[string]interface{}, systemConfig json.RawMessage) (isValid bool, expectedParamsDesc string, err error)
}

var executorRegistry = make(map[string]CheckExecutor)

// RegisterExecutor makes an executor available by its check type.
func RegisterExecutor(checkType string, exec CheckExecutor) {
	if _, exists := executorRegistry[checkType]; exists {
		panic(fmt.Sprintf("executor already registered for check type: %s", checkType))
	}
	executorRegistry[checkType] = exec
}

// GetExecutor retrieves an executor for a given check type.
func GetExecutor(checkType string) (CheckExecutor, bool) {
	executor, exists := executorRegistry[checkType]
	return executor, exists
}

// InitExecutors initializes and registers all available executors.
// This function should be called from main.go during application startup.
func InitExecutors() {
	RegisterExecutor("http_get_check", &HTTPGetCheckExecutor{})
	RegisterExecutor("script_run_check", &ScriptRunCheckExecutor{})
	RegisterExecutor("port_scan_check", &PortScanCheckExecutor{})
}
