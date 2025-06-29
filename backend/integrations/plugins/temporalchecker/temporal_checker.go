package temporalchecker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/models"
)

const (
	PluginID_TemporalChecker               = "temporal_checker_v1"
	PluginName_TemporalChecker             = "Temporal Workflow Execution Checker"
	CheckTypeKey_TemporalWorkflowExecution = "temporal_workflow_execution"
)

type TemporalChecker struct{}

func New() *TemporalChecker {
	return &TemporalChecker{}
}

func (p *TemporalChecker) ID() string {
	return PluginID_TemporalChecker
}

func (p *TemporalChecker) Name() string {
	return PluginName_TemporalChecker
}

func (p *TemporalChecker) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		CheckTypeKey_TemporalWorkflowExecution: {
			Label:       "Temporal Workflow Execution",
			TargetType:  "connected_system",
			TargetLabel: "Temporal Instance",
			Parameters: []models.ParameterDefinition{
				{
					Name:        "workflowId",
					Label:       "Workflow ID",
					Type:        "text",
					Required:    true,
					Placeholder: "my-workflow-id",
					HelpText:    "The ID of the Temporal workflow to execute.",
				},
				{
					Name:        "taskQueue",
					Label:       "Task Queue",
					Type:        "text",
					Required:    true,
					Placeholder: "default",
					HelpText:    "The task queue where the workflow will be executed.",
				},
				{
					Name:        "workflowType",
					Label:       "Workflow Type",
					Type:        "text",
					Required:    true,
					Placeholder: "MyWorkflow",
					HelpText:    "The type/name of the workflow to execute.",
				},
				{
					Name:        "inputData",
					Label:       "Input Data (JSON)",
					Type:        "textarea",
					Required:    false,
					Placeholder: `{"key": "value"}`,
					HelpText:    "Optional JSON input data to pass to the workflow.",
				},
				{
					Name:        "timeout",
					Label:       "Timeout (seconds)",
					Type:        "number",
					Required:    false,
					Placeholder: "300",
					HelpText:    "Optional timeout in seconds for workflow execution. Defaults to 300 seconds.",
				},
			},
		},
	}
}

type TemporalSystemConfig struct {
	ServerURL string `json:"serverUrl"`
	Namespace string `json:"namespace"`
}

type temporalWorkflowExecutionResponse struct {
	WorkflowID    string      `json:"workflowId"`
	RunID         string      `json:"runId"`
	Status        string      `json:"status"`
	Result        interface{} `json:"result,omitempty"`
	Error         string      `json:"error,omitempty"`
	StartTime     time.Time   `json:"startTime"`
	EndTime       time.Time   `json:"endTime"`
	ExecutionTime string      `json:"executionTime"`
}

type temporalStartWorkflowRequest struct {
	WorkflowID   string      `json:"workflowId"`
	WorkflowType string      `json:"workflowType"`
	TaskQueue    string      `json:"taskQueue"`
	Input        interface{} `json:"input,omitempty"`
}

type temporalStartWorkflowResponse struct {
	WorkflowID string `json:"workflowId"`
	RunID      string `json:"runId"`
}

