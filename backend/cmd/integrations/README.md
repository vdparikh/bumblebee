# Adding New Integration Plugins

This document outlines the process for adding new integration plugins to the compliance automation system. Plugins allow for extending the system's capabilities to perform various automated checks against different target systems.

## 1. Understand the Core Concepts

*   **`IntegrationPlugin` Interface (`integrations/plugin.go`):** This is the core interface that all plugins must implement. It defines the contract for how a plugin interacts with the system.
    *   `ID() string`: Returns a unique machine-readable identifier for the plugin (e.g., "my_custom_checker").
    *   `Name() string`: Returns a human-readable name for the plugin (e.g., "My Custom Checking Service").
    *   `GetCheckTypeConfigurations() map[string]CheckTypeConfiguration`: Returns a map of check types offered by this plugin. The key is a unique string identifying the check type (e.g., "my_custom_check_type_1"), and the value is its configuration.
    *   `ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error)`: This is where the actual logic for performing a check resides.
*   **`CheckTypeConfiguration` (`integrations/plugin.go`):** Defines the metadata for a specific check type that a plugin can perform. This includes:
    *   `Label`: Human-readable name for the check type shown in the UI.
    *   `Parameters`: A slice of `ParameterDefinition` structs detailing the inputs required for this check type.
    *   `TargetType`: Specifies if the check targets a "connected_system" or "none".
    *   `TargetLabel`, `TargetHelpText`: UI hints for selecting the target.
*   **`ParameterDefinition` (`integrations/plugin.go`):** Describes a single input parameter for a check type (name, label, type, required, placeholder, help text, options for select).
*   **`common.CheckContext` (`integrations/common/types.go`):** Passed to `ExecuteCheck`. Contains:
    *   `TaskInstance`: Details of the specific task being run, including its parameters.
    *   `ConnectedSystem`: Information about the target system (if `TargetType` is "connected_system"), including its configuration (e.g., `BaseURL`).
    *   `Store`: Access to the database (use judiciously).
    *   `StdContext`: Standard Go context for cancellation/deadlines.
*   **`common.ExecutionResult` (`integrations/common/types.go`):** Returned by `ExecuteCheck`. Contains:
    *   `Status`: The outcome of the check (e.g., `common.StatusCompleted`, `common.StatusFailed`).
    *   `Output`: A string (often JSON) containing detailed results or messages from the check.
*   **Plugin Registration (`cmd/integrations/main.go`):** New plugins are instantiated and registered with the `PluginRegistryService`.

## 2. Steps to Add a New Plugin

### Step 2.1: Create the Plugin Package

Create a new directory for your plugin under the `integrations` directory (e.g., `integrations/mychecker/`).

### Step 2.2: Implement the Plugin

Inside your new package (e.g., `integrations/mychecker/my_checker.go`), define a struct and implement the `integrations.IntegrationPlugin` interface.

```go
// File: integrations/mychecker/my_checker.go
package mychecker

import (
	"fmt"
	// "encoding/json" // If you need to parse ConnectedSystem.Configuration

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
)

type Plugin struct {
	// Any internal state or configuration for your plugin
}

// New creates a new instance of your plugin.
func New() integrations.IntegrationPlugin {
	return &Plugin{}
}

func (p *Plugin) ID() string {
	return "my_unique_plugin_id"
}

func (p *Plugin) Name() string {
	return "My Awesome Checker Plugin"
}

func (p *Plugin) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		"my_check_type_alpha": { // This key is used in TaskForm.js and TaskExecutionService
			Label: "My Alpha Check",
			Parameters: []integrations.ParameterDefinition{
				{Name: "input_param1", Label: "Input Parameter One", Type: "text", Required: true, HelpText: "Description of param1."},
				{Name: "input_param2", Label: "Optional Number Param", Type: "number", Required: false, Placeholder: "42"},
			},
			TargetType:  "connected_system", // Or "none"
			TargetLabel: "Target System for Alpha Check",
		},
	}
}

func (p *Plugin) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	if checkTypeKey == "my_check_type_alpha" {
		// 1. Access parameters:
		// param1, ok := ctx.TaskInstance.Parameters["input_param1"].(string)
		// if !ok { return common.ExecutionResult{Status: common.StatusFailed, Output: "Missing param1"}, fmt.Errorf("param1 missing") }

		// 2. Access connected system config (if TargetType is "connected_system"):
		// if ctx.ConnectedSystem == nil { /* handle error */ }
		// var sysConfig struct { MyURL string `json:"myUrl"` }
		// if err := json.Unmarshal(ctx.ConnectedSystem.Configuration, &sysConfig); err != nil { /* handle error */ }

		// 3. Perform your check logic...
		outputMessage := fmt.Sprintf("Executed My Alpha Check with params: %v", ctx.TaskInstance.Parameters)
		
		// 4. Return result
		return common.ExecutionResult{
			Status: common.StatusCompleted, // Or common.StatusFailed, common.StatusError
			Output: outputMessage,
		}, nil
	}
	return common.ExecutionResult{Status: common.StatusFailed}, fmt.Errorf("unsupported check type '%s' for plugin '%s'", checkTypeKey, p.ID())
}
```

### Step 2.3: Register the Plugin

Open `cmd/integrations/main.go` and register your new plugin with the `PluginRegistryService`:

```go
package main

import (
	// ... other imports
	"github.com/vdparikh/compliance-automation/backend/integrations/mychecker" // 1. Import your new plugin package
	// ... other imports
)

func main() {
	// ... (setup code for context, db, store, queue) ...

	pluginRegistry := services.NewPluginRegistryService()

	// ... (registration of other plugins like httpPlugin, scriptPlugin) ...

	// 2. Instantiate and register your plugin:
	myPlugin := mychecker.New()
	if err := pluginRegistry.RegisterPlugin(myPlugin); err != nil {
		log.Fatalf("Failed to register My Checker plugin: %v", err)
	}

	// ... (rest of the main function) ...
}
```

