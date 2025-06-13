package queue

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// TaskExecutionRequest represents a task to be executed
type TaskExecutionRequest struct {
	ID             uuid.UUID              `json:"id"`
	TaskInstanceID uuid.UUID              `json:"task_instance_id"`
	TaskType       string                 `json:"task_type"`
	Parameters     map[string]interface{} `json:"parameters"`
	SystemConfig   map[string]interface{} `json:"system_config"`
	CreatedAt      time.Time              `json:"created_at"`
	Status         string                 `json:"status"`
	ErrorMessage   *string                `json:"error_message,omitempty"`
	Result         []byte                 `json:"result,omitempty"`
	CompletedAt    *time.Time             `json:"completed_at,omitempty"`
}

// TaskExecutionResult represents the result of a task execution
type TaskExecutionResult struct {
	ID           uuid.UUID `json:"id"`
	Status       string    `json:"status"`
	Result       []byte    `json:"result,omitempty"`
	ErrorMessage string    `json:"error_message,omitempty"`
	CompletedAt  time.Time `json:"completed_at"`
}

// Queue defines the interface for task queue operations
type Queue interface {
	// EnqueueTask adds a new task to the queue
	EnqueueTask(ctx context.Context, request *TaskExecutionRequest) error

	// DequeueTask retrieves the next task from the queue
	DequeueTask(ctx context.Context) (*TaskExecutionRequest, error)

	// UpdateTaskResult updates the result of a task execution
	UpdateTaskResult(ctx context.Context, result *TaskExecutionResult) error

	// GetTaskStatus retrieves the current status of a task
	GetTaskStatus(ctx context.Context, taskID uuid.UUID) (*TaskExecutionRequest, error)
}

// NewQueue creates a new queue instance based on the configuration
func NewQueue(config map[string]interface{}) (Queue, error) {
	return NewPostgresQueue(config)
}
