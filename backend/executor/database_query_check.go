package executor

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	// Import database drivers you need, e.g.:
	_ "github.com/go-sql-driver/mysql" // MySQL driver
	_ "github.com/lib/pq"              // PostgreSQL driver
)

// DatabaseQueryCheckExecutor implements the CheckExecutor interface for executing a database query.
// This executor assumes the ConnectedSystem configuration contains database connection details.
type DatabaseQueryCheckExecutor struct{}

// dbQuerySystemConfig defines the expected structure of the ConnectedSystem configuration for this check.
type dbQuerySystemConfig struct {
	DBType   string `json:"dbType"`   // e.g., "postgres", "mysql"
	Host     string `json:"host"`     // Database host
	Port     int    `json:"port"`     // Database port
	Database string `json:"database"` // Database name
	User     string `json:"user"`     // Database user
	Password string `json:"password"` // Database password
	// Add other necessary details like SSL modes, etc.
}

// dbQueryTaskParams defines the expected structure of the TaskInstance parameters for this check.
type dbQueryTaskParams struct {
	Query        string `json:"query"`         // The SQL query to execute
	ExpectedRows *int   `json:"expected_rows"` // Optional: The expected number of rows
}

// ValidateParameters checks if the provided task parameters and system configuration are valid for the DatabaseQueryCheckExecutor.
func (e *DatabaseQueryCheckExecutor) ValidateParameters(taskParamsMap map[string]interface{}, systemConfigJSON json.RawMessage) (isValid bool, expectedParamsDesc string, err error) {
	expectedDesc := "For database_query_check: ConnectedSystem.Configuration expects {'dbType': 'string', 'host': 'string', 'port': 'number', 'database': 'string', 'user': 'string', 'password': 'string'}. TaskInstance.Parameters expects {'query': 'string (required)', 'expected_rows': 'number (optional)'}."

	// Validate System Configuration
	if systemConfigJSON == nil {
		return false, expectedDesc, fmt.Errorf("connected system configuration is required")
	}
	var sysConf dbQuerySystemConfig
	if err := json.Unmarshal(systemConfigJSON, &sysConf); err != nil {
		return false, expectedDesc, fmt.Errorf("failed to parse connected system configuration: %w. %s", err, expectedDesc)
	}
	if sysConf.DBType == "" || sysConf.Host == "" || sysConf.Port <= 0 || sysConf.Database == "" || sysConf.User == "" || sysConf.Password == "" {
		return false, expectedDesc, fmt.Errorf("missing or invalid database connection details in connected system configuration. %s", expectedDesc)
	}
	// TODO: Add validation for supported DBTypes

	// Validate Task Parameters
	if taskParamsMap == nil {
		return false, expectedDesc, fmt.Errorf("task parameters are required (at least query). %s", expectedDesc)
	}
	taskParamsBytes, err := json.Marshal(taskParamsMap)
	if err != nil {
		return false, expectedDesc, fmt.Errorf("failed to marshal task parameters for validation: %w", err)
	}
	var taskP dbQueryTaskParams
	if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
		return false, expectedDesc, fmt.Errorf("failed to parse task parameters: %w. %s", err, expectedDesc)
	}
	if taskP.Query == "" {
		return false, expectedDesc, fmt.Errorf("task parameter 'query' is required and cannot be empty. %s", expectedDesc)
	}

	return true, expectedDesc, nil
}