## 3. Test

1.  Rebuild and run the `integrations` service.
2.  If your frontend (`TaskForm.js`) fetches check type configurations dynamically, your new check type should appear in the UI when creating/editing a task.
3.  Create a task that uses your new check type, configure its parameters, and trigger its execution.
4.  Verify that the `TaskExecutionService` picks up the task and your plugin's `ExecuteCheck` method is called and produces the expected result. Check the logs of the `integrations` service.

That's it! Your new plugin should now be integrated into the system.

# Integration Plugins

This directory contains various integration plugins for the compliance automation system.

## Available Plugins

### Temporal Workflow Execution Checker

The Temporal plugin allows you to execute Temporal workflows as part of compliance tasks.

#### Configuration

To use the Temporal plugin, you need to create a connected system with the following configuration:

```json
{
  "systemType": "temporal",
  "name": "My Temporal Instance",
  "configuration": {
    "serverUrl": "http://localhost:8080",
    "namespace": "default"
  }
}
```

**Note**: The default Temporal port 7233 is for gRPC communication. The REST API is typically available on port 8080. If you're using a different setup, adjust the serverUrl accordingly.

#### Features

- **Workflow Execution**: Executes Temporal workflows via their REST API
- **Input Data Support**: Passes optional JSON data to workflows
- **Result Integration**: Workflow execution results are captured and stored as task evidence

#### Usage

1. Create a Temporal connected system in the compliance automation system with your Temporal server details
2. In Temporal, create a workflow with the desired business logic
3. When creating a task:
   - Select "automated" as the check type
   - Select your Temporal system as the target (this automatically sets the check type to "Temporal Workflow Execution")
   - Enter the workflow ID, workflow type, and task queue in the parameters section
   - Optionally provide JSON input data for the workflow
   - Optionally set a timeout for workflow execution
4. The workflow execution results will be automatically captured when the task is executed

#### Check Type

- **ID**: `temporal_workflow_execution`
- **Label**: "Temporal Workflow Execution"
- **Target Type**: "connected_system" (Temporal instance)
- **Parameters**:
  - `workflowId` (required): The ID of the Temporal workflow to execute
  - `workflowType` (required): The type/name of the workflow to execute
  - `taskQueue` (required): The task queue where the workflow will be executed
  - `inputData` (optional): JSON input data to pass to the workflow
  - `timeout` (optional): Timeout in seconds for workflow execution (defaults to 300 seconds)

#### How It Works

1. **System Configuration**: The Temporal connected system contains the server URL and namespace
2. **Task Parameters**: The task contains the specific workflow details (ID, type, task queue, input data, timeout)
3. **Workflow Start**: The plugin sends a POST request to the Temporal REST API to start the workflow
4. **Execution**: Temporal executes the workflow using the provided parameters
5. **Result Capture**: The workflow start response is captured and stored as task evidence

### n8n Workflow Execution Checker

The n8n plugin allows you to execute n8n workflows via webhooks as part of compliance tasks.

#### Configuration

To use the n8n plugin, you need to create a connected system with the following configuration:

```json
{
  "systemType": "n8n",
  "name": "My n8n Instance",
  "configuration": {
    "baseUrl": "http://localhost:5678",
    "apiKey": "your-n8n-api-key"
  }
}
```

#### Features

- **Webhook Execution**: Executes n8n workflows via their webhook URLs
- **Input Data Support**: Passes optional JSON data to workflows via webhook payload
- **Result Integration**: Webhook execution results are captured and stored as task evidence

#### Usage

1. Create an n8n connected system in the compliance automation system with your n8n instance details
2. In n8n, create a workflow with a webhook trigger node
3. Copy the webhook URL from the n8n webhook trigger node
4. When creating a task:
   - Select "automated" as the check type
   - Select your n8n system as the target (this automatically sets the check type to "n8n Workflow Execution")
   - Enter the webhook URL from your n8n workflow in the parameters section
   - Optionally provide JSON input data for the workflow
5. The webhook execution results will be automatically captured when the task is executed

#### Check Type

- **ID**: `n8n_workflow_execution`
- **Label**: "n8n Workflow Execution"
- **Target Type**: "connected_system" (n8n instance)
- **Parameters**:
  - `webhookUrl` (required): The webhook URL for the n8n workflow to execute
  - `inputData` (optional): JSON input data to pass to the workflow via webhook

#### How It Works

1. **System Configuration**: The n8n connected system contains the base URL and API key for the n8n instance
2. **Task Parameters**: The task contains the specific webhook URL and optional input data
3. **Webhook Trigger**: The plugin sends a POST request to the n8n webhook URL
4. **Data Payload**: Optional JSON data is sent in the request body
5. **Workflow Execution**: n8n receives the webhook and executes the workflow
6. **Result Capture**: The webhook response is captured and stored as task evidence

### Other Plugins

- **AWS Checker**: Various AWS compliance checks
- **HTTP Checker**: HTTP endpoint availability and response checks
- **File Checker**: File existence and content checks
- **Port Scanner**: Network port availability checks
- **Script Runner**: Custom script execution
- **Database Querier**: Database query execution
- **Ping Checker**: ICMP ping checks
- **SSL Checker**: SSL certificate expiry checks
- **GCP Bucket Checker**: GCP storage bucket encryption checks
- **Azure SQL Checker**: Azure SQL database encryption checks