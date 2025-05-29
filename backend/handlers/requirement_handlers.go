package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

// RequirementHandler holds the store for database operations.
type RequirementHandler struct {
	Store *store.DBStore
}

// NewRequirementHandler creates a new RequirementHandler.
func NewRequirementHandler(s *store.DBStore) *RequirementHandler {
	return &RequirementHandler{Store: s}
}

// CreateRequirementHandler handles the creation of new requirements.
func (h *RequirementHandler) CreateRequirementHandler(c *gin.Context) {
	var newReq models.Requirement
	if err := c.ShouldBindJSON(&newReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	// Basic validation
	if newReq.StandardID == "" || newReq.RequirementText == "" || newReq.ControlIDReference == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "StandardID, RequirementText, and ControlIDReference are required"})
		return
	}

	if err := h.Store.CreateRequirement(&newReq); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create requirement: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newReq)
}

// GetRequirementsHandler lists all requirements.
func (h *RequirementHandler) GetRequirementsHandler(c *gin.Context) {
	requirements, err := h.Store.GetRequirements()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve requirements: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, requirements)
}

func (h *RequirementHandler) GetRequirementByIDHandler(c *gin.Context) {
	requirementID := c.Param("id")
	if requirementID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Requirement ID is missing in URL path"})
		return
	}

	requirement, err := h.Store.GetRequirementByID(requirementID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Requirement not found"})
			return
		}
		// Log the error for server-side inspection if you have a logger setup
		// log.Printf("Error fetching requirement by ID %s: %v", requirementID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve requirement"})
		return
	}

	// If requirement is nil (though sql.ErrNoRows should cover this), also treat as not found.
	c.JSON(http.StatusOK, requirement)
}

// UpdateRequirementHandler handles PUT requests to update an existing requirement.
func (h *RequirementHandler) UpdateRequirementHandler(c *gin.Context) {
	requirementID := c.Param("id")
	var reqUpdates models.Requirement

	if err := c.ShouldBindJSON(&reqUpdates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Ensure ID from path is used, not from body if present
	reqUpdates.ID = requirementID

	// Optional: Fetch existing to verify it exists before update, or rely on DB constraints
	// existingReq, err := h.Store.GetRequirementByID(requirementID)
	// if err != nil || existingReq == nil { ... handle not found ... }

	if err := h.Store.UpdateRequirement(&reqUpdates); err != nil {
		log.Printf("Error updating requirement %s: %v", requirementID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update requirement"})
		return
	}
	c.JSON(http.StatusOK, reqUpdates) // Return the updated object
}
