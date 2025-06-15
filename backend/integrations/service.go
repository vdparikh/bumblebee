package integrations

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/vdparikh/compliance-automation/backend/queue"
	"github.com/vdparikh/compliance-automation/backend/store"
)

// IntegrationService handles the execution of integration tasks
type IntegrationService struct {
	db    *sql.DB
	queue queue.Queue
	store *store.DBStore
}

type ExecutionResult struct {
	Status string
	Output string
}

// NewIntegrationService creates a new integration service
func NewIntegrationService(db *sql.DB, queue queue.Queue, store *store.DBStore) *IntegrationService {
	return &IntegrationService{
		db:    db,
		queue: queue,
		store: store,
	}
}

// Start begins processing tasks from the queue
func (s *IntegrationService) Start(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			task, err := s.queue.DequeueTask(ctx)
			if err != nil {
				log.Printf("Error dequeuing task: %v", err)
				time.Sleep(5 * time.Second)
				continue
			}

			if task != nil {
				s.processTask(ctx, task)
			} else {
				time.Sleep(1 * time.Second)
			}
		}
	}
}

func (s *IntegrationService) processTask(ctx context.Context, task *queue.TaskExecutionRequest) {
	log.Printf("Processing task %s of type %s", task.ID, task.TaskType)

	// Create a result object
	result := &queue.TaskExecutionResult{
		ID:          task.ID,
		Status:      "completed",
		CompletedAt: time.Now(),
	}

	// Get the task instance
	taskInstance, err := s.store.GetCampaignTaskInstanceByID(task.TaskInstanceID.String())
	if err != nil {
		result.Status = "failed"
		result.ErrorMessage = fmt.Sprintf("Failed to get task instance: %v", err)
		if err := s.queue.UpdateTaskResult(ctx, result); err != nil {
			log.Printf("Error updating task result: %v", err)
		}
		return
	}

	// Check if target (connected system) is set
	if taskInstance.Target == nil || *taskInstance.Target == "" {
		result.Status = "failed"
		result.ErrorMessage = "No target (connected system) configured for this task"
		if err := s.queue.UpdateTaskResult(ctx, result); err != nil {
			log.Printf("Error updating task result: %v", err)
		}
		return
	}

	// Get the connected system
	connectedSystem, err := s.store.GetConnectedSystemByID(*taskInstance.Target)
	if err != nil {
		result.Status = "failed"
		result.ErrorMessage = fmt.Sprintf("Failed to get connected system: %v", err)
		if err := s.queue.UpdateTaskResult(ctx, result); err != nil {
			log.Printf("Error updating task result: %v", err)
		}
		return
	}

	fmt.Println(connectedSystem)
	// This section is now handled by the plugin system in TaskExecutionService.
	// For this old service file, we'll simulate a "not implemented" for plugin-based tasks.
	// If this service were still active, it would need to be updated to use the pluginRegistry.
	result.Status = "failed"
	result.ErrorMessage = fmt.Sprintf("Task type %s execution is not supported by this (old) service version. Use TaskExecutionService.", task.TaskType)
	log.Printf(result.ErrorMessage)

	// The following is placeholder for where execution would happen if this service was updated.
	// // Get the executor for this task type
	// exec, exists := executor.GetExecutor(task.TaskType) // This would be pluginRegistry.GetPluginForCheckType
	// if !exists {
	// 	result.Status = "failed"
	// 	result.ErrorMessage = fmt.Sprintf("No executor/plugin found for task type: %s", task.TaskType)
	// 	// ... update queue ...
	// 	return
	// }
	// // Create the check context
	// checkCtx := executor.CheckContext{ /* ... */ }
	// // Override task instance parameters
	// taskInstance.Parameters = task.Parameters
	// // Execute the task
	// execResult, err := exec.Execute(checkCtx) // This would be plugin.ExecuteCheck

	var execResult ExecutionResult // Placeholder
	if err != nil {
		result.Status = "failed"
		result.ErrorMessage = err.Error()
		log.Printf("Task execution failed: %v", err)
		log.Printf("Raw executor output: %s", execResult.Output)
	}

	// Ensure we have valid JSON output
	var resultJSON []byte
	if execResult.Output != "" {
		// Try to parse the output as JSON
		var resultObj interface{}
		if err := json.Unmarshal([]byte(execResult.Output), &resultObj); err != nil {
			log.Printf("Failed to parse executor output as JSON: %v", err)
			log.Printf("Raw output that failed to parse: %s", execResult.Output)

			// Create a new JSON object with the error and raw output
			resultObj = map[string]interface{}{
				"error":      err.Error(),
				"raw_output": execResult.Output,
				"status":     execResult.Status,
			}
		}

		// Marshal back to JSON
		var marshalErr error
		resultJSON, marshalErr = json.Marshal(resultObj)
		if marshalErr != nil {
			log.Printf("Failed to marshal result object: %v", marshalErr)
			// Fallback to a simple error message
			resultJSON = []byte(fmt.Sprintf(`{"error": "Failed to process result: %v"}`, marshalErr))
		}
	} else {
		// No output, create a simple status message
		resultJSON = []byte(fmt.Sprintf(`{"status": "%s"}`, execResult.Status))
	}

	// Set the result
	result.Status = execResult.Status
	result.Result = resultJSON

	// Log the final JSON we're trying to store
	log.Printf("Final JSON to be stored: %s", string(resultJSON))

	// Update the task result in the queue
	if err := s.queue.UpdateTaskResult(ctx, result); err != nil {
		log.Printf("Error updating task result: %v", err)
		log.Printf("Failed JSON: %s", string(resultJSON))
		return
	}

	// Update the task instance status
	now := time.Now()
	taskInstance.LastCheckedAt = &now
	taskInstance.LastCheckStatus = &result.Status
	if err := s.store.UpdateCampaignTaskInstance(taskInstance); err != nil {
		log.Printf("Error updating task instance status: %v", err)
	}

	// Insert a new row into campaign_task_instance_results
	insertQuery := `
		INSERT INTO campaign_task_instance_results (
			campaign_task_instance_id, task_execution_id, executed_by_user_id, timestamp, status, output
		) VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err = s.db.ExecContext(ctx, insertQuery,
		task.TaskInstanceID.String(),
		task.ID.String(),
		nil, // executed_by_user_id (set to nil if not available)
		now,
		result.Status,
		string(resultJSON), // Use the validated JSON
	)
	if err != nil {
		log.Printf("Error inserting into campaign_task_instance_results: %v", err)
		log.Printf("Failed JSON: %s", string(resultJSON))
	}
}

func (s *IntegrationService) executeFilePermissionCheck(task *queue.TaskExecutionRequest) (interface{}, error) {
	filePath, ok := task.Parameters["file_path"].(string)
	if !ok {
		return nil, fmt.Errorf("file_path parameter is required and must be a string")
	}

	expectedPerms, ok := task.Parameters["expected_permissions"].(string)
	if !ok {
		return nil, fmt.Errorf("expected_permissions parameter is required and must be a string")
	}

	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info: %w", err)
	}

	// Get file permissions
	actualPerms := fileInfo.Mode().Perm()
	actualPermsStr := fmt.Sprintf("%o", actualPerms)

	// Convert expected permissions to octal
	expectedPermsInt, err := strconv.ParseInt(expectedPerms, 8, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid expected permissions format: %w", err)
	}

	// Compare permissions
	success := actualPerms == os.FileMode(expectedPermsInt)

	result := map[string]interface{}{
		"message": fmt.Sprintf("File permission check %s", map[bool]string{true: "passed", false: "failed"}[success]),
		"details": map[string]interface{}{
			"file_path":            filePath,
			"expected_permissions": expectedPerms,
			"actual_permissions":   actualPermsStr,
			"success":              success,
		},
	}

	if !success {
		return result, fmt.Errorf("file permissions mismatch: expected %s, got %s", expectedPerms, actualPermsStr)
	}

	return result, nil
}

func (s *IntegrationService) executeAWSIAMCheck(task *queue.TaskExecutionRequest) (interface{}, error) {
	// TODO: Implement AWS IAM check logic
	return nil, fmt.Errorf("AWS IAM check not implemented")
}

func (s *IntegrationService) executeSplunkLogCheck(task *queue.TaskExecutionRequest) (interface{}, error) {
	// TODO: Implement Splunk log check logic
	return nil, fmt.Errorf("Splunk log check not implemented")
}

func (s *IntegrationService) executeGrafanaDashboardCheck(task *queue.TaskExecutionRequest) (interface{}, error) {
	// TODO: Implement Grafana dashboard check logic
	return nil, fmt.Errorf("Grafana dashboard check not implemented")
}
