package n8nchecker

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/models"
)

const (
	PluginID_N8NChecker               = "n8n_checker_v1"
	PluginName_N8NChecker             = "n8n Workflow Execution Checker"
	CheckTypeKey_N8NWorkflowExecution = "n8n_workflow_execution"
)

type N8NChecker struct{}

func New() *N8NChecker {
	return &N8NChecker{}
}

func (p *N8NChecker) ID() string {
	return PluginID_N8NChecker
}

func (p *N8NChecker) Name() string {
	return PluginName_N8NChecker
}

func (p *N8NChecker) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		CheckTypeKey_N8NWorkflowExecution: {
			Label:       "n8n Workflow Execution",
			TargetType:  "connected_system",
			TargetLabel: "n8n Instance",
			Parameters: []models.ParameterDefinition{
				{
					Name:     "webhookUrl",
					Label:    "Webhook URL",
					Type:     "text",
					Required: true,
					HelpText: "The webhook URL for the n8n workflow to execute.",
				},
				{
					Name:     "inputData",
					Label:    "Input Data (JSON)",
					Type:     "textarea",
					Required: false,
					HelpText: "Optional JSON input data to pass to the workflow via webhook.",
				},
			},
		},
	}
}

type N8NSystemConfig struct {
	BaseURL    string `json:"baseUrl"`
	APIKey     string `json:"apiKey"`
	WebhookURL string `json:"webhookUrl"` // Webhook URL for triggering workflows
}

