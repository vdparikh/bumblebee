package executor

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

type scriptRunSystemConfig struct {
	Host string `json:"host"`
}

type scriptRunTaskParams struct {
	Command          string `json:"command"`
	ExpectedExitCode *int   `json:"expected_exit_code"`
}

type ScriptRunCheckExecutor struct{}

func (e *ScriptRunCheckExecutor) ValidateParameters(taskParams map[string]interface{}, systemConfig json.RawMessage) (bool, string, error) {
	var taskP scriptRunTaskParams
	taskParamsBytes, err := json.Marshal(taskParams)
	if err != nil {
		return false, "", fmt.Errorf("error marshalling task parameters: %v", err)
	}
	if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
		return false, "", fmt.Errorf("error unmarshalling task parameters: %v", err)
	}

	expectedDesc := "Expected parameters: {\"command\": \"string\", \"expected_exit_code\": number (optional)}"

	if taskP.Command == "" {
		return false, expectedDesc, fmt.Errorf("task parameter 'command' is required. %s", expectedDesc)
	}

	return true, expectedDesc, nil
}

func (e *ScriptRunCheckExecutor) Execute(checkCtx CheckContext) (ExecutionResult, error) {
	var output strings.Builder
	resultStatus := StatusFailed // Default to Failed

	taskInstance := checkCtx.TaskInstance
	connectedSystem := checkCtx.ConnectedSystem

	if connectedSystem == nil {
		output.WriteString("Error: Connected System is required for script_run_check but was not found or provided.\n")
		return ExecutionResult{Status: StatusError, Output: output.String()}, fmt.Errorf("connected system is nil for target ID %s", *taskInstance.Target)
	}

	var sysConfig scriptRunSystemConfig
	if err := json.Unmarshal(connectedSystem.Configuration, &sysConfig); err != nil {
		output.WriteString(fmt.Sprintf("Error parsing configuration for Connected System %s (%s): %v\n", connectedSystem.Name, connectedSystem.ID, err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}

	var taskP scriptRunTaskParams
	taskParamsBytes, err := json.Marshal(taskInstance.Parameters)
	if err != nil {
		output.WriteString(fmt.Sprintf("Error marshalling task parameters: %v\n", err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}
	if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
		output.WriteString(fmt.Sprintf("Error unmarshalling task parameters: %v\n", err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}

	output.WriteString(fmt.Sprintf("Attempting to run script on %s using Connected System: %s\n", sysConfig.Host, connectedSystem.Name))
	output.WriteString(fmt.Sprintf("Script command: %s\n", taskP.Command))

	// Create a new command
	cmd := exec.Command("ssh", sysConfig.Host, taskP.Command)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Run the command
	err = cmd.Run()
	output.WriteString("Command output:\n")
	output.WriteString(stdout.String())
	if stderr.Len() > 0 {
		output.WriteString("Command errors:\n")
		output.WriteString(stderr.String())
	}

	expectedExitCode := 0
	if taskP.ExpectedExitCode != nil {
		expectedExitCode = *taskP.ExpectedExitCode
	}

	exitCode := cmd.ProcessState.ExitCode()
	if exitCode == expectedExitCode {
		resultStatus = StatusSuccess
		output.WriteString(fmt.Sprintf("Check PASSED: Script exited with expected code %d.\n", expectedExitCode))
	} else {
		output.WriteString(fmt.Sprintf("Check FAILED: Script exited with code %d, expected %d.\n", exitCode, expectedExitCode))
	}

	return ExecutionResult{Status: resultStatus, Output: output.String()}, nil
}

var _ CheckExecutor = (*ScriptRunCheckExecutor)(nil)
