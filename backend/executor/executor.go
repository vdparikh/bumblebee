package executor

import (
	"encoding/json"
	"fmt"

	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

// Execution Status Constants
const (
	StatusSuccess = "Success"
	StatusFailed  = "Failed"
	StatusError   = "Error"
)

type ExecutionResult struct {
	Status string
	Output string
}

type CheckContext struct {
	TaskInstance    *models.CampaignTaskInstance
	ConnectedSystem *models.ConnectedSystem
	Store           *store.DBStore
}

type CheckExecutor interface {
	Execute(ctx CheckContext) (ExecutionResult, error)

	ValidateParameters(taskParams map[string]interface{}, systemConfig json.RawMessage) (isValid bool, expectedParamsDesc string, err error)
}

var executorRegistry = make(map[string]CheckExecutor)

func RegisterExecutor(checkType string, exec CheckExecutor) {
	if _, exists := executorRegistry[checkType]; exists {
		panic(fmt.Sprintf("executor already registered for check type: %s", checkType))
	}
	executorRegistry[checkType] = exec
}

func GetExecutor(checkType string) (CheckExecutor, bool) {
	executor, exists := executorRegistry[checkType]
	return executor, exists
}

func InitExecutors() {
	RegisterExecutor("http_get_check", &HTTPGetCheckExecutor{})
	RegisterExecutor("script_run_check", &ScriptRunCheckExecutor{})
	RegisterExecutor("port_scan_check", &PortScanCheckExecutor{})
	RegisterExecutor("file_exists_check", &FileExistsCheckExecutor{})
	RegisterExecutor("database_query_check", &DatabaseQueryCheckExecutor{})
}
