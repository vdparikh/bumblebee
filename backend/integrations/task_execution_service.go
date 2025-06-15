package integrations

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/queue"
	"github.com/vdparikh/compliance-automation/backend/store"
)

// TaskExecutionService handles the execution of integration tasks from the queue
type TaskExecutionService struct {
	db             *sql.DB
	queue          queue.Queue
	store          *store.DBStore
	pluginRegistry PluginRegistry // Use the interface defined in the integrations package
}

// NewTaskExecutionService creates a new task execution service
func NewTaskExecutionService(db *sql.DB, queue queue.Queue, store *store.DBStore, pluginRegistry PluginRegistry) *TaskExecutionService {
	// executor.InitExecutors() // This is part of the old executor system and can be removed
	return &TaskExecutionService{
		db:             db,
		queue:          queue,
		store:          store,
		pluginRegistry: pluginRegistry,
	}
}

// Start begins processing tasks from the queue
func (s *TaskExecutionService) Start(ctx context.Context) error {
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

func (s *TaskExecutionService) processTask(goCtx context.Context, task *queue.TaskExecutionRequest) { // Renamed ctx to goCtx to avoid conflict
	log.Printf("Processing task %s of type %s", task.ID, task.TaskType)

	// Create a result object for the queue
	queueResult := &queue.TaskExecutionResult{
		ID:          task.ID,
		CompletedAt: time.Now(),
		// Status will be determined by plugin execution
	}

	// Get the task instance
	taskInstance, err := s.store.GetCampaignTaskInstanceByID(task.TaskInstanceID.String())
	if err != nil {
		queueResult.Status = "failed"
		queueResult.ErrorMessage = fmt.Sprintf("Failed to get task instance %s: %v", task.TaskInstanceID.String(), err)
		if err := s.queue.UpdateTaskResult(goCtx, queueResult); err != nil {
			log.Printf("Error updating task result in queue for task %s: %v", task.ID, err)
		}
		return
	}

	// Check if target (connected system) is set
	if taskInstance.Target == nil || *taskInstance.Target == "" {
		queueResult.Status = "failed"
		queueResult.ErrorMessage = "No target (connected system) configured for this task"
		if err := s.queue.UpdateTaskResult(goCtx, queueResult); err != nil {
			log.Printf("Error updating task result in queue for task %s: %v", task.ID, err)
		}
		return
	}

	// Get the connected system
	connectedSystem, err := s.store.GetConnectedSystemByID(*taskInstance.Target)
	if err != nil {
		queueResult.Status = "failed"
		queueResult.ErrorMessage = fmt.Sprintf("Failed to get connected system %s: %v", *taskInstance.Target, err)
		if err := s.queue.UpdateTaskResult(goCtx, queueResult); err != nil {
			log.Printf("Error updating task result in queue for task %s: %v", task.ID, err)
		}
		return
	}

	// Get the plugin for this task type (check type key)
	plugin, exists := s.pluginRegistry.GetPluginForCheckType(task.TaskType)
	if !exists {
		queueResult.Status = "failed"
		queueResult.ErrorMessage = fmt.Sprintf("No plugin found for task type (check type key): %s", task.TaskType)
		if err := s.queue.UpdateTaskResult(goCtx, queueResult); err != nil {
			log.Printf("Error updating task result in queue for task %s: %v", task.ID, err)
		}
		return
	}

	// Create the check context for the plugin
	checkCtx := common.CheckContext{
		TaskInstance:    taskInstance,
		ConnectedSystem: connectedSystem,
		Store:           s.store,
		StdContext:      goCtx,
	}

	// Override task instance parameters with the ones from the execution request
	taskInstance.Parameters = task.Parameters

	// Execute the task
	pluginExecResult, pluginErr := plugin.ExecuteCheck(checkCtx, task.TaskType)

	if pluginErr != nil {
		queueResult.Status = common.StatusFailed // Definitive status for the queue
		queueResult.ErrorMessage = pluginErr.Error()
		log.Printf("Task execution failed for task %s: %v", task.ID, pluginErr)
		if pluginExecResult.Output != "" { // Log plugin's output even on error
			log.Printf("Raw plugin output on error for task %s: %s", task.ID, pluginExecResult.Output)
		}
	} else {
		queueResult.Status = pluginExecResult.Status // Use status from plugin if no error
	}

	// Ensure we have valid JSON output
	// Construct the JSON output for storage
	var resultJSON []byte
	var outputForStorage map[string]interface{}

	if pluginExecResult.Output != "" {
		var pluginOutputObj interface{}
		if unmarshalErr := json.Unmarshal([]byte(pluginExecResult.Output), &pluginOutputObj); unmarshalErr != nil {
			log.Printf("Plugin output for task %s was not valid JSON: %v. Raw: %s", task.ID, unmarshalErr, pluginExecResult.Output)
			outputForStorage = map[string]interface{}{
				"parsing_error":     "Plugin output was not valid JSON: " + unmarshalErr.Error(),
				"raw_plugin_output": pluginExecResult.Output,
				"plugin_status":     pluginExecResult.Status, // Status reported by plugin
			}
		} else {
			// If plugin output is already a map, use it as base
			if mapOutput, ok := pluginOutputObj.(map[string]interface{}); ok {
				outputForStorage = mapOutput
			} else { // Otherwise, wrap it
				outputForStorage = map[string]interface{}{"data": pluginOutputObj}
			}
			// Ensure the plugin's reported status is in the output
			if _, ok := outputForStorage["plugin_status"]; !ok {
				outputForStorage["plugin_status"] = pluginExecResult.Status
			}
		}
	} else {
		outputForStorage = make(map[string]interface{})
	}

	// Add overall execution status and error message (if any) to the stored output
	outputForStorage["overall_execution_status"] = queueResult.Status
	if queueResult.ErrorMessage != "" {
		outputForStorage["execution_error_message"] = queueResult.ErrorMessage
	}
	// If plugin had a status but overall failed due to pluginErr, ensure plugin_status is captured
	if pluginExecResult.Status != "" {
		if _, ok := outputForStorage["plugin_status"]; !ok {
			outputForStorage["plugin_status"] = pluginExecResult.Status
		}
	}

	var marshalErr error
	resultJSON, marshalErr = json.Marshal(outputForStorage)
	if marshalErr != nil {
		log.Printf("Failed to marshal final output JSON for task %s: %v", task.ID, marshalErr)
		resultJSON = []byte(fmt.Sprintf(`{"error": "Failed to marshal execution output: %s", "status_reported_by_plugin": "%s"}`, marshalErr.Error(), pluginExecResult.Status))
		if queueResult.Status != common.StatusFailed && queueResult.Status != common.StatusError {
			queueResult.Status = common.StatusError // If marshaling fails, the overall status should reflect an error
			queueResult.ErrorMessage = "Failed to marshal execution output: " + marshalErr.Error()
		}
	}

	queueResult.Result = resultJSON

	// Log the final JSON we're trying to store
	log.Printf("Final JSON to be stored for task %s: %s", task.ID, string(resultJSON))
	log.Printf("Queue result status for task %s: %s", task.ID, queueResult.Status)

	// Update the task result in the queue
	if err := s.queue.UpdateTaskResult(goCtx, queueResult); err != nil {
		log.Printf("Error updating task result in queue for task %s: %v", task.ID, err)
		return
	}

	// Update the task instance status
	now := time.Now()
	taskInstance.LastCheckedAt = &now
	taskInstance.LastCheckStatus = &queueResult.Status
	if err := s.store.UpdateCampaignTaskInstance(taskInstance); err != nil {
		log.Printf("Error updating task instance status in DB for task %s: %v", taskInstance.ID, err)
	}

	// Insert a new row into campaign_task_instance_results
	insertQuery := `
		INSERT INTO campaign_task_instance_results (
			campaign_task_instance_id, task_execution_id, executed_by_user_id, timestamp, status, output
		) VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err = s.db.ExecContext(goCtx, insertQuery,
		task.TaskInstanceID.String(),
		task.ID.String(),
		nil, // executed_by_user_id (set to nil if not available)
		now,
		queueResult.Status,
		string(resultJSON), // Use the validated JSON
	)
	if err != nil {
		log.Printf("Error inserting into campaign_task_instance_results for task %s: %v", task.ID, err)
	}
}

// executeFilePermissionCheck and other specific check methods can be removed from here
// if their logic is now within plugins.
/*
func (s *TaskExecutionService) executeFilePermissionCheck(task *queue.TaskExecutionRequest) (interface{}, error) {
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
*/

/*
func (s *TaskExecutionService) executeAWSIAMCheck(task *queue.TaskExecutionRequest) (interface{}, error) {
	// TODO: Implement AWS IAM check logic
	return nil, fmt.Errorf("AWS IAM check not implemented")
}

func (s *TaskExecutionService) executeSplunkLogCheck(task *queue.TaskExecutionRequest) (interface{}, error) {
	// TODO: Implement Splunk log check logic
	return nil, fmt.Errorf("Splunk log check not implemented")
}

func (s *TaskExecutionService) executeGrafanaDashboardCheck(task *queue.TaskExecutionRequest) (interface{}, error) {
	// TODO: Implement Grafana dashboard check logic
	return nil, fmt.Errorf("Grafana dashboard check not implemented")
}*/
