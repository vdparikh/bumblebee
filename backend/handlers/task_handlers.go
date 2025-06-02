package handlers

import (
	// "encoding/json"

	"log"
	"net/http"

	// "time"

	"github.com/gin-gonic/gin"
	// "github.com/google/uuid"
	"github.com/vdparikh/compliance-automation/backend/models" // Adjust import path
	"github.com/vdparikh/compliance-automation/backend/store"  // Adjust import path
)

// TaskHandler holds the store for database operations.
type TaskHandler struct {
	Store *store.DBStore
}

// NewTaskHandler creates a new TaskHandler.
func NewTaskHandler(s *store.DBStore) *TaskHandler {
	return &TaskHandler{Store: s}
}

// CreateTaskHandler handles the creation of new tasks.
func (h *TaskHandler) CreateTaskHandler(c *gin.Context) {
	var payload struct {
		Title                 string                 `json:"title" binding:"required"`
		Description           string                 `json:"description"`
		Category              string                 `json:"category"`
		RequirementID         string                 `json:"requirementId"`
		CheckType             *string                `json:"checkType"`
		Target                *string                `json:"target"`
		Parameters            map[string]interface{} `json:"parameters"`
		EvidenceTypesExpected []string               `json:"evidenceTypesExpected"`
		DefaultPriority       *string                `json:"defaultPriority"`
		LinkedDocumentIDs     []string               `json:"linked_document_ids"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body for task", err)
		return
	}

	// Basic validation (add more as needed)
	if payload.Title == "" {
		sendError(c, http.StatusBadRequest, "Title is required for task", nil)
		return
	}

	task := models.Task{
		Title:                 payload.Title,
		Description:           payload.Description,
		Category:              payload.Category,
		RequirementID:         payload.RequirementID,
		CheckType:             payload.CheckType,
		Target:                payload.Target,
		Parameters:            payload.Parameters,
		EvidenceTypesExpected: payload.EvidenceTypesExpected,
		DefaultPriority:       payload.DefaultPriority,
		LinkedDocumentIDs:     payload.LinkedDocumentIDs,
	}

	taskID, err := h.Store.CreateTask(&task)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to create task", err)
		return
	}
	task.ID = taskID // Populate the ID from the store
	c.JSON(http.StatusCreated, task)
}

// GetTasksHandler lists all tasks.
func (h *TaskHandler) GetTasksHandler(c *gin.Context) {
	// Check for query parameters like ?userId=...&userField=owner
	userID := c.Query("userId")
	userField := c.Query("userField") // "owner" or "assignee"

	tasks, err := h.Store.GetTasks(userID, userField)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve tasks: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// GetTaskHandler retrieves a single task by its ID.
func (h *TaskHandler) GetTaskHandler(c *gin.Context) {
	taskID := c.Param("id")
	task, err := h.Store.GetTaskByID(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve task: " + err.Error()})
		return
	}
	if task == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}
	c.JSON(http.StatusOK, task)
}

// // ExecuteCheckHandler simulates executing a check (actual logic would be more complex).
// func ExecuteCheckHandler(c *gin.Context) {
// 	checkID := c.Param("id")

// 	mu.Lock() // Lock for writing results

// 	if _, exists := checkDefinitions[checkID]; !exists {
// 		c.JSON(http.StatusNotFound, gin.H{"error": "Check definition not found"})
// 		return
// 	}
// 	// ... (rest of the handler logic, which now needs to be adapted for Tasks and TaskExecutionResults using the DBStore)
// 	// This will involve:
// 	// 1. Fetching the Task from the DB using h.Store.GetTaskByID(taskID)
// 	// 2. Performing the check logic based on task.CheckType, task.Target, task.Parameters
// 	// 3. Creating a models.TaskExecutionResult
// 	// 4. Saving the result using h.Store.CreateTaskExecutionResult(&result)
// 	c.JSON(http.StatusNotImplemented, gin.H{"message": "ExecuteTaskHandler not fully implemented with DB yet"})
// }

// TODO: Implement GetTaskResultsHandler, UpdateTaskHandler, etc.

// UpdateTaskHandler handles PUT requests to update an existing task.
func (h *TaskHandler) UpdateTaskHandler(c *gin.Context) {
	taskID := c.Param("id")
	var taskUpdates models.Task

	if err := c.ShouldBindJSON(&taskUpdates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Fetch existing task to ensure it exists and to merge updates
	existingTask, err := h.Store.GetTaskByID(taskID)
	if err != nil {
		log.Printf("Error fetching task for update: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve existing task"})
		return
	}
	if existingTask == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Apply updates - This is a simple merge. For partial updates (PATCH),
	// you'd need more sophisticated logic to check which fields are present in the request.
	// For PUT, typically the entire resource is replaced or updated.
	// Here, we assume taskUpdates contains all necessary fields or frontend sends complete task object.
	taskUpdates.ID = taskID                        // Ensure ID is set from path param
	taskUpdates.CreatedAt = existingTask.CreatedAt // Preserve original creation time

	// If frontend sends only specific fields for update, you'd merge them here.
	// For example, if only status is sent in taskUpdates:
	// existingTask.Status = taskUpdates.Status
	// existingTask.Title = taskUpdates.Title (if provided)
	// ... and so on for all fields.
	// For simplicity with PUT, we'll use the taskUpdates directly, assuming it's the new state.

	if err := h.Store.UpdateTask(&taskUpdates); err != nil {
		log.Printf("Error updating task %s: %v", taskID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	// Fetch the updated task to return it
	updatedTask, err := h.Store.GetTaskByID(taskID)
	if err != nil {
		log.Printf("Error fetching updated task %s: %v", taskID, err)
		// Return the input data as a fallback, or an error
		c.JSON(http.StatusOK, taskUpdates) // Or handle error more gracefully
		return
	}

	c.JSON(http.StatusOK, updatedTask)
}

// --- Task Comment Handlers ---

// // AddTaskCommentHandler handles POST requests to add a comment to a task.
// func (h *TaskHandler) AddTaskCommentHandler(c *gin.Context) {
// 	taskID := c.Param("id") // Changed from taskId
// 	var commentReq models.Comment

// 	if err := c.ShouldBindJSON(&commentReq); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
// 		return
// 	}

// 	// In a real app, get UserID from authenticated session/token
// 	// For now, we expect it in the request or use a placeholder.
// 	if commentReq.UserID == "" {
// 		// Placeholder - replace with actual authenticated user ID
// 		// commentReq.UserID = "36a95829-f890-43dc-aff3-289c50ce83c2" // Example
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required for comment"})
// 		return
// 	}

// 	comment := models.Comment{
// 		TaskID: &taskID, // Assign the address of taskID
// 		UserID: commentReq.UserID,
// 		Text:   commentReq.Text,
// 	}

// 	if err := h.Store.CreateTaskComment(&comment); err != nil {
// 		log.Printf("Error creating task comment for task %s: %v", taskID, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add comment"})
// 		return
// 	}

// 	// Fetch the created comment to include user name and created_at from DB
// 	// This assumes GetTaskComments can also fetch a single comment or you have GetCommentByID
// 	// For simplicity, returning the input comment with ID and CreatedAt set by store.
// 	// A better approach is to fetch the comment again to get all DB-generated fields.
// 	// Or, the CreateTaskComment store method could return the created comment.
// 	// For now, we'll fetch all comments and find the new one (not ideal for performance).
// 	// A more direct way: modify CreateTaskComment to return the created comment with its ID.
// 	// Let's assume the frontend can handle the response from CreateTaskComment as is for now,
// 	// or refetch comments list.

// 	// To return the newly created comment with all details (like user name from join):
// 	// Ideally, CreateTaskComment would return the full comment object or its ID.
// 	// As a workaround, we can fetch it, but it's less efficient.
// 	// For now, we'll just return the comment object as it was passed to the store,
// 	// which will have ID and CreatedAt populated.
// 	c.JSON(http.StatusCreated, comment)
// }

// // // GetTaskCommentsHandler handles GET requests to retrieve comments for a task.
// func (h *TaskHandler) GetTaskCommentsHandler(c *gin.Context) {
// 	taskIDFromPath := c.Param("id") // This is the master TaskID from the URL path
// 	campaignTaskInstanceIDFromQuery := c.Query("campaignTaskInstanceId")

// 	var comments []models.Comment
// 	var err error

// 	if campaignTaskInstanceIDFromQuery != "" {
// 		// If campaignTaskInstanceId is provided in query, fetch comments for that specific instance
// 		comments, err = h.Store.GetTaskComments("", campaignTaskInstanceIDFromQuery)
// 	} else {
// 		// Otherwise, fetch comments for the master task ID from the path
// 		comments, err = h.Store.GetTaskComments(taskIDFromPath, "")
// 	}

// 	if err != nil {
// 		log.Printf("Error fetching comments (taskID: %s, campaignTaskInstanceID: %s): %v", taskIDFromPath, campaignTaskInstanceIDFromQuery, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve comments"})
// 		return
// 	}
// 	if comments == nil {
// 		comments = []models.Comment{} // Return empty array instead of null
// 	}
// 	c.JSON(http.StatusOK, comments)
// }

// // --- Task Evidence Handlers ---

// // UploadTaskEvidenceHandler handles POST requests to upload evidence for a task.
// func (h *TaskHandler) UploadTaskEvidenceHandler(c *gin.Context) {
// 	taskID := c.Param("id") // Changed from taskId
// 	// In a real app, get UserID from authenticated session/token
// 	uploaderUserID := "36a95829-f890-43dc-aff3-289c50ce83c2" // Placeholder

// 	file, header, err := c.Request.FormFile("file")
// 	if err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "File upload error: " + err.Error()})
// 		return
// 	}
// 	defer file.Close()

// 	// Sanitize filename
// 	fileName := strings.ReplaceAll(filepath.Base(header.Filename), " ", "_")
// 	// Create a unique path or use a cloud storage service
// 	// For simplicity, saving to a local 'uploads' directory
// 	uploadDir := "./uploads/" + taskID
// 	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
// 		log.Printf("Error creating upload directory %s: %v", uploadDir, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
// 		return
// 	}
// 	filePath := filepath.Join(uploadDir, fileName)

// 	out, err := os.Create(filePath)
// 	if err != nil {
// 		log.Printf("Error creating file %s: %v", filePath, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
// 		return
// 	}
// 	defer out.Close()
// 	_, err = io.Copy(out, file)
// 	if err != nil {
// 		log.Printf("Error copying file content to %s: %v", filePath, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write file content"})
// 		return
// 	}

// 	evidence := models.Evidence{
// 		TaskID:         &taskID,
// 		UploaderUserID: uploaderUserID,
// 		FileName:       fileName,
// 		FilePath:       filePath, // In a real app, this might be a URL served by a static file server or cloud URL
// 		MimeType:       header.Header.Get("Content-Type"),
// 		FileSize:       header.Size,
// 		// Description: c.PostForm("description"), // If you add a description field to the form
// 	}

// 	if err := h.Store.CreateTaskEvidence(&evidence); err != nil {
// 		log.Printf("Error creating task evidence record for task %s: %v", taskID, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save evidence metadata"})
// 		return
// 	}

// 	// Return the created evidence metadata. The FilePath here is local.
// 	// Frontend might need a public URL to access the file.
// 	c.JSON(http.StatusCreated, evidence)
// }

// // GetTaskEvidenceHandler handles GET requests to retrieve evidence for a task.
// func (h *TaskHandler) GetTaskEvidenceHandler(c *gin.Context) {
// 	taskID := c.Param("id") // Changed from taskId
// 	evidences, err := h.Store.GetTaskEvidence(taskID)
// 	if err != nil {
// 		log.Printf("Error fetching evidence for task %s: %v", taskID, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve evidence"})
// 		return
// 	}
// 	if evidences == nil {
// 		evidences = []models.Evidence{} // Return empty array instead of null
// 	}
// 	c.JSON(http.StatusOK, evidences)
// }
