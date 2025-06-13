package executor

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"
	"time"
)

type HTTPGetCheckExecutor struct{}

type httpGetSystemConfig struct {
	BaseURL string `json:"baseUrl"`
}

type httpGetTaskParams struct {
	APIPath            string `json:"apiPath"`
	ExpectedStatusCode *int   `json:"expected_status_code"`
}

func (e *HTTPGetCheckExecutor) ValidateParameters(taskParamsMap map[string]interface{}, systemConfigJSON json.RawMessage) (isValid bool, expectedParamsDesc string, err error) {
	expectedDesc := "For http_get_check: ConnectedSystem.Configuration expects {'baseUrl': 'string'}. TaskInstance.Parameters expects {'apiPath': 'string', 'expected_status_code': 'number (optional, defaults to 200)'}."

	if systemConfigJSON == nil {
		return false, expectedDesc, fmt.Errorf("connected system configuration is required")
	}
	var sysConf httpGetSystemConfig
	if err := json.Unmarshal(systemConfigJSON, &sysConf); err != nil {
		return false, expectedDesc, fmt.Errorf("failed to parse connected system configuration: %w. %s", err, expectedDesc)
	}
	if sysConf.BaseURL == "" {
		return false, expectedDesc, fmt.Errorf("baseUrl is missing in connected system configuration. %s", expectedDesc)
	}

	if taskParamsMap == nil {
		return false, expectedDesc, fmt.Errorf("task parameters are required (at least apiPath). %s", expectedDesc)
	}
	taskParamsBytes, err := json.Marshal(taskParamsMap)
	if err != nil {
		return false, expectedDesc, fmt.Errorf("failed to marshal task parameters for validation: %w", err)
	}
	var taskP httpGetTaskParams
	if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
		return false, expectedDesc, fmt.Errorf("failed to parse task parameters: %w. %s", err, expectedDesc)
	}
	if taskP.APIPath == "" {
		return false, expectedDesc, fmt.Errorf("task parameter 'apiPath' is missing or empty. %s", expectedDesc)
	}

	return true, expectedDesc, nil
}

func (e *HTTPGetCheckExecutor) Execute(checkCtx CheckContext) (ExecutionResult, error) {
	var output strings.Builder
	resultStatus := StatusFailed // Default to Failed

	taskInstance := checkCtx.TaskInstance
	connectedSystem := checkCtx.ConnectedSystem

	if connectedSystem == nil {
		output.WriteString("Error: Connected System is required for http_get_check but was not found or provided.\n")
		return ExecutionResult{Status: StatusError, Output: output.String()}, fmt.Errorf("connected system is nil or not found for target ID %s", *taskInstance.Target)
	}

	var sysConfig httpGetSystemConfig
	if err := json.Unmarshal(connectedSystem.Configuration, &sysConfig); err != nil {
		output.WriteString(fmt.Sprintf("Error parsing configuration for Connected System %s (%s): %v\n", connectedSystem.Name, connectedSystem.ID, err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}

	taskParamsBytes, _ := json.Marshal(taskInstance.Parameters)
	var taskP httpGetTaskParams
	_ = json.Unmarshal(taskParamsBytes, &taskP)

	finalURL := strings.TrimSuffix(sysConfig.BaseURL, "/") + "/" + strings.TrimPrefix(taskP.APIPath, "/")
	output.WriteString(fmt.Sprintf("Attempting HTTP GET request to: %s (via Connected System: %s)\n", finalURL, connectedSystem.Name))

	httpCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(httpCtx, "GET", finalURL, nil)
	if err != nil {
		output.WriteString(fmt.Sprintf("Error creating request: %v\n", err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		output.WriteString(fmt.Sprintf("Error performing GET request: %v\n", err))
		if httpCtx.Err() == context.DeadlineExceeded {
			output.WriteString("Request timed out.\n")
		}
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}
	defer resp.Body.Close()

	output.WriteString(fmt.Sprintf("Response Status: %s, Code: %d\n", resp.Status, resp.StatusCode))
	bodyBytes, _ := ioutil.ReadAll(resp.Body)
	bodySnippet := string(bodyBytes)
	if len(bodySnippet) > 500 {
		bodySnippet = bodySnippet[:500] + "...\n(body truncated)"
	}
	output.WriteString(fmt.Sprintf("Response Body Snippet:\n%s\n", bodySnippet))

	expectedStatusCode := 200
	if taskP.ExpectedStatusCode != nil {
		expectedStatusCode = *taskP.ExpectedStatusCode
	}

	if resp.StatusCode == expectedStatusCode {
		resultStatus = StatusSuccess
		output.WriteString(fmt.Sprintf("Check PASSED: Received expected status code %d.\n", expectedStatusCode))
	} else {
		output.WriteString(fmt.Sprintf("Check FAILED: Expected status code %d, but received %d.\n", expectedStatusCode, resp.StatusCode))
	}

	return ExecutionResult{Status: resultStatus, Output: output.String()}, nil
}

var _ CheckExecutor = (*HTTPGetCheckExecutor)(nil)
