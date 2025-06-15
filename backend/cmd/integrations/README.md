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