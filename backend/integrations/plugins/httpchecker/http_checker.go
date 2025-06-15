// File: integrations/httpchecker/http_checker.go
package httpchecker

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/vdparikh/compliance-automation/backend/integrations" // Adjust import path
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/models"
)

type Plugin struct{}

// New creates a new instance of the HTTPChecker plugin.
func New() integrations.IntegrationPlugin {
	return &Plugin{}
}

func (p *Plugin) ID() string {
	return "core_http_checker" // Unique ID for this plugin
}

func (p *Plugin) Name() string {
	return "HTTP Health Check Integration"
}

func (p *Plugin) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		"http_get_check": { // This key must match what the frontend expects
			Label: "HTTP GET Check",
			Parameters: []models.ParameterDefinition{
				{Name: "apiPath", Label: "API Path", Type: "text", Required: true, Placeholder: "/health", HelpText: "The specific path for the GET request (e.g., /api/status)."},
				{Name: "expected_status_code", Label: "Expected Status Code", Type: "number", Placeholder: "200", HelpText: "The HTTP status code expected for a successful check. Defaults to 200."},
			},
			TargetType:     "connected_system",
			TargetLabel:    "Target Web Service",
			TargetHelpText: "Select the Connected System representing the web service to check.",
		},
		// Add more HTTP-related check types here if needed
	}
}

// Define a struct to parse the BaseURL from ConnectedSystem.Configuration
type httpCheckerSystemConfig struct {
	BaseURL string `json:"baseUrl"` // Ensure this matches the key in your JSON config
}

func (p *Plugin) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	if checkTypeKey != "http_get_check" {
		return common.ExecutionResult{Status: common.StatusFailed}, fmt.Errorf("httpchecker plugin does not support check type: %s", checkTypeKey)
	}

	if ctx.ConnectedSystem == nil {
		return common.ExecutionResult{Status: common.StatusFailed, Output: "Target connected system is required for http_get_check"}, fmt.Errorf("target connected system is required for http_get_check")
	}

	var sysConfig httpCheckerSystemConfig
	if err := json.Unmarshal(ctx.ConnectedSystem.Configuration, &sysConfig); err != nil {
		return common.ExecutionResult{Status: common.StatusFailed, Output: fmt.Sprintf("Error parsing connected system configuration: %v", err)},
			fmt.Errorf("error parsing connected system configuration for %s: %w", ctx.ConnectedSystem.ID, err)
	}

	apiPath, ok := ctx.TaskInstance.Parameters["apiPath"].(string)
	if !ok || apiPath == "" {
		return common.ExecutionResult{Status: common.StatusFailed}, fmt.Errorf("apiPath parameter is missing or invalid for http_get_check")
	}

	expectedStatusCode := 200                                                          // Default
	if code, ok := ctx.TaskInstance.Parameters["expected_status_code"].(float64); ok { // JSON numbers are float64
		expectedStatusCode = int(code)
	}
	if sysConfig.BaseURL == "" {
		return common.ExecutionResult{Status: common.StatusFailed, Output: "BaseURL is missing in connected system configuration"},
			fmt.Errorf("BaseURL is missing in connected system configuration for %s", ctx.ConnectedSystem.ID)
	}
	targetURL := strings.TrimSuffix(sysConfig.BaseURL, "/") + "/" + strings.TrimPrefix(apiPath, "/")

	resp, err := http.Get(targetURL)
	if err != nil {
		return common.ExecutionResult{Status: common.StatusFailed, Output: fmt.Sprintf("Error making GET request to %s: %v", targetURL, err)}, err
	}
	defer resp.Body.Close()

	message := fmt.Sprintf("Checked URL: %s. Received Status: %s. Expected Status: %d.", targetURL, resp.Status, expectedStatusCode)
	resultStatus := common.StatusFailed
	if resp.StatusCode == expectedStatusCode {
		resultStatus = common.StatusCompleted
		message += " Check " + common.StatusCompleted + "."
	} else {
		message += " Check " + common.StatusFailed + "."
	}

	// Prepare output as a JSON string
	outputData := map[string]interface{}{
		"message":              message,
		"target_url":           targetURL,
		"received_status_code": resp.StatusCode,
		"expected_status_code": expectedStatusCode,
	}
	outputJSON, err := json.Marshal(outputData)
	if err != nil {
		// Fallback if JSON marshaling fails, though unlikely for this simple map
		return common.ExecutionResult{Status: common.StatusError, Output: fmt.Sprintf("{\"error\":\"failed to marshal output: %v\", \"raw_message\":\"%s\"}", err, message)}, fmt.Errorf("failed to marshal output: %w", err)
	}

	return common.ExecutionResult{
		Status: resultStatus,
		Output: string(outputJSON),
	}, nil
}
