package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
	// For audit logging
)

type RiskHandler struct {
	Store *store.DBStore
}

func NewRiskHandler(s *store.DBStore) *RiskHandler {
	return &RiskHandler{Store: s}
}

func (h *RiskHandler) CreateRiskHandler(c *gin.Context) {
	var risk models.Risk
	if err := c.ShouldBindJSON(&risk); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body for risk", err)
		return
	}

	if risk.RiskID == "" || risk.Title == "" {
		sendError(c, http.StatusBadRequest, "Risk ID and Title are required", nil)
		return
	}

	riskID, err := h.Store.CreateRisk(&risk)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to create risk", err)
		return
	}
	risk.ID = riskID // Set the generated UUID

	// actorUserID, _ := c.Get("userID")
	// utils.RecordAuditLog(h.Store, utils.ActorIDToStringPtr(actorUserI/D), "create_risk", "risk", risk.ID, risk)

	c.JSON(http.StatusCreated, risk)
}

func (h *RiskHandler) GetRisksHandler(c *gin.Context) {
	risks, err := h.Store.GetRisks()
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to fetch risks", err)
		return
	}
	if risks == nil {
		risks = []models.Risk{}
	}
	c.JSON(http.StatusOK, risks)
}

func (h *RiskHandler) GetRiskByIDHandler(c *gin.Context) {
	riskID := c.Param("id")
	risk, err := h.Store.GetRiskByID(riskID)
	if err != nil {
		if err == store.ErrNotFound {
			sendError(c, http.StatusNotFound, "Risk not found", nil)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to fetch risk", err)
		return
	}
	c.JSON(http.StatusOK, risk)
}

func (h *RiskHandler) UpdateRiskHandler(c *gin.Context) {
	riskID := c.Param("id")
	var riskUpdates models.Risk
	if err := c.ShouldBindJSON(&riskUpdates); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body for risk update", err)
		return
	}

	riskUpdates.ID = riskID // Ensure ID from path is used

	// Fetch old risk for audit diff
	// oldRisk, _ := h.Store.GetRiskByID(riskID)

	err := h.Store.UpdateRisk(&riskUpdates)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to update risk", err)
		return
	}

	// actorUserID, _ := c.Get("userID")
	// auditChanges := utils.CreateDiff(oldRisk, riskUpdates) // You'd need a diff utility
	// utils.RecordAuditLog(h.Store, utils.ActorIDToStringPtr(actorUserID), "update_risk", "risk", riskID, auditChanges)

	updatedRisk, _ := h.Store.GetRiskByID(riskID) // Fetch again to return full object
	c.JSON(http.StatusOK, updatedRisk)
}

func (h *RiskHandler) DeleteRiskHandler(c *gin.Context) {
	riskID := c.Param("id")
	// oldRisk, _ := h.Store.GetRiskByID(riskID) // For audit

	err := h.Store.DeleteRisk(riskID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to delete risk", err)
		return
	}

	// actorUserID, _ := c.Get("userID")
	// utils.RecordAuditLog(h.Store, utils.ActorIDToStringPtr(actorUserID), "delete_risk", "risk", riskID, oldRisk)

	c.JSON(http.StatusOK, gin.H{"message": "Risk deleted successfully"})
}