func (p *TemporalChecker) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	if checkTypeKey != CheckTypeKey_TemporalWorkflowExecution {
		return common.ExecutionResult{Status: common.StatusError, Output: "Unsupported check type"}, fmt.Errorf("unsupported check type: %s", checkTypeKey)
	}

	var sysConfig TemporalSystemConfig
	if err := json.Unmarshal(ctx.ConnectedSystem.Configuration, &sysConfig); err != nil {
		return common.ExecutionResult{Status: common.StatusError, Output: "Failed to parse Temporal system configuration"}, fmt.Errorf("unmarshal temporal config: %w", err)
	}

	if sysConfig.ServerURL == "" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Temporal ServerURL is required"}, fmt.Errorf("missing temporal server URL")
	}

	// Debug: Print all received parameters
	fmt.Printf("=== TEMPORAL DEBUG ===\n")
	fmt.Printf("All task parameters: %+v\n", ctx.TaskInstance.Parameters)
	fmt.Printf("Task instance ID: %s\n", ctx.TaskInstance.ID)
	fmt.Printf("Connected system config: %+v\n", sysConfig)

	// Get workflow parameters
	workflowID, ok := ctx.TaskInstance.Parameters["workflowId"].(string)
	if !ok || workflowID == "" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Missing workflowId parameter"}, fmt.Errorf("missing workflowId parameter")
	}

	taskQueue, ok := ctx.TaskInstance.Parameters["taskQueue"].(string)
	if !ok || taskQueue == "" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Missing taskQueue parameter"}, fmt.Errorf("missing taskQueue parameter")
	}

	workflowType, ok := ctx.TaskInstance.Parameters["workflowType"].(string)
	if !ok || workflowType == "" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Missing workflowType parameter"}, fmt.Errorf("missing workflowType parameter")
	}

	// Debug: Print extracted parameters
	fmt.Printf("Extracted parameters:\n")
	fmt.Printf("  workflowID: '%s'\n", workflowID)
	fmt.Printf("  taskQueue: '%s'\n", taskQueue)
	fmt.Printf("  workflowType: '%s'\n", workflowType)

	// Get optional parameters
	var inputData interface{}
	if inputDataStr, ok := ctx.TaskInstance.Parameters["inputData"].(string); ok && inputDataStr != "" {
		if err := json.Unmarshal([]byte(inputDataStr), &inputData); err != nil {
			return common.ExecutionResult{Status: common.StatusError, Output: "Invalid inputData JSON"}, fmt.Errorf("invalid input data JSON: %w", err)
		}
		fmt.Printf("  inputData: %+v\n", inputData)
	}

	timeout := 300 * time.Second // Default 5 minutes
	if timeoutStr, ok := ctx.TaskInstance.Parameters["timeout"].(float64); ok && timeoutStr > 0 {
		timeout = time.Duration(timeoutStr) * time.Second
	}
	fmt.Printf("  timeout: %v\n", timeout)
	fmt.Printf("=== END DEBUG ===\n")

	// Execute the Temporal workflow
	executionResult, err := p.executeTemporalWorkflow(sysConfig, workflowID, workflowType, taskQueue, inputData, timeout)
	if err != nil {
		return common.ExecutionResult{Status: common.StatusFailed, Output: err.Error()}, err
	}

	// Determine status based on Temporal execution result
	status := common.StatusSuccess
	if executionResult.Status == "failed" || executionResult.Error != "" {
		status = common.StatusFailed
	}

	// Generate Temporal UI URL
	temporalUIURL := p.generateTemporalUIURL(sysConfig.ServerURL, sysConfig.Namespace, executionResult.WorkflowID, executionResult.RunID)

	result := map[string]interface{}{
		"workflowId":     executionResult.WorkflowID,
		"runId":          executionResult.RunID,
		"status":         executionResult.Status,
		"result":         executionResult.Result,
		"startTime":      executionResult.StartTime,
		"endTime":        executionResult.EndTime,
		"executionTime":  executionResult.ExecutionTime,
		"temporalServer": sysConfig.ServerURL,
		"namespace":      sysConfig.Namespace,
		"temporalUIURL":  temporalUIURL,
	}

	if executionResult.Error != "" {
		result["error"] = executionResult.Error
	}

	jsonOut, _ := json.Marshal(result)
	return common.ExecutionResult{Status: status, Output: string(jsonOut)}, nil
}

func (p *TemporalChecker) executeTemporalWorkflow(config TemporalSystemConfig, workflowID, workflowType, taskQueue string, inputData interface{}, timeout time.Duration) (*temporalWorkflowExecutionResponse, error) {
	startTime := time.Now()

	// First try REST API
	restResult, err := p.tryRESTAPI(config, workflowID, workflowType, taskQueue, inputData, timeout)
	if err == nil {
		return restResult, nil
	}

	fmt.Printf("REST API failed: %v, trying CLI fallback\n", err)

	// Fallback to CLI
	cliResult, err := p.tryCLI(config, workflowID, workflowType, taskQueue, inputData, timeout)
	if err != nil {
		endTime := time.Now()
		return &temporalWorkflowExecutionResponse{
			WorkflowID:    workflowID,
			Status:        "failed",
			Error:         fmt.Sprintf("both REST API and CLI failed. REST error: %v, CLI error: %v", restResult.Error, err),
			StartTime:     startTime,
			EndTime:       endTime,
			ExecutionTime: endTime.Sub(startTime).String(),
		}, nil
	}

	return cliResult, nil
}

