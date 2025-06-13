package executor

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
)

type filePermissionSystemConfig struct {
	Host     string `json:"host"`
	Username string `json:"username"`
	Password string `json:"password"`
	Port     int    `json:"port"`
}

type filePermissionTaskParams struct {
	FilePath            string `json:"file_path"`
	ExpectedPermissions string `json:"expected_permissions"` // e.g., "600", "755"
	Owner               string `json:"owner,omitempty"`
	Group               string `json:"group,omitempty"`
}

type FilePermissionCheckExecutor struct{}

func (e *FilePermissionCheckExecutor) ValidateParameters(params map[string]interface{}, systemConfig json.RawMessage) (bool, string, error) {
	var taskP filePermissionTaskParams
	paramsBytes, err := json.Marshal(params)
	if err != nil {
		return false, "", fmt.Errorf("failed to marshal parameters: %v", err)
	}
	if err := json.Unmarshal(paramsBytes, &taskP); err != nil {
		return false, "", fmt.Errorf("failed to parse parameters: %v", err)
	}

	var sysConfig filePermissionSystemConfig
	if err := json.Unmarshal(systemConfig, &sysConfig); err != nil {
		return false, "", fmt.Errorf("failed to parse system configuration: %v", err)
	}

	if taskP.FilePath == "" {
		return false, "", fmt.Errorf("file path is required")
	}

	if taskP.ExpectedPermissions == "" {
		return false, "", fmt.Errorf("expected permissions is required")
	}

	// Validate permissions format (should be a valid octal number)
	if _, err := strconv.ParseInt(taskP.ExpectedPermissions, 8, 32); err != nil {
		return false, "", fmt.Errorf("invalid permissions format: %v", err)
	}

	return true, "", nil
}

func (e *FilePermissionCheckExecutor) Execute(ctx CheckContext) (ExecutionResult, error) {
	// Parse system configuration
	var sysConfig filePermissionSystemConfig
	if err := json.Unmarshal([]byte(ctx.ConnectedSystem.Configuration), &sysConfig); err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to parse system configuration: %v", err)}, fmt.Errorf("failed to parse system configuration: %v", err)
	}

	// Parse task parameters
	var taskP filePermissionTaskParams
	taskParamsBytes, err := json.Marshal(ctx.TaskInstance.Parameters)
	if err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to parse task parameters: %v", err)}, fmt.Errorf("failed to parse task parameters: %v", err)
	}
	if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to parse task parameters: %v", err)}, fmt.Errorf("failed to parse task parameters: %v", err)
	}

	// Get file info
	fileInfo, err := os.Stat(taskP.FilePath)
	if err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to get file info: %v", err)}, fmt.Errorf("failed to get file info: %v", err)
	}

	// Get current mode
	currentMode := fileInfo.Mode().Perm()
	expectedMode, err := strconv.ParseInt(taskP.ExpectedPermissions, 8, 32)
	if err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Invalid expected permissions: %v", err)}, fmt.Errorf("invalid expected permissions: %v", err)
	}

	// Compare modes
	modeMatches := currentMode == os.FileMode(expectedMode)

	// Get owner and group if specified
	var ownerMatches, groupMatches bool = true, true
	if taskP.Owner != "" {
		// TODO: Implement owner check using os/user package
		// This requires additional system-specific code
		ownerMatches = false
	}
	if taskP.Group != "" {
		// TODO: Implement group check using os/user package
		// This requires additional system-specific code
		groupMatches = false
	}

	// Prepare result
	resultOutput := struct {
		FilePath            string `json:"file_path"`
		CurrentPermissions  string `json:"current_permissions"`
		ExpectedPermissions string `json:"expected_permissions"`
		PermissionsMatch    bool   `json:"permissions_match"`
		OwnerMatches        bool   `json:"owner_matches"`
		GroupMatches        bool   `json:"group_matches"`
		FileExists          bool   `json:"file_exists"`
		FileSize            int64  `json:"file_size"`
		LastModified        string `json:"last_modified"`
	}{
		FilePath:            taskP.FilePath,
		CurrentPermissions:  fmt.Sprintf("%04o", currentMode),
		ExpectedPermissions: taskP.ExpectedPermissions,
		PermissionsMatch:    modeMatches,
		OwnerMatches:        ownerMatches,
		GroupMatches:        groupMatches,
		FileExists:          true,
		FileSize:            fileInfo.Size(),
		LastModified:        fileInfo.ModTime().Format("2006-01-02 15:04:05"),
	}

	outputJSON, err := json.Marshal(resultOutput)
	if err != nil {
		return ExecutionResult{Status: StatusError, Output: fmt.Sprintf("Failed to marshal result: %v", err)}, fmt.Errorf("failed to marshal result: %v", err)
	}

	// Determine status
	status := StatusSuccess
	if !modeMatches || !ownerMatches || !groupMatches {
		status = StatusFailed
	}

	return ExecutionResult{
		Status: status,
		Output: string(outputJSON),
	}, nil
}