// Execute performs the database query and checks the result.
func (e *DatabaseQueryCheckExecutor) Execute(checkCtx CheckContext) (ExecutionResult, error) {
	var output strings.Builder
	resultStatus := StatusFailed // Default to Failed

	taskInstance := checkCtx.TaskInstance
	connectedSystem := checkCtx.ConnectedSystem

	if connectedSystem == nil {
		output.WriteString("Error: Connected System is required for database_query_check but was not found or provided.\n")
		return ExecutionResult{Status: StatusError, Output: output.String()}, fmt.Errorf("connected system is nil for target ID %s", *taskInstance.Target)
	}

	var sysConfig dbQuerySystemConfig
	if err := json.Unmarshal(connectedSystem.Configuration, &sysConfig); err != nil {
		output.WriteString(fmt.Sprintf("Error parsing configuration for Connected System %s (%s): %v\n", connectedSystem.Name, connectedSystem.ID, err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}

	var taskP dbQueryTaskParams
	taskParamsBytes, err := json.Marshal(taskInstance.Parameters)
	if err != nil {
		output.WriteString(fmt.Sprintf("Error marshalling task parameters: %v\n", err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}
	if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
		output.WriteString(fmt.Sprintf("Error unmarshalling task parameters: %v\n", err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}

	output.WriteString(fmt.Sprintf("Attempting to connect to database type '%s' on host '%s:%d', database '%s' using Connected System: %s\n",
		sysConfig.DBType, sysConfig.Host, sysConfig.Port, sysConfig.Database, connectedSystem.Name))
	output.WriteString(fmt.Sprintf("Executing query: %s\n", taskP.Query))

	var dsn string
	switch strings.ToLower(sysConfig.DBType) {
	case "postgres", "postgresql":
		dsn = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", // Consider making sslmode configurable
			sysConfig.Host, sysConfig.Port, sysConfig.User, sysConfig.Password, sysConfig.Database)
	case "mysql":
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%d)/%s",
			sysConfig.User, sysConfig.Password, sysConfig.Host, sysConfig.Port, sysConfig.Database)
	default:
		output.WriteString(fmt.Sprintf("Unsupported database type: %s\n", sysConfig.DBType))
		return ExecutionResult{Status: StatusError, Output: output.String()}, fmt.Errorf("unsupported database type: %s", sysConfig.DBType)
	}

	db, err := sql.Open(strings.ToLower(sysConfig.DBType), dsn)
	if err != nil {
		output.WriteString(fmt.Sprintf("Error opening database connection: %v\n", err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second) // 30-second timeout for query
	defer cancel()

	err = db.PingContext(ctx)
	if err != nil {
		output.WriteString(fmt.Sprintf("Error pinging database: %v\n", err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}
	output.WriteString("Successfully connected to the database.\n")

	rows, err := db.QueryContext(ctx, taskP.Query)
	if err != nil {
		output.WriteString(fmt.Sprintf("Error executing query: %v\n", err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}
	defer rows.Close()

	rowCount := 0
	var resultSnippet strings.Builder
	maxSnippetRows := 5 // Max rows to include in the output snippet

	for rows.Next() {
		rowCount++
		if rowCount <= maxSnippetRows {
			// For simplicity, we're not trying to scan into specific types here,
			// as the query structure is unknown. We'll just indicate rows were found.
			// A more advanced version might try to get column names and values.
			resultSnippet.WriteString(fmt.Sprintf("Row %d: [data present]\n", rowCount))
		}
	}
	if rowCount > maxSnippetRows {
		resultSnippet.WriteString(fmt.Sprintf("... and %d more rows.\n", rowCount-maxSnippetRows))
	}
	if rowCount == 0 {
		resultSnippet.WriteString("Query returned no rows.\n")
	}

	output.WriteString(fmt.Sprintf("Query executed. Number of rows returned: %d\n", rowCount))
	output.WriteString(fmt.Sprintf("--- Query Result Snippet ---\n%s\n", resultSnippet.String()))

	if taskP.ExpectedRows != nil {
		if rowCount == *taskP.ExpectedRows {
			resultStatus = StatusSuccess
			output.WriteString(fmt.Sprintf("Check PASSED: Query returned %d rows, matching expected %d rows.\n", rowCount, *taskP.ExpectedRows))
		} else {
			output.WriteString(fmt.Sprintf("Check FAILED: Query returned %d rows, but expected %d rows.\n", rowCount, *taskP.ExpectedRows))
		}
	} else {
		// If ExpectedRows is not set, any successful query execution (no error) is considered a success.
		// You might want to change this logic based on your requirements.
		// For example, some might consider 0 rows from a SELECT a failure unless explicitly expected.
		resultStatus = StatusSuccess
		output.WriteString("Check PASSED: Query executed successfully (no specific row count was expected).\n")
	}

	if err := rows.Err(); err != nil { // Check for errors during iteration
		output.WriteString(fmt.Sprintf("Error during row iteration: %v\n", err))
		return ExecutionResult{Status: StatusError, Output: output.String()}, err
	}

	return ExecutionResult{Status: resultStatus, Output: output.String()}, nil
}
