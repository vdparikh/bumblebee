package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
	"github.com/vdparikh/compliance-automation/backend/utils"
)

type RequirementHandler struct {
	Store *store.DBStore
}

func NewRequirementHandler(s *store.DBStore) *RequirementHandler {
	return &RequirementHandler{Store: s}
}

func (h *RequirementHandler) CreateRequirementHandler(c *gin.Context) {
	var newReq models.Requirement
	if err := c.ShouldBindJSON(&newReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	if newReq.StandardID == "" || newReq.RequirementText == "" || newReq.ControlIDReference == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "StandardID, RequirementText, and ControlIDReference are required"})
		return
	}

	if err := h.Store.CreateRequirement(&newReq); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create requirement: " + err.Error()})
		return
	}

	// Audit log for requirement creation
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging create requirement %s", newReq.ID)
	}
	auditChanges := map[string]interface{}{
		"id":                   newReq.ID,
		"standard_id":          newReq.StandardID,
		"control_id_reference": newReq.ControlIDReference,
		"requirement_text":     newReq.RequirementText,
	}
	if errLog := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "create_requirement", "requirement", newReq.ID, auditChanges); errLog != nil {
		log.Printf("Error recording audit log for create requirement %s: %v", newReq.ID, errLog)
	}

	c.JSON(http.StatusCreated, newReq)
}

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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve requirement"})
		return
	}

	c.JSON(http.StatusOK, requirement)
}

func (h *RequirementHandler) UpdateRequirementHandler(c *gin.Context) {
	requirementID := c.Param("id")
	var reqUpdates models.Requirement

	if err := c.ShouldBindJSON(&reqUpdates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	reqUpdates.ID = requirementID

	// Get old requirement for comparison
	oldReq, errGet := h.Store.GetRequirementByID(requirementID)
	if errGet != nil {
		log.Printf("Warning: Could not fetch old requirement %s for audit log: %v", requirementID, errGet)
		// Proceed with update, but audit log might not have old values if this fails
	}

	if err := h.Store.UpdateRequirement(&reqUpdates); err != nil {
		log.Printf("Error updating requirement %s: %v", requirementID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update requirement"})
		return
	}

	// Audit log for requirement update
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging update requirement %s", requirementID)
	}

	auditChanges := make(map[string]interface{})
	if oldReq != nil { // If fetching oldReq was successful
		if oldReq.StandardID != reqUpdates.StandardID {
			auditChanges["standard_id"] = map[string]string{"old": oldReq.StandardID, "new": reqUpdates.StandardID}
		}
		if oldReq.ControlIDReference != reqUpdates.ControlIDReference {
			auditChanges["control_id_reference"] = map[string]string{"old": oldReq.ControlIDReference, "new": reqUpdates.ControlIDReference}
		}
		if oldReq.RequirementText != reqUpdates.RequirementText {
			auditChanges["requirement_text"] = map[string]string{"old": oldReq.RequirementText, "new": reqUpdates.RequirementText}
		}
	} else { // Fallback if oldReq could not be fetched
		auditChanges["updated_fields_payload"] = reqUpdates // Log the payload as a fallback
	}

	if len(auditChanges) > 0 {
		if errLog := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "update_requirement", "requirement", requirementID, auditChanges); errLog != nil {
			log.Printf("Error recording audit log for update requirement %s: %v", requirementID, errLog)
		}
	}

	c.JSON(http.StatusOK, reqUpdates)
}
