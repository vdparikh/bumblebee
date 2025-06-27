package azuresqlchecker

import (
	"encoding/json"
	"fmt"

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/models"
)

type AzureSQLChecker struct{}

func New() *AzureSQLChecker {
	return &AzureSQLChecker{}
}

func (p *AzureSQLChecker) ID() string {
	return "azure_sql_checker_v1"
}

func (p *AzureSQLChecker) Name() string {
	return "Azure SQL Encryption Checker"
}

func (p *AzureSQLChecker) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	return map[string]models.CheckTypeConfiguration{
		"azure_sql_encryption": {
			Label:       "Azure SQL Encryption",
			TargetType:  "database",
			TargetLabel: "Azure SQL Database",
			Parameters: []models.ParameterDefinition{
				{
					Name:     "server",
					Label:    "Server Name",
					Type:     "text",
					Required: true,
					HelpText: "The Azure SQL server name.",
				},
				{
					Name:     "database",
					Label:    "Database Name",
					Type:     "text",
					Required: true,
					HelpText: "The Azure SQL database name.",
				},
			},
		},
	}
}

func (p *AzureSQLChecker) ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error) {
	if checkTypeKey != "azure_sql_encryption" {
		return common.ExecutionResult{Status: common.StatusError, Output: "Unsupported check type"}, fmt.Errorf("unsupported check type: %s", checkTypeKey)
	}
	server, _ := ctx.TaskInstance.Parameters["server"].(string)
	database, _ := ctx.TaskInstance.Parameters["database"].(string)
	// TODO: Implement real Azure API call to check encryption status
	// For now, mock result
	result := map[string]interface{}{
		"server":    server,
		"database":  database,
		"encrypted": true, // Assume encrypted for demo
		"note":      "This is a mock result. Implement real Azure API call for production.",
	}
	jsonOut, _ := json.Marshal(result)
	return common.ExecutionResult{Status: common.StatusSuccess, Output: string(jsonOut)}, nil
}

var _ integrations.IntegrationPlugin = (*AzureSQLChecker)(nil)
