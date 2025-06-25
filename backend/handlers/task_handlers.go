package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"reflect"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
	"github.com/vdparikh/compliance-automation/backend/utils"
)

type TaskHandler struct {
	Store *store.DBStore
}

func NewTaskHandler(s *store.DBStore) *TaskHandler {
	return &TaskHandler{Store: s}
}

func (h *TaskHandler) CreateTaskHandler(c *gin.Context) {
	var newTask models.Task
	if err := c.ShouldBindJSON(&newTask); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}
	if newTask.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title is required"})
		return
	}
	if newTask.Version == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "version is required"})
		return
	}
	if newTask.Category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "category is required"})
		return
	}
	if newTask.DefaultPriority == nil || *newTask.DefaultPriority == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "defaultPriority is required"})
		return
	}
	if newTask.Status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status is required"})
		return
	}
	// Create the task and handle requirementIds join table
	taskID, err := h.Store.CreateTask(&newTask)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task: " + err.Error()})
		return
	}
	newTask.ID = taskID
	c.JSON(http.StatusCreated, newTask)
}

func (h *TaskHandler) GetTasksHandler(c *gin.Context) {
	userID := c.Query("userId")
	userField := c.Query("userField")

	tasks, err := h.Store.GetTasks(userID, userField)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve tasks: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

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

func (h *TaskHandler) UpdateTaskHandler(c *gin.Context) {
	taskID := c.Param("id")
	var taskUpdates models.Task

	if err := c.ShouldBindJSON(&taskUpdates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

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

	taskUpdates.ID = taskID
	taskUpdates.CreatedAt = existingTask.CreatedAt

	if err := h.Store.UpdateTask(&taskUpdates); err != nil {
		log.Printf("Error updating task %s: %v", taskID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	updatedTask, err := h.Store.GetTaskByID(taskID)
	if err != nil {
		log.Printf("Error fetching updated task %s: %v", taskID, err)
		c.JSON(http.StatusOK, taskUpdates)
		return
	}

	// Audit log for update
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("Error: UserID not found in context for audit logging update task %s", taskID)
	}
	var userIDStrPtr *string
	if exists {
		uid := userID.(string)
		userIDStrPtr = &uid
	}

	auditChanges := make(map[string]interface{})

	if existingTask.Title != updatedTask.Title {
		auditChanges["title"] = map[string]string{"old": existingTask.Title, "new": updatedTask.Title}
	}
	if existingTask.Description != updatedTask.Description {
		auditChanges["description"] = map[string]string{"old": existingTask.Description, "new": updatedTask.Description}
	}
	if existingTask.Category != updatedTask.Category {
		auditChanges["category"] = map[string]string{"old": existingTask.Category, "new": updatedTask.Category}
	}

	// Compare requirement IDs
	if !reflect.DeepEqual(existingTask.RequirementIDs, updatedTask.RequirementIDs) {
		oldReqsJSON, _ := json.Marshal(existingTask.RequirementIDs)
		newReqsJSON, _ := json.Marshal(updatedTask.RequirementIDs)
		auditChanges["requirement_ids"] = map[string]string{"old": string(oldReqsJSON), "new": string(newReqsJSON)}
	}

	// Helper for comparing string pointers
	compareStringPtr := func(field string, oldVal, newVal *string) {
		oldS, newS := "", ""
		if oldVal != nil {
			oldS = *oldVal
		}
		if newVal != nil {
			newS = *newVal
		}
		if oldS != newS {
			auditChanges[field] = map[string]string{"old": oldS, "new": newS}
		}
	}
	compareStringPtr("check_type", existingTask.CheckType, updatedTask.CheckType)
	compareStringPtr("target", existingTask.Target, updatedTask.Target)
	compareStringPtr("default_priority", existingTask.DefaultPriority, updatedTask.DefaultPriority)

	// Comparing Parameters (map[string]interface{})
	if !reflect.DeepEqual(existingTask.Parameters, updatedTask.Parameters) {
		oldParamsJSON, _ := json.Marshal(existingTask.Parameters)
		newParamsJSON, _ := json.Marshal(updatedTask.Parameters)
		auditChanges["parameters"] = map[string]string{"old": string(oldParamsJSON), "new": string(newParamsJSON)}
	}

	// Comparing EvidenceTypesExpected ([]string)
	if !reflect.DeepEqual(existingTask.EvidenceTypesExpected, updatedTask.EvidenceTypesExpected) {
		oldEvidenceJSON, _ := json.Marshal(existingTask.EvidenceTypesExpected)
		newEvidenceJSON, _ := json.Marshal(updatedTask.EvidenceTypesExpected)
		auditChanges["evidence_types_expected"] = map[string]string{"old": string(oldEvidenceJSON), "new": string(newEvidenceJSON)}
	}

	// Comparing LinkedDocumentIDs ([]string)
	if !reflect.DeepEqual(existingTask.LinkedDocumentIDs, taskUpdates.LinkedDocumentIDs) {
		oldLinkedDocsJSON, _ := json.Marshal(existingTask.LinkedDocumentIDs)
		newLinkedDocsJSON, _ := json.Marshal(taskUpdates.LinkedDocumentIDs)
		auditChanges["linked_document_ids"] = map[string]string{"old": string(oldLinkedDocsJSON), "new": string(newLinkedDocsJSON)}
	}

	if len(auditChanges) > 0 {
		if err := utils.RecordAuditLog(h.Store, userIDStrPtr, "update_task", "task", taskID, auditChanges); err != nil {
			log.Printf("Error recording audit log for update task %s: %v", taskID, err)
		}
	}

	c.JSON(http.StatusOK, updatedTask)
}

func (h *TaskHandler) LinkTaskToRequirementsHandler(c *gin.Context) {
	taskID := c.Param("id")

	var payload struct {
		RequirementIDs []string `json:"requirement_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if len(payload.RequirementIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "requirement_ids cannot be empty"})
		return
	}

	// Verify the task exists
	existingTask, err := h.Store.GetTaskByID(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify task exists: " + err.Error()})
		return
	}
	if existingTask == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Link the task to the requirements
	if err := h.Store.LinkTaskToRequirements(taskID, payload.RequirementIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link task to requirements: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task successfully linked to requirements"})
}

func (h *TaskHandler) UnlinkTaskFromRequirementsHandler(c *gin.Context) {
	taskID := c.Param("id")

	var payload struct {
		RequirementIDs []string `json:"requirement_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if len(payload.RequirementIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "requirement_ids cannot be empty"})
		return
	}

	// Verify the task exists
	existingTask, err := h.Store.GetTaskByID(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify task exists: " + err.Error()})
		return
	}
	if existingTask == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// Unlink the task from the requirements
	if err := h.Store.UnlinkTaskFromRequirements(taskID, payload.RequirementIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlink task from requirements: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task successfully unlinked from requirements"})
}