func (p *TemporalChecker) tryRESTAPI(config TemporalSystemConfig, workflowID, workflowType, taskQueue string, inputData interface{}, timeout time.Duration) (*temporalWorkflowExecutionResponse, error) {
	client := &http.Client{Timeout: timeout}

	// Prepare the workflow start request
	startRequest := temporalStartWorkflowRequest{
		WorkflowID:   workflowID,
		WorkflowType: workflowType,
		TaskQueue:    taskQueue,
		Input:        inputData,
	}

	requestBody, err := json.Marshal(startRequest)
	if err != nil {
		return nil, fmt.Errorf("marshal workflow start request: %w", err)
	}

	// Try different possible Temporal API endpoints
	endpoints := []string{
		fmt.Sprintf("%s/api/v1/namespaces/%s/workflows", config.ServerURL, config.Namespace),
		fmt.Sprintf("%s/namespaces/%s/workflows", config.ServerURL, config.Namespace),
		fmt.Sprintf("%s/api/namespaces/%s/workflows", config.ServerURL, config.Namespace),
	}

	for _, url := range endpoints {
		fmt.Printf("Trying Temporal REST endpoint: %s\n", url)

		// Create HTTP request to start workflow
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(requestBody))
		if err != nil {
			continue
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", "compliance-automation/1.0")

		// Execute the request
		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			continue
		}

		fmt.Printf("REST Response from %s: Status=%d, Body=%s\n", url, resp.StatusCode, string(body))

		// Check if the request was successful
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			// Try to parse the response
			var startResponse temporalStartWorkflowResponse
			if err := json.Unmarshal(body, &startResponse); err == nil {
				return &temporalWorkflowExecutionResponse{
					WorkflowID:    startResponse.WorkflowID,
					RunID:         startResponse.RunID,
					Status:        "started",
					StartTime:     time.Now(),
					EndTime:       time.Now(),
					ExecutionTime: "0s",
				}, nil
			} else {
				// If we can't parse the response but got a success status, consider it successful
				return &temporalWorkflowExecutionResponse{
					WorkflowID:    workflowID,
					Status:        "started",
					Result:        string(body),
					StartTime:     time.Now(),
					EndTime:       time.Now(),
					ExecutionTime: "0s",
				}, nil
			}
		}
	}

	return nil, fmt.Errorf("all REST API endpoints failed")
}

func (p *TemporalChecker) tryCLI(config TemporalSystemConfig, workflowID, workflowType, taskQueue string, inputData interface{}, timeout time.Duration) (*temporalWorkflowExecutionResponse, error) {
	startTime := time.Now()

	// Debug: Print what we're about to execute
	fmt.Printf("=== CLI DEBUG ===\n")
	fmt.Printf("Building CLI command with:\n")
	fmt.Printf("  workflowID: '%s'\n", workflowID)
	fmt.Printf("  workflowType: '%s'\n", workflowType)
	fmt.Printf("  taskQueue: '%s'\n", taskQueue)
	fmt.Printf("  inputData: %+v\n", inputData)
	fmt.Printf("  namespace: '%s'\n", config.Namespace)

	// Build the temporal CLI command
	args := []string{
		"workflow", "start",
		"--workflow-id", workflowID,
		"--task-queue", taskQueue,
		"--type", workflowType,
	}

	// Add namespace if specified
	if config.Namespace != "" {
		args = append(args, "--namespace", config.Namespace)
	}

	// Add input data if provided
	if inputData != nil {
		inputJSON, err := json.Marshal(inputData)
		if err == nil {
			args = append(args, "--input", string(inputJSON))
		}
	}

	fmt.Printf("Final CLI command: temporal %s\n", strings.Join(args, " "))
	fmt.Printf("=== END CLI DEBUG ===\n")

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	// Execute the command
	cmd := exec.CommandContext(ctx, "temporal", args...)
	output, err := cmd.CombinedOutput()

	endTime := time.Now()
	executionTime := endTime.Sub(startTime).String()

	if err != nil {
		return &temporalWorkflowExecutionResponse{
			WorkflowID:    workflowID,
			Status:        "failed",
			Error:         fmt.Sprintf("CLI execution failed: %v, output: %s", err, string(output)),
			StartTime:     startTime,
			EndTime:       endTime,
			ExecutionTime: executionTime,
		}, nil
	}

	// Parse the CLI output to extract workflow run ID
	outputStr := string(output)
	runID := p.extractRunIDFromOutput(outputStr)

	fmt.Printf("CLI output: %s\n", outputStr)
	fmt.Printf("Extracted run ID: '%s'\n", runID)

	// If we got a run ID, wait for workflow completion and get the result
	if runID != "" {
		return p.waitForWorkflowCompletion(config, workflowID, runID, startTime, timeout)
	}

	// If no run ID found, return what we have
	return &temporalWorkflowExecutionResponse{
		WorkflowID:    workflowID,
		RunID:         runID,
		Status:        "started",
		Result:        outputStr,
		StartTime:     startTime,
		EndTime:       endTime,
		ExecutionTime: executionTime,
	}, nil
}

