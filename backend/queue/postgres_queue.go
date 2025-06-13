package queue

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

type PostgresQueue struct {
	db *sql.DB
}

func NewPostgresQueue(config map[string]interface{}) (*PostgresQueue, error) {
	// Extract database configuration
	connStr := config["connection_string"].(string)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Create the task_executions table if it doesn't exist
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS task_executions (
			id UUID PRIMARY KEY,
			task_instance_id UUID NOT NULL,
			task_type VARCHAR(255) NOT NULL,
			parameters JSONB NOT NULL,
			system_config JSONB NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL,
			status VARCHAR(50) NOT NULL,
			error_message TEXT,
			result JSONB,
			completed_at TIMESTAMP WITH TIME ZONE,
			locked_at TIMESTAMP WITH TIME ZONE,
			locked_by VARCHAR(255)
		)
	`)
	if err != nil {
		return nil, err
	}

	return &PostgresQueue{db: db}, nil
}

func (q *PostgresQueue) EnqueueTask(ctx context.Context, request *TaskExecutionRequest) error {
	query := `
		INSERT INTO task_executions (
			id, task_instance_id, task_type, parameters, system_config,
			created_at, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	paramsJSON, err := json.Marshal(request.Parameters)
	if err != nil {
		return err
	}

	systemConfigJSON, err := json.Marshal(request.SystemConfig)
	if err != nil {
		return err
	}

	_, err = q.db.ExecContext(ctx, query,
		request.ID,
		request.TaskInstanceID,
		request.TaskType,
		paramsJSON,
		systemConfigJSON,
		request.CreatedAt,
		request.Status,
	)

	return err
}

func (q *PostgresQueue) DequeueTask(ctx context.Context) (*TaskExecutionRequest, error) {
	// Use a transaction to ensure atomicity
	tx, err := q.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Try to lock and get the next available task
	query := `
		UPDATE task_executions
		SET status = 'processing',
			locked_at = NOW(),
			locked_by = $1
		WHERE id = (
			SELECT id
			FROM task_executions
			WHERE status = 'pending'
			AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
			ORDER BY created_at ASC
			FOR UPDATE SKIP LOCKED
			LIMIT 1
		)
		RETURNING id, task_instance_id, task_type, parameters, system_config,
				  created_at, status, error_message, result, completed_at
	`

	var request TaskExecutionRequest
	var paramsJSON, systemConfigJSON, resultJSON []byte
	var errorMessage sql.NullString

	err = tx.QueryRowContext(ctx, query, "integration-service").Scan(
		&request.ID,
		&request.TaskInstanceID,
		&request.TaskType,
		&paramsJSON,
		&systemConfigJSON,
		&request.CreatedAt,
		&request.Status,
		&errorMessage,
		&resultJSON,
		&request.CompletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil // No tasks available
	}
	if err != nil {
		return nil, err
	}

	// Handle nullable error message
	if errorMessage.Valid {
		request.ErrorMessage = &errorMessage.String
	}

	// Parse JSON fields
	if err := json.Unmarshal(paramsJSON, &request.Parameters); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(systemConfigJSON, &request.SystemConfig); err != nil {
		return nil, err
	}
	if resultJSON != nil {
		request.Result = resultJSON
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &request, nil
}

func (q *PostgresQueue) UpdateTaskResult(ctx context.Context, result *TaskExecutionResult) error {
	query := `
		UPDATE task_executions
		SET status = $1,
			result = $2,
			error_message = $3,
			completed_at = $4,
			locked_at = NULL,
			locked_by = NULL
		WHERE id = $5
	`

	// Convert result to JSON if it's not already
	var resultJSON []byte
	var err error
	if result.Result != nil {
		// If result is already JSON bytes, use it directly
		if json.Valid(result.Result) {
			resultJSON = result.Result
		} else {
			// Try to parse and re-encode to ensure valid JSON
			var resultObj interface{}
			if err := json.Unmarshal(result.Result, &resultObj); err != nil {
				// If unmarshal fails, wrap the raw bytes in a JSON object
				resultObj = map[string]interface{}{
					"raw_output": string(result.Result),
					"status":     result.Status,
				}
			}
			resultJSON, err = json.Marshal(resultObj)
			if err != nil {
				return fmt.Errorf("failed to marshal result: %w", err)
			}
		}
	} else {
		// No result, create a simple status message
		resultJSON = []byte(fmt.Sprintf(`{"status": "%s"}`, result.Status))
	}

	// Log the JSON we're about to store
	log.Printf("Storing JSON in task_executions: %s", string(resultJSON))

	_, err = q.db.ExecContext(ctx, query,
		result.Status,
		resultJSON,
		result.ErrorMessage,
		result.CompletedAt,
		result.ID,
	)

	return err
}

func (q *PostgresQueue) GetTaskStatus(ctx context.Context, taskID uuid.UUID) (*TaskExecutionRequest, error) {
	query := `
		SELECT id, task_instance_id, task_type, parameters, system_config,
			   created_at, status, error_message, result, completed_at
		FROM task_executions
		WHERE id = $1
	`

	var request TaskExecutionRequest
	var paramsJSON, systemConfigJSON, resultJSON []byte
	var errorMessage sql.NullString

	err := q.db.QueryRowContext(ctx, query, taskID).Scan(
		&request.ID,
		&request.TaskInstanceID,
		&request.TaskType,
		&paramsJSON,
		&systemConfigJSON,
		&request.CreatedAt,
		&request.Status,
		&errorMessage,
		&resultJSON,
		&request.CompletedAt,
	)
	if err != nil {
		return nil, err
	}

	// Handle nullable error message
	if errorMessage.Valid {
		request.ErrorMessage = &errorMessage.String
	}

	// Parse JSON fields
	if err := json.Unmarshal(paramsJSON, &request.Parameters); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(systemConfigJSON, &request.SystemConfig); err != nil {
		return nil, err
	}
	if resultJSON != nil {
		request.Result = resultJSON
	}

	return &request, nil
}
