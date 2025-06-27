package pingchecker

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/models"
)

type PingChecker struct{}

func New() *PingChecker {
	return &PingChecker{}
}

func (p *PingChecker) ID() string {
	return "ping_checker_v1"
}

func (p *PingChecker) Name() string {
	return "Ping Host Checker"
}

func (p *PingChecker) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		"ping_host": {
			Label:       "Ping Host",
			TargetType:  "host",
			TargetLabel: "Host/IP Address",
			Parameters: []models.ParameterDefinition{
				{
					Name:     "host",
					Label:    "Host or IP",
					Type:     "text",
					Required: true,
					HelpText: "The hostname or IP address to ping.",
				},
			},
		},
	}
}

func (p *PingChecker) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	if checkTypeKey != "ping_host" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Unsupported check type"}, fmt.Errorf("unsupported check type: %s", checkTypeKey)
	}
	host, ok := ctx.TaskInstance.Parameters["host"].(string)
	if !ok || host == "" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Missing host parameter"}, fmt.Errorf("missing host parameter")
	}
	// Use system ping command for cross-platform support
	cmd := exec.Command("ping", "-c", "1", "-w", "3", host)
	start := time.Now()
	output, err := cmd.CombinedOutput()
	latency := time.Since(start)
	result := map[string]interface{}{
		"host":    host,
		"latency": latency.String(),
		"output":  string(output),
	}
	status := common.StatusSuccess
	if err != nil || !strings.Contains(string(output), "1 packets transmitted, 1 received") {
		status = common.StatusFailed
		result["error"] = err.Error()
	}
	jsonOut, _ := json.Marshal(result)
	return common.ExecutionResult{Status: status, Output: string(jsonOut)}, nil
}

var _ integrations.IntegrationPlugin = (*PingChecker)(nil)