// extractRunIDFromOutput tries to extract the run ID from Temporal CLI output
func (p *TemporalChecker) extractRunIDFromOutput(output string) string {
	lines := strings.Split(output, "\n")

	// Look for various patterns in the output
	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Pattern 1: "Run ID: xyz123"
		if strings.Contains(line, "Run ID:") {
			parts := strings.Split(line, "Run ID:")
			if len(parts) > 1 {
				runID := strings.TrimSpace(parts[1])
				if runID != "" {
					return runID
				}
			}
		}

		// Pattern 2: "Started Workflow Id: abc, Run Id: xyz123"
		if strings.Contains(line, "Run Id:") {
			parts := strings.Split(line, "Run Id:")
			if len(parts) > 1 {
				runID := strings.TrimSpace(parts[1])
				// Remove any trailing text after the run ID
				if commaIndex := strings.Index(runID, ","); commaIndex != -1 {
					runID = runID[:commaIndex]
				}
				if runID != "" {
					return runID
				}
			}
		}

		// Pattern 3: Look for UUID-like patterns
		if strings.Contains(line, "-") && len(line) > 20 {
			// This might be a run ID (UUID format)
			parts := strings.Fields(line)
			for _, part := range parts {
				if strings.Contains(part, "-") && len(part) > 20 {
					return part
				}
			}
		}
	}

	return ""
}

