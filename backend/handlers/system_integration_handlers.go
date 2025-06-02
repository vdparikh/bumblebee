package handlers

import (
	"encoding/json"
	"net/http"

	"log"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

type SystemIntegrationHandler struct {
	store *store.DBStore
}

func NewSystemIntegrationHandler(store *store.DBStore) *SystemIntegrationHandler {
	return &SystemIntegrationHandler{store: store}
}

func (h *SystemIntegrationHandler) CreateConnectedSystemHandler(c *gin.Context) {
	var system models.ConnectedSystem
	if err := c.ShouldBindJSON(&system); err != nil {
		log.Printf("Error binding JSON for new connected system: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	if system.Name == "" || system.SystemType == "" || len(system.Configuration) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name, SystemType, and Configuration are required"})
		return
	}

	var js json.RawMessage
	if err := json.Unmarshal(system.Configuration, &js); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Configuration must be valid JSON: " + err.Error()})
		return
	}

	err := h.store.CreateConnectedSystem(&system)
	if err != nil {
		log.Printf("Error creating connected system: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create connected system: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, system)
}

func (h *SystemIntegrationHandler) GetConnectedSystemHandler(c *gin.Context) {
	id := c.Param("id")
	system, err := h.store.GetConnectedSystemByID(id)
	if err != nil {
		log.Printf("Error retrieving connected system %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve connected system"})
		return
	}
	if system == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connected system not found"})
		return
	}
	c.JSON(http.StatusOK, system)
}

func (h *SystemIntegrationHandler) GetAllConnectedSystemsHandler(c *gin.Context) {
	systems, err := h.store.GetAllConnectedSystems()
	if err != nil {
		log.Printf("Error retrieving all connected systems: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve connected systems"})
		return
	}
	c.JSON(http.StatusOK, systems)
}

func (h *SystemIntegrationHandler) UpdateConnectedSystemHandler(c *gin.Context) {
	id := c.Param("id")
	var systemUpdates models.ConnectedSystem
	if err := c.ShouldBindJSON(&systemUpdates); err != nil {
		log.Printf("Error binding JSON for updating connected system %s: %v", id, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	if len(systemUpdates.Configuration) > 0 {
		var js json.RawMessage
		if err := json.Unmarshal(systemUpdates.Configuration, &js); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Configuration must be valid JSON: " + err.Error()})
			return
		}
	}

	systemUpdates.ID = id 

	err := h.store.UpdateConnectedSystem(&systemUpdates)
	if err != nil {
		log.Printf("Error updating connected system %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update connected system: " + err.Error()})
		return
	}
	updatedSystem, err := h.store.GetConnectedSystemByID(id)
	if err != nil || updatedSystem == nil {
		log.Printf("Error fetching updated system %s after update: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve updated system details"})
		return
	}
	c.JSON(http.StatusOK, updatedSystem)
}

func (h *SystemIntegrationHandler) DeleteConnectedSystemHandler(c *gin.Context) {
	id := c.Param("id")
	err := h.store.DeleteConnectedSystem(id)
	if err != nil {
		log.Printf("Error deleting connected system %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete connected system"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Connected system deleted successfully"})
}
