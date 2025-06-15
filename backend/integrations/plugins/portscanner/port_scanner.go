// File: integrations/portscanner/port_scanner.go
package portscanner

import (
	"encoding/json"
	"fmt"

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/models"
)

type Plugin struct{}

// New creates a new instance of the PortScanner plugin.
func New() integrations.IntegrationPlugin {
	return &Plugin{}
}

func (p *Plugin) ID() string {
	return "core_port_scanner"
}

func (p *Plugin) Name() string {
	return "Port Scanner Integration"
}

type portScannerSystemConfig struct {
	HostAddress string `json:"hostAddress"` // e.g., "192.168.1.100" or "example.com"
}

func (p *Plugin) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		"port_scan_check": {
			Label: "Port Scan Check",
			Parameters: []models.ParameterDefinition{
				{Name: "ports", Label: "Ports (comma-separated)", Type: "text", Required: true, Placeholder: "80,443,8080", HelpText: "Comma-separated list of ports to scan."},
				{Name: "expected_status", Label: "Expected Port Status", Type: "select", Options: []string{"open", "closed"}, Required: true, HelpText: "Expected status for all listed ports (e.g., all should be open)."},
			},
			TargetType:     "connected_system",
			TargetLabel:    "Target Host for Port Scan",
			TargetHelpText: "Select the Connected System. Its configuration should contain 'hostAddress' (e.g. {\"hostAddress\": \"server.example.com\"}).",
		},
	}
}

func (p *Plugin) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	// TODO: Implement actual port scanning logic.
	// 1. Unmarshal ctx.ConnectedSystem.Configuration into portScannerSystemConfig to get HostAddress.
	// 2. Parse ctx.TaskInstance.Parameters["ports"].
	// 3. For each port, attempt to connect to HostAddress:port.
	// 4. Compare actual status with ctx.TaskInstance.Parameters["expected_status"].

	message := fmt.Sprintf("Port scan check for type '%s' is not yet fully implemented. Ports: %v", checkTypeKey, ctx.TaskInstance.Parameters["ports"])

	// Prepare output as a JSON string
	outputData := map[string]interface{}{
		"message": message,
		"query":   ctx.TaskInstance.Parameters["query"],
	}
	outputJSON, err := json.Marshal(outputData)
	if err != nil {
		return common.ExecutionResult{Status: common.StatusError, Output: fmt.Sprintf("{\"error\":\"failed to marshal output: %v\", \"raw_message\":\"%s\"}", err, message)}, fmt.Errorf("failed to marshal output: %w", err)
	}

	return common.ExecutionResult{
		Status: common.StatusPending,
		Output: string(outputJSON),
	}, fmt.Errorf("port_scan_check not implemented")
}
