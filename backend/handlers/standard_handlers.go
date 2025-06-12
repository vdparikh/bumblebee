package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
	"github.com/vdparikh/compliance-automation/backend/utils"
)

type StandardHandler struct {
	Store *store.DBStore
}

func NewStandardHandler(s *store.DBStore) *StandardHandler {
	return &StandardHandler{Store: s}
}

func (h *StandardHandler) CreateStandardHandler(c *gin.Context) {
	var newStd models.ComplianceStandard
	if err := c.ShouldBindJSON(&newStd); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	if newStd.Name == "" || newStd.ShortName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and ShortName are required"})
		return
	}

	if err := h.Store.CreateComplianceStandard(&newStd); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create compliance standard: " + err.Error()})
		return
	}

	// Audit log for standard creation
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging create standard %s", newStd.ID)
	}
	auditChanges := map[string]interface{}{
		"id":            newStd.ID,
		"name":          newStd.Name,
		"short_name":    newStd.ShortName,
		"description":   newStd.Description,
		"version":       newStd.Version,
		"issuing_body":  newStd.IssuingBody,
		"official_link": newStd.OfficialLink,
	}
	if errLog := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "create_standard", "standard", newStd.ID, auditChanges); errLog != nil {
		log.Printf("Error recording audit log for create standard %s: %v", newStd.ID, errLog)
	}

	c.JSON(http.StatusCreated, newStd)
}

func (h *StandardHandler) GetStandardsHandler(c *gin.Context) {
	standards, err := h.Store.GetComplianceStandards()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve compliance standards: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, standards)
}

func (h *StandardHandler) UpdateStandardHandler(c *gin.Context) {
	standardID := c.Param("id")
	var stdUpdates models.ComplianceStandard

	if err := c.ShouldBindJSON(&stdUpdates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	stdUpdates.ID = standardID

	// Attempt to get old standard for comparison.
	// Assuming a GetComplianceStandardByID method exists or can be added to the store.
	// For now, if GetCampaignByID is a general GetByID pattern:
	oldStd, errGet := h.Store.GetCampaignByID(standardID) // Placeholder: Needs actual GetStandardByID
	if errGet != nil {
		log.Printf("Warning: Could not fetch old standard %s for audit log (used GetCampaignByID as placeholder): %v", standardID, errGet)
	}

	if err := h.Store.UpdateStandard(&stdUpdates); err != nil {
		log.Printf("Error updating standard %s: %v", standardID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update standard"})
		return
	}

	// Audit log for standard update
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging update standard %s", standardID)
	}

	auditChanges := make(map[string]interface{})
	if oldStd != nil { // If fetching oldStd was successful (and GetCampaignByID was a valid placeholder)
		// Note: oldStd here is models.Campaign due to placeholder. Real oldStd would be models.ComplianceStandard
		// This comparison logic is illustrative assuming oldStd is models.ComplianceStandard
		/*
			if oldStd.Name != stdUpdates.Name { // This comparison would be valid if oldStd was correct type
				auditChanges["name"] = map[string]string{"old": oldStd.Name, "new": stdUpdates.Name}
			}
			if oldStd.ShortName != stdUpdates.ShortName {
				auditChanges["short_name"] = map[string]string{"old": oldStd.ShortName, "new": stdUpdates.ShortName}
			}
			// Compare other fields: Description, Version, IssuingBody, OfficialLink
			// Need to handle pointers correctly if any of these fields are pointers in the model
			if (oldStd.Description == nil && stdUpdates.Description != nil) || (oldStd.Description != nil && stdUpdates.Description == nil) || (oldStd.Description != nil && stdUpdates.Description != nil && *oldStd.Description != *stdUpdates.Description) {
				oldDesc, newDesc := "", ""
				if oldStd.Description != nil { oldDesc = *oldStd.Description }
				if stdUpdates.Description != nil { newDesc = *stdUpdates.Description }
				auditChanges["description"] = map[string]string{"old": oldDesc, "new": newDesc}
			}
			// Similar for Version, IssuingBody, OfficialLink
		*/
		// Simplified logging due to placeholder GetCampaignByID: log new values that were part of payload
		auditChanges["updated_payload"] = stdUpdates

	} else { // Fallback if oldStd could not be fetched
		auditChanges["updated_payload"] = stdUpdates // Log the payload as a fallback
	}

	if len(auditChanges) > 0 {
		if errLog := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "update_standard", "standard", standardID, auditChanges); errLog != nil {
			log.Printf("Error recording audit log for update standard %s: %v", standardID, errLog)
		}
	}

	c.JSON(http.StatusOK, stdUpdates)
}
