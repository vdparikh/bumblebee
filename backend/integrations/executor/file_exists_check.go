package executor

import (
	"encoding/json"
	"fmt"
	"strings"
)

// FileExistsCheckExecutor implements the CheckExecutor interface for checking if a file exists on a target system.
// This executor assumes the ConnectedSystem provides a mechanism to execute a command remotely (e.g., via SSH).
type FileExistsCheckExecutor struct{}

// fileExistsSystemConfig defines the expected structure of the ConnectedSystem configuration for this check.
type fileExistsSystemConfig struct {
	Host string `json:"host"` // The hostname or IP address of the target system
	// Add other necessary connection details here (e.g., User, PrivateKeyPath, Password)
}

// fileExistsTaskParams defines the expected structure of the TaskInstance parameters for this check.
type fileExistsTaskParams struct {
	FilePath string `json:"filePath"` // The path to the file to check on the target system
}

// ValidateParameters checks if the provided task parameters and system configuration are valid for the FileExistsCheckExecutor.
func (e *FileExistsCheckExecutor) ValidateParameters(taskParamsMap map[string]interface{}, systemConfigJSON json.RawMessage) (isValid bool, expectedParamsDesc string, err error) {
	expectedDesc := "For file_exists_check: ConnectedSystem.Configuration expects {'host': 'string'}. TaskInstance.Parameters expects {'filePath': 'string (required)'}."

	// Validate System Configuration
	if systemConfigJSON == nil {
		return false, expectedDesc, fmt.Errorf("connected system configuration is required")
	}
	var sysConf fileExistsSystemConfig
	if err := json.Unmarshal(systemConfigJSON, &sysConf); err != nil {
		return false, expectedDesc, fmt.Errorf("failed to parse connected system configuration: %w. %s", err, expectedDesc)
	}
	if sysConf.Host == "" {
		return false, expectedDesc, fmt.Errorf("host is missing in connected system configuration. %s", expectedDesc)
	}
	// TODO: Add validation for other connection details if needed (e.g., User, PrivateKeyPath)

	// Validate Task Parameters
	if taskParamsMap == nil {
		return false, expectedDesc, fmt.Errorf("task parameters are required (at least filePath). %s", expectedDesc)
	}
	taskParamsBytes, err := json.Marshal(taskParamsMap)
	if err != nil {
		return false, expectedDesc, fmt.Errorf("failed to marshal task parameters for validation: %w", err)
	}
	var taskP fileExistsTaskParams
	if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
		return false, expectedDesc, fmt.Errorf("failed to parse task parameters: %w. %s", err, expectedDesc)
	}
	if taskP.FilePath == "" {
		return false, expectedDesc, fmt.Errorf("task parameter 'filePath' is required and cannot be empty. %s", expectedDesc)
	}

	return true, expectedDesc, nil
}

// Execute performs the file existence check on the target system.
func (e *FileExistsCheckExecutor) Execute(checkCtx CheckContext) (ExecutionResult, error) {
	var output strings.Builder
	resultStatus := "Failed"
	fmt.Println(resultStatus)

	// TODO: Implement actual remote command execution logic here.
	// This would typically involve using the ConnectedSystem details (sysConfig)
	// to establish an SSH connection or use another remote execution method,
	// and then running a command like `test -f <filePath>` or `if exist <filePath>`.
	// For this example, we'll just simulate the process.

	output.WriteString(fmt.Sprintf("Simulating file existence check for '%s' on target host...\n", checkCtx.TaskInstance.Parameters["filePath"]))
	output.WriteString("Remote execution capability needs to be implemented for the Connected System type.\n")

	return ExecutionResult{Status: "Error", Output: output.String()}, fmt.Errorf("file_exists_check execution not fully implemented")
}