// waitForWorkflowCompletion waits for the workflow to complete and returns the result
func (p *TemporalChecker) waitForWorkflowCompletion(config TemporalSystemConfig, workflowID, runID string, startTime time.Time, timeout time.Duration) (*temporalWorkflowExecutionResponse, error) {
	fmt.Printf("Waiting for workflow completion: %s (run: %s)\n", workflowID, runID)

	// Calculate remaining timeout
	elapsed := time.Since(startTime)
	remainingTimeout := timeout - elapsed
	if remainingTimeout <= 0 {
		return &temporalWorkflowExecutionResponse{
			WorkflowID:    workflowID,
			RunID:         runID,
			Status:        "timeout",
			Error:         "Workflow execution timed out",
			StartTime:     startTime,
			EndTime:       time.Now(),
			ExecutionTime: time.Since(startTime).String(),
		}, nil
	}

	// Build the describe command to get workflow status and result
	args := []string{
		"workflow", "describe",
		"--workflow-id", workflowID,
		"--run-id", runID,
	}

	if config.Namespace != "" {
		args = append(args, "--namespace", config.Namespace)
	}

	// Poll for completion
	pollInterval := 2 * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), remainingTimeout)
	defer cancel()

	for {
		select {
		case <-ctx.Done():
			return &temporalWorkflowExecutionResponse{
				WorkflowID:    workflowID,
				RunID:         runID,
				Status:        "timeout",
				Error:         "Workflow polling timed out",
				StartTime:     startTime,
				EndTime:       time.Now(),
				ExecutionTime: time.Since(startTime).String(),
			}, nil

		case <-time.After(pollInterval):
			// Check workflow status
			cmd := exec.CommandContext(ctx, "temporal", args...)
			output, err := cmd.CombinedOutput()

			if err != nil {
				fmt.Printf("Error checking workflow status: %v\n", err)
				continue
			}

			outputStr := string(output)
			fmt.Printf("Workflow status check output: %s\n", outputStr)

			// Try to parse JSON output first
			status := p.parseStatusFromJSON(outputStr)
			if status != "" {
				fmt.Printf("Parsed status from JSON: %s\n", status)

				switch status {
				case "Completed":
					// Get the result
					result := p.extractResultFromJSON(outputStr)
					return &temporalWorkflowExecutionResponse{
						WorkflowID:    workflowID,
						RunID:         runID,
						Status:        "completed",
						Result:        result,
						StartTime:     startTime,
						EndTime:       time.Now(),
						ExecutionTime: time.Since(startTime).String(),
					}, nil
				case "Failed":
					errorMsg := p.extractErrorFromJSON(outputStr)
					return &temporalWorkflowExecutionResponse{
						WorkflowID:    workflowID,
						RunID:         runID,
						Status:        "failed",
						Error:         errorMsg,
						StartTime:     startTime,
						EndTime:       time.Now(),
						ExecutionTime: time.Since(startTime).String(),
					}, nil
				case "Terminated":
					return &temporalWorkflowExecutionResponse{
						WorkflowID:    workflowID,
						RunID:         runID,
						Status:        "terminated",
						StartTime:     startTime,
						EndTime:       time.Now(),
						ExecutionTime: time.Since(startTime).String(),
					}, nil
				case "TimedOut":
					return &temporalWorkflowExecutionResponse{
						WorkflowID:    workflowID,
						RunID:         runID,
						Status:        "timedout",
						Error:         "Workflow timed out",
						StartTime:     startTime,
						EndTime:       time.Now(),
						ExecutionTime: time.Since(startTime).String(),
					}, nil
				}
			}

			// Fallback to text parsing for older CLI versions
			if strings.Contains(outputStr, "ExecutionStatus: COMPLETED") {
				// Get the result
				result := p.extractResultFromOutput(outputStr)
				return &temporalWorkflowExecutionResponse{
					WorkflowID:    workflowID,
					RunID:         runID,
					Status:        "completed",
					Result:        result,
					StartTime:     startTime,
					EndTime:       time.Now(),
					ExecutionTime: time.Since(startTime).String(),
				}, nil
			} else if strings.Contains(outputStr, "ExecutionStatus: FAILED") {
				errorMsg := p.extractErrorFromOutput(outputStr)
				return &temporalWorkflowExecutionResponse{
					WorkflowID:    workflowID,
					RunID:         runID,
					Status:        "failed",
					Error:         errorMsg,
					StartTime:     startTime,
					EndTime:       time.Now(),
					ExecutionTime: time.Since(startTime).String(),
				}, nil
			} else if strings.Contains(outputStr, "ExecutionStatus: TERMINATED") {
				return &temporalWorkflowExecutionResponse{
					WorkflowID:    workflowID,
					RunID:         runID,
					Status:        "terminated",
					StartTime:     startTime,
					EndTime:       time.Now(),
					ExecutionTime: time.Since(startTime).String(),
				}, nil
			}

			// Workflow is still running, continue polling
			fmt.Printf("Workflow still running, polling again in %v...\n", pollInterval)
		}
	}
}

// parseStatusFromJSON extracts the workflow status from JSON output
func (p *TemporalChecker) parseStatusFromJSON(output string) string {
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(output), &result); err != nil {
		return ""
	}

	// Navigate to workflowExecutionInfo.status
	if workflowInfo, ok := result["workflowExecutionInfo"].(map[string]interface{}); ok {
		if status, ok := workflowInfo["status"].(string); ok {
			return status
		}
	}

	return ""
}

