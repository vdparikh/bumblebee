package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models" 
	"github.com/vdparikh/compliance-automation/backend/store"  
)

type TaskHandler struct {
	Store *store.DBStore
}

func NewTaskHandler(s *store.DBStore) *TaskHandler {
	return &TaskHandler{Store: s}
}

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
	task.ID = taskID 
	c.JSON(http.StatusCreated, task)
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

	c.JSON(http.StatusOK, updatedTask)
}
