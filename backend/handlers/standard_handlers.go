package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

// StandardHandler holds the store for database operations.
type StandardHandler struct {
	Store *store.DBStore
}

// NewStandardHandler creates a new StandardHandler.
func NewStandardHandler(s *store.DBStore) *StandardHandler {
	return &StandardHandler{Store: s}
}

// CreateStandardHandler handles the creation of new compliance standards.
func (h *StandardHandler) CreateStandardHandler(c *gin.Context) {
	var newStd models.ComplianceStandard
	if err := c.ShouldBindJSON(&newStd); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	// Basic validation
	if newStd.Name == "" || newStd.ShortName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and ShortName are required"})
		return
	}

	if err := h.Store.CreateComplianceStandard(&newStd); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create compliance standard: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newStd)
}

// GetStandardsHandler lists all compliance standards.
func (h *StandardHandler) GetStandardsHandler(c *gin.Context) {
	standards, err := h.Store.GetComplianceStandards()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve compliance standards: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, standards)
}

// UpdateStandardHandler handles PUT requests to update an existing standard.
func (h *StandardHandler) UpdateStandardHandler(c *gin.Context) {
	standardID := c.Param("id")
	var stdUpdates models.ComplianceStandard

	if err := c.ShouldBindJSON(&stdUpdates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	stdUpdates.ID = standardID

	if err := h.Store.UpdateStandard(&stdUpdates); err != nil {
		log.Printf("Error updating standard %s: %v", standardID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update standard"})
		return
	}
	c.JSON(http.StatusOK, stdUpdates)
}