type n8nWorkflow struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Active    bool   `json:"active"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
	// Additional fields that might be present
	VersionId    string                 `json:"versionId,omitempty"`
	Meta         map[string]interface{} `json:"meta,omitempty"`
	Nodes        []interface{}          `json:"nodes,omitempty"`
	Connections  map[string]interface{} `json:"connections,omitempty"`
	Settings     map[string]interface{} `json:"settings,omitempty"`
	StaticData   map[string]interface{} `json:"staticData,omitempty"`
	Tags         []interface{}          `json:"tags,omitempty"`
	TriggerCount int                    `json:"triggerCount,omitempty"`
}

type n8nWorkflowExecutionRequest struct {
	WorkflowID string      `json:"workflowId"`
	InputData  interface{} `json:"inputData,omitempty"`
}

type n8nWorkflowExecutionResponse struct {
	ID        string      `json:"id"`
	Status    string      `json:"status"`
	Data      interface{} `json:"data"`
	Error     string      `json:"error,omitempty"`
	StartTime string      `json:"startTime"`
	EndTime   string      `json:"endTime"`
}

func (p *N8NChecker) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	if checkTypeKey != CheckTypeKey_N8NWorkflowExecution {
		return common.ExecutionResult{Status: common.StatusError, Output: "Unsupported check type"}, fmt.Errorf("unsupported check type: %s", checkTypeKey)
	}

	var sysConfig N8NSystemConfig
	if err := json.Unmarshal(ctx.ConnectedSystem.Configuration, &sysConfig); err != nil {
		return common.ExecutionResult{Status: common.StatusError, Output: "Failed to parse n8n system configuration"}, fmt.Errorf("unmarshal n8n config: %w", err)
	}

	if sysConfig.BaseURL == "" {
		return common.ExecutionResult{Status: common.StatusError, Output: "n8n BaseURL is required"}, fmt.Errorf("missing n8n base URL")
	}

	webhookUrl, ok := ctx.TaskInstance.Parameters["webhookUrl"].(string)
	if !ok || webhookUrl == "" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Missing webhookUrl parameter"}, fmt.Errorf("missing webhookUrl parameter")
	}

	// Get input data if provided
	var inputData interface{}
	if inputDataStr, ok := ctx.TaskInstance.Parameters["inputData"].(string); ok && inputDataStr != "" {
		if err := json.Unmarshal([]byte(inputDataStr), &inputData); err != nil {
			return common.ExecutionResult{Status: common.StatusError, Output: "Invalid inputData JSON"}, fmt.Errorf("invalid input data JSON: %w", err)
		}
	}

	// Execute the workflow via webhook
	executionResult, err := p.executeN8NWebhook(webhookUrl, inputData)
	if err != nil {
		return common.ExecutionResult{Status: common.StatusFailed, Output: err.Error()}, err
	}

	// Determine status based on n8n execution result
	status := common.StatusSuccess
	if executionResult.Status == "error" {
		status = common.StatusFailed
	}

	result := map[string]interface{}{
		"webhookUrl":  webhookUrl,
		"executionId": executionResult.ID,
		"status":      executionResult.Status,
		"data":        executionResult.Data,
		"startTime":   executionResult.StartTime,
		"endTime":     executionResult.EndTime,
		"n8nInstance": sysConfig.BaseURL,
	}

	if executionResult.Error != "" {
		result["error"] = executionResult.Error
	}

	jsonOut, _ := json.Marshal(result)
	return common.ExecutionResult{Status: status, Output: string(jsonOut)}, nil
}

func (p *N8NChecker) executeN8NWebhook(webhookUrl string, inputData interface{}) (*n8nWorkflowExecutionResponse, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	fmt.Printf("Executing n8n webhook: %s\n", webhookUrl)

	// Prepare the webhook payload
	var requestBody []byte
	var err error

	if inputData != nil {
		requestBody, err = json.Marshal(inputData)
		if err != nil {
			return nil, fmt.Errorf("marshal webhook payload: %w", err)
		}
	} else {
		// Send empty JSON object if no input data
		requestBody = []byte("{}")
	}

	// Create HTTP request to the webhook URL
	req, err := http.NewRequest("POST", webhookUrl, bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, fmt.Errorf("create webhook request: %w", err)
	}

	// Add headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "compliance-automation/1.0")

	// Execute the webhook
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute webhook request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read webhook response body: %w", err)
	}

	fmt.Printf("Webhook response: Status=%d, Body=%s\n", resp.StatusCode, string(body))

	// Accept 200, 201, 202 as success status codes
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		// Try to parse the response if it's JSON
		var executionResp n8nWorkflowExecutionResponse
		if err := json.Unmarshal(body, &executionResp); err == nil {
			fmt.Printf("Successfully parsed webhook response\n")
			return &executionResp, nil
		} else {
			fmt.Printf("Could not parse webhook response as JSON, treating as success\n")
			// If we can't parse the response but got a success status, consider it successful
			return &n8nWorkflowExecutionResponse{
				ID:     webhookUrl,
				Status: "success",
				Data:   string(body),
			}, nil
		}
	} else {
		return nil, fmt.Errorf("webhook failed: %s - %s", resp.Status, string(body))
	}
}

// GetWorkflows fetches all workflows from n8n instance
func (p *N8NChecker) GetWorkflows(config N8NSystemConfig) ([]n8nWorkflow, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	// Try different possible n8n API endpoints
	endpoints := []string{
		"/api/v1/workflows",
		"/api/workflows",
		"/rest/workflows",
	}

	var workflows []n8nWorkflow
	var lastError error

	for _, endpoint := range endpoints {
		url := fmt.Sprintf("%s%s", config.BaseURL, endpoint)
		fmt.Printf("Trying n8n endpoint: %s\n", url)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			lastError = fmt.Errorf("create request for %s: %w", endpoint, err)
			continue
		}

		// Try different authentication methods
		if config.APIKey != "" {
			// Try different possible header names for API key
			req.Header.Set("X-N8N-API-KEY", config.APIKey)
			req.Header.Set("Authorization", "Bearer "+config.APIKey)
			req.Header.Set("X-API-Key", config.APIKey)
		}

		// Add basic headers
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", "compliance-automation/1.0")

		resp, err := client.Do(req)
		if err != nil {
			lastError = fmt.Errorf("execute request for %s: %w", endpoint, err)
			continue
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			lastError = fmt.Errorf("read response body for %s: %w", endpoint, err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			fmt.Printf("Endpoint %s returned status %d: %s\n", endpoint, resp.StatusCode, string(body))
			lastError = fmt.Errorf("n8n API error for %s: %s - %s", endpoint, resp.Status, string(body))
			continue
		}

		fmt.Printf("Successful response from %s: %s\n", endpoint, string(body))

		// First, try to parse as generic map to understand structure
		var rawResponse map[string]interface{}
		if err := json.Unmarshal(body, &rawResponse); err == nil {
			fmt.Printf("Raw response structure: %+v\n", rawResponse)
			// Check what keys are available
			for key := range rawResponse {
				fmt.Printf("Available key: %s\n", key)
			}
		}

		// Try to parse as direct array first
		if err := json.Unmarshal(body, &workflows); err == nil {
			fmt.Printf("Successfully parsed %d workflows as direct array\n", len(workflows))
			return workflows, nil
		} else {
			fmt.Printf("Failed to parse as direct array: %v\n", err)
		}

		// If that fails, try parsing as object with data field
		var response struct {
			Data []n8nWorkflow `json:"data"`
		}
		if err := json.Unmarshal(body, &response); err == nil {
			workflows = response.Data
			fmt.Printf("Successfully parsed %d workflows from data field\n", len(workflows))
			return workflows, nil
		} else {
			fmt.Printf("Failed to parse as data field: %v\n", err)
		}

		// Try parsing as object with workflows field
		var response2 struct {
			Workflows []n8nWorkflow `json:"workflows"`
		}
		if err := json.Unmarshal(body, &response2); err == nil {
			workflows = response2.Workflows
			fmt.Printf("Successfully parsed %d workflows from workflows field\n", len(workflows))
			return workflows, nil
		} else {
			fmt.Printf("Failed to parse as workflows field: %v\n", err)
		}

		lastError = fmt.Errorf("could not parse response from %s as any known format", endpoint)
	}

	return nil, fmt.Errorf("failed to fetch workflows from any endpoint: %v", lastError)
}

var _ integrations.IntegrationPlugin = (*N8NChecker)(nil)
