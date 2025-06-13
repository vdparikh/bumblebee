package executor

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	// Import database drivers you need, e.g.:
	_ "github.com/go-sql-driver/mysql" // MySQL driver
	_ "github.com/lib/pq"              // PostgreSQL driver
)

type Task struct {
	ID              string           `json:"id"`
	Parameters      json.RawMessage  `json:"parameters"`
	ConnectedSystem *ConnectedSystem `json:"connected_system"`
	StartTime       time.Time        `json:"start_time"`
}

type TaskResult struct {
	TaskID        string        `json:"task_id"`
	Status        string        `json:"status"`
	Output        string        `json:"output"`
	ExecutionTime time.Duration `json:"execution_time"`
}

type ConnectedSystem struct {
	ID     string          `json:"id"`
	Config json.RawMessage `json:"config"`
}

// DatabaseQueryCheckExecutor implements the CheckExecutor interface for executing a database query.
// This executor assumes the ConnectedSystem configuration contains database connection details.
type DatabaseQueryCheckExecutor struct{}

// dbQuerySystemConfig defines the expected structure of the ConnectedSystem configuration for this check.
type dbQuerySystemConfig struct {
	DBType   string `json:"db_type"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Database string `json:"database"`
	SSLMode  string `json:"ssl_mode"`
}

// dbQueryTaskParams defines the expected structure of the TaskInstance parameters for this check.
type dbQueryTaskParams struct {
	Query string `json:"query"`
}

// ValidateParameters checks if the provided task parameters and system configuration are valid for the DatabaseQueryCheckExecutor.
func (e *DatabaseQueryCheckExecutor) ValidateParameters(taskParams map[string]interface{}, systemConfig json.RawMessage) (bool, string, error) {
	var taskP dbQueryTaskParams
	taskParamsBytes, err := json.Marshal(taskParams)
	if err != nil {
		return false, "", fmt.Errorf("error marshalling task parameters: %v", err)
	}
	if err := json.Unmarshal(taskParamsBytes, &taskP); err != nil {
		return false, "", fmt.Errorf("error unmarshalling task parameters: %v", err)
	}

	expectedDesc := "Expected parameters: {\"query\": \"string\"}"

	if taskP.Query == "" {
		return false, expectedDesc, fmt.Errorf("task parameter 'query' is required. %s", expectedDesc)
	}

	return true, expectedDesc, nil
}

// Execute performs the database query and checks the result.
func (e *DatabaseQueryCheckExecutor) Execute(task *Task) (*TaskResult, error) {
	resultStatus := StatusFailed
	var resultOutput string

	if task.ConnectedSystem == nil {
		return nil, fmt.Errorf("connected system is nil")
	}

	// Unmarshal system config
	var systemConfig dbQuerySystemConfig
	if err := json.Unmarshal(task.ConnectedSystem.Config, &systemConfig); err != nil {
		return nil, fmt.Errorf("failed to unmarshal system config: %v", err)
	}

	// Unmarshal task parameters
	var taskP dbQueryTaskParams
	if err := json.Unmarshal(task.Parameters, &taskP); err != nil {
		return nil, fmt.Errorf("failed to unmarshal task parameters: %v", err)
	}

	// Construct DSN based on database type
	var dsn string
	switch systemConfig.DBType {
	case "postgres":
		dsn = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			systemConfig.Host, systemConfig.Port, systemConfig.Username,
			systemConfig.Password, systemConfig.Database, systemConfig.SSLMode)
	case "mysql":
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%d)/%s",
			systemConfig.Username, systemConfig.Password,
			systemConfig.Host, systemConfig.Port, systemConfig.Database)
	default:
		return nil, fmt.Errorf("unsupported database type: %s", systemConfig.DBType)
	}

	// Connect to database
	db, err := sql.Open(systemConfig.DBType, dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %v", err)
	}
	defer db.Close()

	// Set connection timeout
	db.SetConnMaxLifetime(5 * time.Second)

	// Execute query
	rows, err := db.Query(taskP.Query)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %v", err)
	}
	defer rows.Close()

	// Process results
	var results []map[string]interface{}
	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %v", err)
	}

	values := make([]interface{}, len(columns))
	valuePtrs := make([]interface{}, len(columns))
	for i := range columns {
		valuePtrs[i] = &values[i]
	}

	for rows.Next() {
		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %v", err)
		}

		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			switch v := val.(type) {
			case []byte:
				row[col] = string(v)
			default:
				row[col] = v
			}
		}
		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %v", err)
	}

	// Convert results to JSON
	jsonResults, err := json.Marshal(results)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal results: %v", err)
	}

	resultStatus = StatusSuccess
	resultOutput = string(jsonResults)

	return &TaskResult{
		TaskID:        task.ID,
		Status:        resultStatus,
		Output:        resultOutput,
		ExecutionTime: time.Since(task.StartTime),
	}, nil
}
