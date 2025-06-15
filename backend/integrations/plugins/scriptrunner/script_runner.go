// File: integrations/scriptrunner/script_runner.go
package scriptrunner

import (
	"encoding/json"
	"fmt"

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/models"
)

type Plugin struct{}

// New creates a new instance of the ScriptRunner plugin.
func New() integrations.IntegrationPlugin {
	return &Plugin{}
}

func (p *Plugin) ID() string {
	return "core_script_runner"
}

func (p *Plugin) Name() string {
	return "Remote Script Execution Integration"
}

func (p *Plugin) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		"script_run_check": {
			Label: "Script Run Check",
			Parameters: []models.ParameterDefinition{
				{Name: "script_path", Label: "Script Path on Target", Type: "text", Required: true, Placeholder: "/opt/scripts/health_check.sh", HelpText: "Absolute path to the script on the execution host."},
				{Name: "script_args", Label: "Script Arguments (JSON Array)", Type: "textarea", Placeholder: `["arg1", "value for arg2"]`, HelpText: `Optional. Arguments as a JSON array of strings (e.g., ["--verbose", "-f", "/tmp/data.txt"]).`},
				{Name: "expected_exit_code", Label: "Expected Exit Code", Type: "number", Placeholder: "0", HelpText: "Optional. The exit code expected for a successful script run. Defaults to 0."},
			},
			TargetType:     "connected_system",
			TargetLabel:    "Execution Host",
			TargetHelpText: "Select the Connected System representing the host where the script will be executed.",
		},
	}
}

func (p *Plugin) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	// TODO: Implement actual script execution logic.
	// This would involve connecting to the target host (ctx.ConnectedSystem)
	// and running the script specified in ctx.TaskInstance.Parameters.
	// For now, it's a placeholder.

	message := fmt.Sprintf("Script run check for type '%s' is not yet fully implemented. Parameters: %v", checkTypeKey, ctx.TaskInstance.Parameters)

	outputData := map[string]interface{}{
		"message":    message,
		"parameters": ctx.TaskInstance.Parameters,
	}
	outputJSON, err := json.Marshal(outputData)
	if err != nil {
		return common.ExecutionResult{Status: common.StatusError, Output: fmt.Sprintf("{\"error\":\"failed to marshal output: %v\", \"raw_message\":\"%s\"}", err, message)}, fmt.Errorf("failed to marshal output: %w", err)
	}

	return common.ExecutionResult{
		Status: common.StatusPending, // Or common.StatusFailed with an error
		Output: string(outputJSON),
	}, fmt.Errorf("script_run_check not implemented")
}