// extractResultFromJSON tries to extract the workflow result from JSON output
func (p *TemporalChecker) extractResultFromJSON(output string) string {
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(output), &result); err != nil {
		return "Result available in Temporal UI"
	}

	// Look for result in various possible locations
	if workflowInfo, ok := result["workflowExecutionInfo"].(map[string]interface{}); ok {
		// Check if there's a result field
		if resultData, ok := workflowInfo["result"].(string); ok && resultData != "" {
			return resultData
		}
	}

	// If no result found in JSON, return a helpful message
	return "Workflow completed successfully - check Temporal UI for detailed result"
}

// extractErrorFromJSON tries to extract the error message from JSON output
func (p *TemporalChecker) extractErrorFromJSON(output string) string {
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(output), &result); err != nil {
		return "Workflow failed - check Temporal UI for details"
	}

	// Look for error in various possible locations
	if workflowInfo, ok := result["workflowExecutionInfo"].(map[string]interface{}); ok {
		// Check if there's a failure field
		if failure, ok := workflowInfo["failure"].(string); ok && failure != "" {
			return failure
		}
	}

	return "Workflow failed - check Temporal UI for details"
}

// extractResultFromOutput tries to extract the workflow result from the describe output (text format)
func (p *TemporalChecker) extractResultFromOutput(output string) string {
	lines := strings.Split(output, "\n")

	for i, line := range lines {
		if strings.Contains(line, "Result:") {
			// Get the result line and potentially the next few lines
			result := strings.TrimSpace(strings.TrimPrefix(line, "Result:"))
			if result != "" {
				return result
			}

			// If result is empty, check next lines for multi-line result
			for j := i + 1; j < len(lines) && j < i+5; j++ {
				nextLine := strings.TrimSpace(lines[j])
				if nextLine != "" && !strings.Contains(nextLine, ":") {
					return nextLine
				}
			}
		}
	}

	return "Result available in Temporal UI"
}

// extractErrorFromOutput tries to extract the error message from the describe output (text format)
func (p *TemporalChecker) extractErrorFromOutput(output string) string {
	lines := strings.Split(output, "\n")

	for i, line := range lines {
		if strings.Contains(line, "Failure:") {
			// Get the error line and potentially the next few lines
			error := strings.TrimSpace(strings.TrimPrefix(line, "Failure:"))
			if error != "" {
				return error
			}

			// If error is empty, check next lines for multi-line error
			for j := i + 1; j < len(lines) && j < i+5; j++ {
				nextLine := strings.TrimSpace(lines[j])
				if nextLine != "" && !strings.Contains(nextLine, ":") {
					return nextLine
				}
			}
		}
	}

	return "Workflow failed - check Temporal UI for details"
}

// generateTemporalUIURL creates a URL to view the workflow execution in the Temporal web UI
func (p *TemporalChecker) generateTemporalUIURL(serverURL, namespace, workflowID, runID string) string {
	// Extract the base URL and port from the server URL
	baseURL := serverURL

	// If the server URL contains a port, try to replace it with the UI port (8233)
	if strings.Contains(baseURL, ":") {
		// Replace any port with 8233 (Temporal UI port)
		if colonIndex := strings.LastIndex(baseURL, ":"); colonIndex != -1 {
			baseURL = baseURL[:colonIndex] + ":8233"
		}
	} else {
		// If no port specified, assume localhost and add UI port
		if strings.HasPrefix(baseURL, "http://") {
			baseURL = strings.TrimSuffix(baseURL, "/") + ":8233"
		} else {
			baseURL = "http://localhost:8233"
		}
	}

	// Construct the workflow execution URL
	// Format: http://localhost:8233/namespaces/{namespace}/workflows/{workflowId}/runs/{runId}
	if namespace != "" && runID != "" {
		return fmt.Sprintf("%s/namespaces/%s/workflows/%s/runs/%s", baseURL, namespace, workflowID, runID)
	} else if namespace != "" {
		return fmt.Sprintf("%s/namespaces/%s/workflows/%s", baseURL, namespace, workflowID)
	} else {
		return fmt.Sprintf("%s/workflows/%s", baseURL, workflowID)
	}
}

var _ integrations.IntegrationPlugin = (*TemporalChecker)(nil)
