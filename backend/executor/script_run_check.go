package executor

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"syscall"
)

// ScriptRunCheckExecutor implements CheckExecutor for running local scripts.
type ScriptRunCheckExecutor struct{}

// scriptRunTaskParams defines parameters for script execution.
type scriptRunTaskParams struct {
	ScriptPath       string   `json:"script_path"`        // Required: path to the script
	ScriptArgs       []string `json:"script_args"`        // Optional: arguments for the script
	ExpectedExitCode *int     `json:"expected_exit_code"` // Optional: defaults to 0
}

func (e *ScriptRunCheckExecutor) ValidateParameters(taskParamsMap map[string]interface{}, systemConfigJSON json.RawMessage) (isValid bool, expectedParamsDesc string, err error) {
	expectedDesc := "For script_run_check: Target must be a Connected System (e.g., 'Local Host'). Parameters expects {'script_path': 'string (required)', 'script_args': ['string', ...], 'expected_exit_code': 'number (optional, defaults to 0)'}."

	// A ConnectedSystem is now expected, though its configuration might be minimal for a "local host".
	// We might not need to validate specific fields in systemConfigJSON for a generic "local host" type,
	// but its presence (not nil) could be a soft check.
	// For now, we won't enforce specific content in systemConfigJSON for this executor.
	// If systemConfigJSON is nil, it means the handler didn't pass one, which is an issue if target was set.
	if systemConfigJSON == nil {
		// This case should ideally be caught by the handler if a target was specified but the system wasn't found.
		// If no target is specified for a script_run_check, that's an issue too.
		// The handler now ensures a ConnectedSystem is passed if a target ID is set.
	}

	// Task parameters are optional, but if 'script_args' is present, it must be an array of strings.
	// If 'expected_exit_code' is present, it must be a number.
	if taskParamsMap != nil {
		taskParamsBytes, err := json.Marshal(taskParamsMap)
		if err != nil {
			return false, expectedDesc, fmt.Errorf("failed to marshal task parameters for validation: %w", err)
		}
		var taskP scriptRunTaskParams
		if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
			return false, expectedDesc, fmt.Errorf("failed to parse task parameters: %w. %s", err, expectedDesc)
		}
		if taskP.ScriptPath == "" {
			return false, expectedDesc, fmt.Errorf("task parameter 'script_path' is required and cannot be empty. %s", expectedDesc)
		}
	} else {
		return false, expectedDesc, fmt.Errorf("task parameters are required (at least 'script_path'). %s", expectedDesc)
	}

	return true, expectedDesc, nil
}

func (e *ScriptRunCheckExecutor) Execute(checkCtx CheckContext) (ExecutionResult, error) {
	var output strings.Builder
	resultStatus := "Failed" // Default status

	taskInstance := checkCtx.TaskInstance
	connectedSystem := checkCtx.ConnectedSystem

	if connectedSystem == nil {
		// This implies TaskInstance.Target was not set or the system wasn't found by the handler.
		output.WriteString("Error: A Connected System (Execution Host) must be targeted for script_run_check.\n")
		return ExecutionResult{Status: "Error", Output: output.String()}, fmt.Errorf("execution host (ConnectedSystem) is missing")
	}
	// We can log which system is being "used" even if its config isn't directly used for local script.
	output.WriteString(fmt.Sprintf("Executing via Connected System: %s (Type: %s)\n", connectedSystem.Name, connectedSystem.SystemType))

	var taskP scriptRunTaskParams
	taskParamsBytes, _ := json.Marshal(taskInstance.Parameters)
	_ = json.Unmarshal(taskParamsBytes, &taskP) // Validation ensures script_path exists

	cmd := exec.Command(taskP.ScriptPath, taskP.ScriptArgs...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	output.WriteString(fmt.Sprintf("Attempting to execute script: %s with arguments: %v\n", taskP.ScriptPath, taskP.ScriptArgs))

	err := cmd.Run() // Renamed scriptPath to taskP.ScriptPath

	output.WriteString(fmt.Sprintf("--- Script STDOUT ---\n%s\n", stdout.String()))
	output.WriteString(fmt.Sprintf("--- Script STDERR ---\n%s\n", stderr.String()))

	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			if status, ok := exitErr.Sys().(syscall.WaitStatus); ok {
				exitCode = status.ExitStatus()
			} else {
				output.WriteString(fmt.Sprintf("Failed to determine exit code: %v\n", err))
				return ExecutionResult{Status: "Error", Output: output.String()}, err
			}
		} else {
			output.WriteString(fmt.Sprintf("Failed to run script: %v\n", err))
			return ExecutionResult{Status: "Error", Output: output.String()}, err
		}
	}
	output.WriteString(fmt.Sprintf("Script finished with exit code: %d\n", exitCode))

	expectedExitCode := 0
	if taskP.ExpectedExitCode != nil {
		expectedExitCode = *taskP.ExpectedExitCode
	}

	if exitCode == expectedExitCode {
		resultStatus = "Success"
		output.WriteString(fmt.Sprintf("Check PASSED: Script exited with expected code %d.\n", expectedExitCode))
	} else {
		output.WriteString(fmt.Sprintf("Check FAILED: Script exited with code %d, expected %d.\n", exitCode, expectedExitCode))
	}

	return ExecutionResult{Status: resultStatus, Output: output.String()}, nil
}

var _ CheckExecutor = (*ScriptRunCheckExecutor)(nil)
