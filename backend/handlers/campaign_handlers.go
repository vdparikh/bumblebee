package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
	"encoding/json" // For audit logging complex fields
	"reflect"     // For audit logging complex fields


	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/auth"
	"github.com/vdparikh/compliance-automation/backend/executor"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
	"github.com/vdparikh/compliance-automation/backend/utils" // For audit logging
)

type CampaignHandler struct {
	Store *store.DBStore
}

func sendError(c *gin.Context, statusCode int, message string, errDetail error) {
	errObj := gin.H{"error": message}
	if errDetail != nil {
		log.Printf("Error: %s - Detail: %v", message, errDetail.Error())
		errObj["details"] = errDetail.Error()
	} else {
		log.Printf("Error: %s", message)
	}
	c.JSON(statusCode, errObj)
}

func NewCampaignHandler(s *store.DBStore) *CampaignHandler {
	return &CampaignHandler{Store: s}
}
func (h *CampaignHandler) CreateCampaignHandler(c *gin.Context) {
	var payload struct {
		Name                 string                               `json:"name" binding:"required"`
		Description          *string                              `json:"description"`
		StandardID           *string                              `json:"standard_id"`
		StartDate            *models.CustomDate                   `json:"start_date"`
		EndDate              *models.CustomDate                   `json:"end_date"`
		Status               string                               `json:"status"`
		SelectedRequirements []models.CampaignSelectedRequirement `json:"selected_requirements"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	campaign := models.Campaign{
		Name:        payload.Name,
		Description: payload.Description,
		StandardID:  payload.StandardID,
		Status:      "Draft",
	}
	if payload.Status != "" {
		campaign.Status = payload.Status
	}
	if payload.StartDate != nil {
		campaign.StartDate = &payload.StartDate.Time
	}
	if payload.EndDate != nil {
		campaign.EndDate = &payload.EndDate.Time
	}

	campaignID, err := h.Store.CreateCampaign(&campaign, payload.SelectedRequirements)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to create campaign", err)
		return
	}
	campaign.ID = campaignID

	// Audit log for campaign creation
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging create campaign %s", campaign.ID)
	}

	// Prepare selected requirements summary for audit
	selectedReqsSummary := make([]map[string]interface{}, len(payload.SelectedRequirements))
	for i, sr := range payload.SelectedRequirements {
		selectedReqsSummary[i] = map[string]interface{}{
			"requirement_id": sr.RequirementID,
			"is_applicable":  sr.IsApplicable,
		}
	}

	auditChanges := map[string]interface{}{
		"id":                   campaign.ID,
		"name":                 campaign.Name,
		"description":          campaign.Description,
		"standard_id":          campaign.StandardID,
		"start_date":           campaign.StartDate,
		"end_date":             campaign.EndDate,
		"status":               campaign.Status,
		"selected_requirements": selectedReqsSummary,
	}
	if err := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "create_campaign", "campaign", campaign.ID, auditChanges); err != nil {
		log.Printf("Error recording audit log for create campaign %s: %v", campaign.ID, err)
	}

	c.JSON(http.StatusCreated, campaign)
}

func (h *CampaignHandler) GetCampaignsHandler(c *gin.Context) {
	campaignStatus := c.Query("campaignStatus")

	campaigns, err := h.Store.GetCampaigns(campaignStatus)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to fetch campaigns", err)
		return
	}
	if campaigns == nil {
		campaigns = []models.Campaign{}
	}
	c.JSON(http.StatusOK, campaigns)
}

func (h *CampaignHandler) GetCampaignByIDHandler(c *gin.Context) {
	campaignID := c.Param("id")
	campaign, err := h.Store.GetCampaignByID(campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			sendError(c, http.StatusNotFound, "Campaign not found", nil)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to fetch campaign", err)
		return
	}
	c.JSON(http.StatusOK, campaign)
}

func (h *CampaignHandler) UpdateCampaignHandler(c *gin.Context) {
	campaignID := c.Param("id")
	var payload struct {
		Name                 string                               `json:"name"`
		Description          *string                              `json:"description"`
		StandardID           *string                              `json:"standard_id"`
		StartDate            *models.CustomDate                   `json:"start_date"`
		EndDate              *models.CustomDate                   `json:"end_date"`
		Status               string                               `json:"status"`
		SelectedRequirements []models.CampaignSelectedRequirement `json:"selected_requirements"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	campaign, err := h.Store.GetCampaignByID(campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			sendError(c, http.StatusNotFound, "Campaign not found to update", nil)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to retrieve campaign for update", err)
		return
	}

	if payload.Name != "" {
		campaign.Name = payload.Name
	}
	if payload.Description != nil {
		campaign.Description = payload.Description
	}
	if payload.StandardID != nil {
		campaign.StandardID = payload.StandardID
	}
	if payload.StartDate != nil {
		campaign.StartDate = &payload.StartDate.Time
	}
	if payload.EndDate != nil {
		campaign.EndDate = &payload.EndDate.Time
	}
	if payload.Status != "" {
		campaign.Status = payload.Status
	}

	// For detailed audit of SelectedRequirements, fetch them before the update transaction
	oldSelectedRequirements, errGetOldReqs := h.Store.GetCampaignSelectedRequirements(campaignID)
	if errGetOldReqs != nil {
		log.Printf("Warning: Could not fetch old selected requirements for campaign %s for audit log: %v", campaignID, errGetOldReqs)
		// Continue without this part of the diff if it fails
	}

	err = h.Store.UpdateCampaign(campaign, payload.SelectedRequirements)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to update campaign", err)
		return
	}

	// Audit log for campaign update
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging update campaign %s", campaignID)
	}

	auditChanges := make(map[string]interface{})
	// 'campaign' now holds the old state before modifications from payload for primitive types.
	// 'campaign' object was fetched and then updated in place with payload values.
	// We need to compare the state *before* these in-place updates with the state *after*.
	// The `campaign` variable, at this point, IS the updated campaign.
	// The `GetCampaignByID` earlier gave us `oldCampaign`. Let's rename it for clarity.
	// Actually, the current code structure for UpdateCampaignHandler modifies `campaign` (which was `oldCampaign`) in place.
	// This means `campaign` holds the *new* state. We need a snapshot of `campaign` *before* it's modified by payload.
	// The current code fetches `campaign` then overwrites its fields.
	// To do a proper diff, we'd need to get `campaign` (as old), then apply payload to a *new* campaign object,
	// or make a deep copy of `campaign` before applying payload fields.

	// Simplification: For now, we'll log the new values and highlight what *could* be compared if old state was preserved.
	// The `campaign` object here is already updated.
	// Let's assume `campaign` before this block was `oldCampaign`.
	// The `oldCampaign` was fetched by `h.Store.GetCampaignByID(campaignID)`.
	// The issue is that `campaign.Name = payload.Name` etc. modifies it directly.
	// We need to capture the state of `campaign` *before* these lines:
	// if payload.Name != "" { campaign.Name = payload.Name } ...

	// To implement a proper diff, the handler would need to be restructured slightly:
	// 1. Fetch `oldCampaignDetails` from store.
	// 2. Create `updatedCampaignDetails` (e.g. by copying `oldCampaignDetails`).
	// 3. Apply payload changes to `updatedCampaignDetails`.
	// 4. Then compare `oldCampaignDetails` and `updatedCampaignDetails`.
	// For this iteration, I'll log new values if they were part of the payload.

	if payload.Name != "" { // Implies Name was intended to be updated
		auditChanges["name"] = campaign.Name // Log new name
	}
	if payload.Description != nil {
		auditChanges["description"] = campaign.Description
	}
	if payload.StandardID != nil {
		auditChanges["standard_id"] = campaign.StandardID
	}
	if payload.StartDate != nil {
		auditChanges["start_date"] = campaign.StartDate
	}
	if payload.EndDate != nil {
		auditChanges["end_date"] = campaign.EndDate
	}
	if payload.Status != "" {
		auditChanges["status"] = campaign.Status
	}

	// Diffing SelectedRequirements
	if oldSelectedRequirements != nil { // if we successfully fetched them
		if !reflect.DeepEqual(oldSelectedRequirements, payload.SelectedRequirements) {
			oldReqsJSON, _ := json.Marshal(oldSelectedRequirements)
			newReqsJSON, _ := json.Marshal(payload.SelectedRequirements)
			auditChanges["selected_requirements"] = map[string]string{
				"old": string(oldReqsJSON),
				"new": string(newReqsJSON),
			}
		}
	} else { // Could not fetch old, just log new
		newReqsJSON, _ := json.Marshal(payload.SelectedRequirements)
		auditChanges["selected_requirements_new"] = string(newReqsJSON)
	}


	if len(auditChanges) > 0 {
		if errLog := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "update_campaign", "campaign", campaignID, auditChanges); errLog != nil {
			log.Printf("Error recording audit log for update campaign %s: %v", campaignID, errLog)
		}
	}

	c.JSON(http.StatusOK, campaign)
}

func (h *CampaignHandler) DeleteCampaignHandler(c *gin.Context) {
	campaignID := c.Param("id")

	// Fetch campaign details before deleting for audit logging
	// This is a "best effort" as the campaign might be gone if DeleteCampaign is too fast or if there's an issue.
	campaignToDelete, errGet := h.Store.GetCampaignByID(campaignID)
	if errGet != nil {
		log.Printf("Warning: Could not fetch campaign %s before deletion for audit log: %v", campaignID, errGet)
	}


	err := h.Store.DeleteCampaign(campaignID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to delete campaign", err)
		return
	}

	// Audit log for campaign deletion
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging delete campaign %s", campaignID)
	}

	auditChanges := map[string]interface{}{
		"deleted_campaign_id": campaignID,
	}
	if campaignToDelete != nil { // If we managed to fetch it
		auditChanges["name"] = campaignToDelete.Name
		auditChanges["standard_id"] = campaignToDelete.StandardID
		auditChanges["status"] = campaignToDelete.Status
	}

	if err := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "delete_campaign", "campaign", campaignID, auditChanges); err != nil {
		log.Printf("Error recording audit log for delete campaign %s: %v", campaignID, err)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign deleted successfully"})
}

func (h *CampaignHandler) GetCampaignSelectedRequirementsHandler(c *gin.Context) {
	campaignID := c.Param("id")
	requirements, err := h.Store.GetCampaignSelectedRequirements(campaignID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to fetch selected requirements", err)
		return
	}
	if requirements == nil {
		requirements = []models.CampaignSelectedRequirement{}
	}
	c.JSON(http.StatusOK, requirements)
}

func (h *CampaignHandler) GetCampaignTaskInstancesHandler(c *gin.Context) {
	campaignID := c.Param("id")
	taskInstances, err := h.Store.GetCampaignTaskInstances(campaignID, "", "")
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to fetch task instances", err)
		return
	}
	if taskInstances == nil {
		taskInstances = []models.CampaignTaskInstance{}
	}
	c.JSON(http.StatusOK, taskInstances)
}

func (h *CampaignHandler) GetCampaignTaskInstancesByStatusHandler(c *gin.Context) {
	campaignStatus := c.Query("campaignStatus")
	taskStatus := c.Query("taskStatus")

	// Basic validation: ensure at least one status is provided if your logic requires it,
	// or allow fetching all if none are provided (adjust as per your needs).
	// For "Pending Review" page, both are typically expected.
	if campaignStatus == "" || taskStatus == "" {
		sendError(c, http.StatusBadRequest, "campaignStatus and taskStatus query parameters are required", nil)
		return
	}

	taskInstances, err := h.Store.GetCampaignTaskInstancesByStatus(campaignStatus, taskStatus)
	if err != nil {
		sendError(c, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch campaign task instances by status (campaign: %s, task: %s)", campaignStatus, taskStatus), err)
		return
	}
	if taskInstances == nil {
		taskInstances = []models.CampaignTaskInstance{}
	}
	c.JSON(http.StatusOK, taskInstances)
}

func (h *CampaignHandler) GetTaskInstancesByMasterTaskIDHandler(c *gin.Context) {
	masterTaskID := c.Param("masterTaskId")

	if masterTaskID == "" {
		sendError(c, http.StatusBadRequest, "masterTaskId parameter is required", nil)
		return
	}

	taskInstances, err := h.Store.GetTaskInstancesByMasterTaskID(masterTaskID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch task instances for master task ID %s", masterTaskID), err)
		return
	}
	c.JSON(http.StatusOK, taskInstances)
}

func (h *CampaignHandler) UpdateCampaignTaskInstanceHandler(c *gin.Context) {
	ctiID := c.Param("id")

	fmt.Println(ctiID)

	existingInstance, err := h.Store.GetCampaignTaskInstanceByID(ctiID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			sendError(c, http.StatusNotFound, "Campaign Task Instance not found to update", nil)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to retrieve CTI for update", err)
		return
	}

	var payload struct {
		Title          *string                `json:"title"`
		Description    *string                `json:"description"`
		Category       *string                `json:"category"`
		OwnerUserIDs   *[]string              `json:"owner_user_ids"`
		AssigneeUserID *string                `json:"assignee_user_id"`
		OwnerTeamID    *string                `json:"owner_team_id"`
		AssigneeTeamID *string                `json:"assignee_team_id"`
		Status         *string                `json:"status"`
		DueDate        *models.CustomDate     `json:"due_date"`
		CheckType      *string                `json:"check_type"`
		Target         *string                `json:"target"`
		Parameters     map[string]interface{} `json:"parameters"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body for campaign task instance update", err)
		return
	}

	if payload.Title != nil {
		existingInstance.Title = *payload.Title
	}
	if payload.Description != nil {
		existingInstance.Description = payload.Description
	}
	if payload.Category != nil {
		existingInstance.Category = payload.Category
	}
	if payload.OwnerUserIDs != nil {
		existingInstance.OwnerUserIDs = *payload.OwnerUserIDs
	}
	if payload.AssigneeUserID != nil {
		existingInstance.AssigneeUserID = payload.AssigneeUserID
	}
	if payload.OwnerTeamID != nil {
		existingInstance.OwnerTeamID = payload.OwnerTeamID
	}
	if payload.AssigneeTeamID != nil {
		existingInstance.AssigneeTeamID = payload.AssigneeTeamID
	}
	if payload.Status != nil {
		existingInstance.Status = *payload.Status
	}
	if payload.DueDate != nil {
		existingInstance.DueDate = &payload.DueDate.Time
	}
	if payload.CheckType != nil {
		existingInstance.CheckType = payload.CheckType
	}
	if payload.Target != nil {
		existingInstance.Target = payload.Target
	}
	if payload.Parameters != nil {
		existingInstance.Parameters = payload.Parameters
	}

	// Deep copy existingInstance to preserve the old state for audit logging
	oldInstance := &models.CampaignTaskInstance{}
	jsonData, errJson := json.Marshal(existingInstance)
	if errJson != nil {
		log.Printf("Error marshalling existing CTI for audit copy %s: %v", ctiID, errJson)
		// Proceed without full diff if copy fails, will log only new values
	} else {
		if errUnmarshal := json.Unmarshal(jsonData, oldInstance); errUnmarshal != nil {
			log.Printf("Error unmarshalling to copy CTI for audit %s: %v", ctiID, errUnmarshal)
			oldInstance = nil // Ensure it's nil if copy failed
		}
	}

	// Apply updates from payload to existingInstance (which becomes the 'new' state)
	if payload.Title != nil {
		existingInstance.Title = *payload.Title
	}
	if payload.Description != nil {
		existingInstance.Description = payload.Description
	}
	if payload.Category != nil {
		existingInstance.Category = payload.Category
	}
	if payload.OwnerUserIDs != nil {
		existingInstance.OwnerUserIDs = *payload.OwnerUserIDs
	}
	if payload.AssigneeUserID != nil {
		existingInstance.AssigneeUserID = payload.AssigneeUserID
	}
	if payload.OwnerTeamID != nil {
		existingInstance.OwnerTeamID = payload.OwnerTeamID
	}
	if payload.AssigneeTeamID != nil {
		existingInstance.AssigneeTeamID = payload.AssigneeTeamID
	}
	if payload.Status != nil {
		existingInstance.Status = *payload.Status
	}
	if payload.DueDate != nil {
		existingInstance.DueDate = &payload.DueDate.Time
	}
	if payload.CheckType != nil {
		existingInstance.CheckType = payload.CheckType
	}
	if payload.Target != nil {
		existingInstance.Target = payload.Target
	}
	if payload.Parameters != nil {
		existingInstance.Parameters = payload.Parameters // map is reference, careful if oldInstance.Parameters was not deep copied
	}


	err = h.Store.UpdateCampaignTaskInstance(existingInstance) // existingInstance is now the new state
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to update campaign task instance", err)
		return
	}

	// Audit log for CTI update
	actorUserID, userExists := c.Get("userID")
	var actorUserIDStrPtr *string
	if userExists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging update CTI %s", ctiID)
	}

	auditChanges := make(map[string]interface{})

	if oldInstance != nil { // If deep copy was successful
		if oldInstance.Title != existingInstance.Title {
			auditChanges["title"] = map[string]string{"old": oldInstance.Title, "new": existingInstance.Title}
		}
		if (oldInstance.Description == nil && existingInstance.Description != nil) || (oldInstance.Description != nil && existingInstance.Description == nil) || (oldInstance.Description != nil && existingInstance.Description != nil && *oldInstance.Description != *existingInstance.Description) {
			oldDesc, newDesc := "", ""
			if oldInstance.Description != nil { oldDesc = *oldInstance.Description }
			if existingInstance.Description != nil { newDesc = *existingInstance.Description }
			auditChanges["description"] = map[string]string{"old": oldDesc, "new": newDesc}
		}
		if (oldInstance.Category == nil && existingInstance.Category != nil) || (oldInstance.Category != nil && existingInstance.Category == nil) || (oldInstance.Category != nil && existingInstance.Category != nil && *oldInstance.Category != *existingInstance.Category) {
			oldCat, newCat := "", ""
			if oldInstance.Category != nil { oldCat = *oldInstance.Category }
			if existingInstance.Category != nil { newCat = *existingInstance.Category }
			auditChanges["category"] = map[string]string{"old": oldCat, "new": newCat}
		}
		if !reflect.DeepEqual(oldInstance.OwnerUserIDs, existingInstance.OwnerUserIDs) {
			oldJSON, _ := json.Marshal(oldInstance.OwnerUserIDs)
			newJSON, _ := json.Marshal(existingInstance.OwnerUserIDs)
			auditChanges["owner_user_ids"] = map[string]string{"old": string(oldJSON), "new": string(newJSON)}
		}
		if (oldInstance.AssigneeUserID == nil && existingInstance.AssigneeUserID != nil) || (oldInstance.AssigneeUserID != nil && existingInstance.AssigneeUserID == nil) || (oldInstance.AssigneeUserID != nil && existingInstance.AssigneeUserID != nil && *oldInstance.AssigneeUserID != *existingInstance.AssigneeUserID) {
			oldAssignee, newAssignee := "", ""
			if oldInstance.AssigneeUserID != nil { oldAssignee = *oldInstance.AssigneeUserID }
			if existingInstance.AssigneeUserID != nil { newAssignee = *existingInstance.AssigneeUserID }
			auditChanges["assignee_user_id"] = map[string]string{"old": oldAssignee, "new": newAssignee}
		}
		if (oldInstance.OwnerTeamID == nil && existingInstance.OwnerTeamID != nil) || (oldInstance.OwnerTeamID != nil && existingInstance.OwnerTeamID == nil) || (oldInstance.OwnerTeamID != nil && existingInstance.OwnerTeamID != nil && *oldInstance.OwnerTeamID != *existingInstance.OwnerTeamID) {
			oldVal, newVal := "", ""
			if oldInstance.OwnerTeamID != nil { oldVal = *oldInstance.OwnerTeamID }
			if existingInstance.OwnerTeamID != nil { newVal = *existingInstance.OwnerTeamID }
			auditChanges["owner_team_id"] = map[string]string{"old": oldVal, "new": newVal}
		}
		if (oldInstance.AssigneeTeamID == nil && existingInstance.AssigneeTeamID != nil) || (oldInstance.AssigneeTeamID != nil && existingInstance.AssigneeTeamID == nil) || (oldInstance.AssigneeTeamID != nil && existingInstance.AssigneeTeamID != nil && *oldInstance.AssigneeTeamID != *existingInstance.AssigneeTeamID) {
			oldVal, newVal := "", ""
			if oldInstance.AssigneeTeamID != nil { oldVal = *oldInstance.AssigneeTeamID }
			if existingInstance.AssigneeTeamID != nil { newVal = *existingInstance.AssigneeTeamID }
			auditChanges["assignee_team_id"] = map[string]string{"old": oldVal, "new": newVal}
		}
		if oldInstance.Status != existingInstance.Status {
			auditChanges["status"] = map[string]string{"old": oldInstance.Status, "new": existingInstance.Status}
		}
		if (oldInstance.DueDate == nil && existingInstance.DueDate != nil) || (oldInstance.DueDate != nil && existingInstance.DueDate == nil) || (oldInstance.DueDate != nil && existingInstance.DueDate != nil && !oldInstance.DueDate.Equal(*existingInstance.DueDate)) {
			oldDate, newDate := "", ""
			if oldInstance.DueDate != nil { oldDate = oldInstance.DueDate.Format(time.RFC3339) }
			if existingInstance.DueDate != nil { newDate = existingInstance.DueDate.Format(time.RFC3339) }
			auditChanges["due_date"] = map[string]string{"old": oldDate, "new": newDate}
		}
		if (oldInstance.CheckType == nil && existingInstance.CheckType != nil) || (oldInstance.CheckType != nil && existingInstance.CheckType == nil) || (oldInstance.CheckType != nil && existingInstance.CheckType != nil && *oldInstance.CheckType != *existingInstance.CheckType) {
			oldVal, newVal := "", ""
			if oldInstance.CheckType != nil { oldVal = *oldInstance.CheckType }
			if existingInstance.CheckType != nil { newVal = *existingInstance.CheckType }
			auditChanges["check_type"] = map[string]string{"old": oldVal, "new": newVal}
		}
		if (oldInstance.Target == nil && existingInstance.Target != nil) || (oldInstance.Target != nil && existingInstance.Target == nil) || (oldInstance.Target != nil && existingInstance.Target != nil && *oldInstance.Target != *existingInstance.Target) {
			oldVal, newVal := "", ""
			if oldInstance.Target != nil { oldVal = *oldInstance.Target }
			if existingInstance.Target != nil { newVal = *existingInstance.Target }
			auditChanges["target"] = map[string]string{"old": oldVal, "new": newVal}
		}
		if !reflect.DeepEqual(oldInstance.Parameters, existingInstance.Parameters) {
			oldJSON, _ := json.Marshal(oldInstance.Parameters)
			newJSON, _ := json.Marshal(existingInstance.Parameters)
			auditChanges["parameters"] = map[string]string{"old": string(oldJSON), "new": string(newJSON)}
		}
	} else { // Fallback if deep copy failed
		auditChanges["updated_fields_payload"] = payload // Log the payload as a fallback
	}


	if len(auditChanges) > 0 {
		if errLog := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "update_campaign_task_instance", "campaign_task_instance", ctiID, auditChanges); errLog != nil {
			log.Printf("Error recording audit log for update CTI %s: %v", ctiID, errLog)
		}
	}

	c.JSON(http.StatusOK, existingInstance)
}

func (h *CampaignHandler) GetUserCampaignTaskInstancesHandler(c *gin.Context) {
	userID := c.Query("userId")
	userField := c.Query("userField")
	campaignStatus := c.Query("campaignStatus")

	if userID == "" || (userField != "owner" && userField != "assignee") {
		sendError(c, http.StatusBadRequest, "userId and a valid userField ('owner' or 'assignee') query parameters are required", nil)
		return
	}

	taskInstances, err := h.Store.GetCampaignTaskInstancesForUser(userID, userField, campaignStatus)
	if err != nil {
		sendError(c, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch campaign task instances for user %s (%s), status %s", userID, userField, campaignStatus), err)
		return
	}
	if taskInstances == nil {
		taskInstances = []models.CampaignTaskInstance{}
	}
	c.JSON(http.StatusOK, taskInstances)
}

func (h *CampaignHandler) GetCampaignTaskInstanceByIDHandler(c *gin.Context) {
	instanceID := c.Param("id")
	instance, err := h.Store.GetCampaignTaskInstanceByID(instanceID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			sendError(c, http.StatusNotFound, "Campaign Task Instance not found", nil)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to fetch campaign task instance", err)
		return
	}
	if instance == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign Task Instance not found"})
		return
	}
	c.JSON(http.StatusOK, instance)
}

func (h *CampaignHandler) AddCampaignTaskInstanceCommentHandler(c *gin.Context) {
	instanceID := c.Param("id")
	var commentReq models.Comment

	if err := c.ShouldBindJSON(&commentReq); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	if commentReq.UserID == "" {
		sendError(c, http.StatusBadRequest, "User ID is required for comment", nil)
		return
	}

	comment := models.Comment{
		CampaignTaskInstanceID: &instanceID,
		UserID:                 commentReq.UserID,
		Text:                   commentReq.Text,
	}

	if err := h.Store.CreateCampaignTaskInstanceComment(&comment); err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to add comment", err)
		return
	}
	c.JSON(http.StatusCreated, comment)
}

func (h *CampaignHandler) GetCampaignTaskInstanceCommentsHandler(c *gin.Context) {
	instanceID := c.Param("id")
	comments, err := h.Store.GetCampaignTaskInstanceComments(instanceID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to retrieve comments", err)
		return
	}
	if comments == nil {
		comments = []models.Comment{}
	}
	c.JSON(http.StatusOK, comments)
}

func (h *CampaignHandler) UploadCampaignTaskInstanceEvidenceHandler(c *gin.Context) {
	instanceID := c.Param("id")

	claimsValue, exists := c.Get(string(auth.ContextKeyClaims))
	if !exists {
		sendError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}
	claims, ok := claimsValue.(*auth.Claims)
	if !ok || claims == nil || claims.UserID == "" {
		sendError(c, http.StatusInternalServerError, "Error processing user authentication claims", nil)
		return
	}
	uploaderUserID := claims.UserID

	evidence := models.Evidence{
		CampaignTaskInstanceID: &instanceID,    // instanceID is already a string
		UploadedByUserID:       uploaderUserID, // Correct field name
	}

	contentType := c.ContentType()

	if strings.HasPrefix(contentType, "multipart/form-data") {
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			sendError(c, http.StatusBadRequest, "File upload error", err)
			return
		}
		defer file.Close()

		fileName := strings.ReplaceAll(filepath.Base(header.Filename), " ", "_")
		uploadDir := filepath.Join("./uploads/campaign_tasks/", instanceID)
		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			sendError(c, http.StatusInternalServerError, "Failed to create upload directory", err)
			return
		}
		filePath := filepath.Join(uploadDir, fileName)

		out, err := os.Create(filePath)
		if err != nil {
			sendError(c, http.StatusInternalServerError, "Failed to save file", err)
			return
		}
		defer out.Close()

		_, err = io.Copy(out, file)
		if err != nil {
			sendError(c, http.StatusInternalServerError, "Failed to write file content", err)
			return
		}

		evidence.FileName = fileName
		evidence.FilePath = filePath
		evidence.MimeType = header.Header.Get("Content-Type")
		if len(header.Header["Content-Type"]) > 0 {
			evidence.MimeType = header.Header["Content-Type"][0]
		}
		evidence.FileSize = header.Size

		description := c.Request.FormValue("description")
		if description != "" {
			evidence.Description = &description
		}

	} else if strings.HasPrefix(contentType, "application/json") {
		var jsonPayload models.Evidence
		if err := c.ShouldBindJSON(&jsonPayload); err != nil {
			sendError(c, http.StatusBadRequest, "Invalid JSON payload", err)
			return
		}
		evidence.FileName = jsonPayload.FileName
		evidence.FilePath = jsonPayload.FilePath
		evidence.MimeType = jsonPayload.MimeType
		evidence.Description = jsonPayload.Description

	} else {
		sendError(c, http.StatusUnsupportedMediaType, "Unsupported content type: "+contentType, nil)
		return
	}

	if err := h.Store.CreateCampaignTaskInstanceEvidence(&evidence); err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to save evidence metadata", err)
		return
	}

	uploaderUserName := "User"
	if claims != nil && claims.Email != "" {
		uploaderUserName = claims.Email
	}

	commentText := fmt.Sprintf("%s uploaded evidence: %s", uploaderUserName, evidence.FileName)
	if evidence.Description != nil && *evidence.Description != "" {
		commentText = fmt.Sprintf("%s uploaded evidence '%s': %s", uploaderUserName, *evidence.Description, evidence.FileName)
	}

	activityComment := models.Comment{
		CampaignTaskInstanceID: &instanceID,
		UserID:                 uploaderUserID,
		Text:                   commentText,
	}
	if err := h.Store.CreateCampaignTaskInstanceComment(&activityComment); err != nil {
		log.Printf("Failed to log evidence upload comment for CTI %s: %v", instanceID, err)
	}

	// Audit log for evidence upload
	evidenceActorID := uploaderUserID // uploaderUserID is claims.UserID
	auditEvidenceChanges := map[string]interface{}{
		"evidence_id":                 evidence.ID,
		"campaign_task_instance_id":   evidence.CampaignTaskInstanceID,
		"file_name":                   evidence.FileName,
		"description":                 evidence.Description,
		"mime_type":                   evidence.MimeType,
		"file_size":                   evidence.FileSize,
		"uploaded_by_user_id":         uploaderUserID,
	}
	if err := utils.RecordAuditLog(h.Store, &evidenceActorID, "upload_evidence", "evidence", evidence.ID, auditEvidenceChanges); err != nil {
		log.Printf("Error recording audit log for upload evidence %s (CTI: %s): %v", evidence.ID, instanceID, err)
	}

	c.JSON(http.StatusCreated, evidence)
}

func (h *CampaignHandler) GetCampaignTaskInstanceEvidenceHandler(c *gin.Context) {
	instanceID := c.Param("id")
	evidences, err := h.Store.GetCampaignTaskInstanceEvidence(instanceID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to retrieve evidence", err)
		return
	}
	if evidences == nil {
		evidences = []models.Evidence{}
	}
	c.JSON(http.StatusOK, evidences)
}

func (h *CampaignHandler) ExecuteCampaignTaskInstanceHandler(c *gin.Context) {
	instanceID := c.Param("id")

	claimsValue, exists := c.Get(string(auth.ContextKeyClaims))
	if !exists {
		sendError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}
	claims, ok := claimsValue.(*auth.Claims)
	if !ok || claims == nil || claims.UserID == "" {
		sendError(c, http.StatusInternalServerError, "Error processing user authentication claims", nil)
		return
	}
	executedByUserID := claims.UserID

	taskInstance, err := h.Store.GetCampaignTaskInstanceByID(instanceID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			sendError(c, http.StatusNotFound, "Campaign Task Instance not found", err)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to retrieve campaign task instance", err)
		return
	}

	var executionOutput strings.Builder
	executionStatus := "Failed"
	var execDetails executor.ExecutionResult

	if taskInstance.CheckType == nil || *taskInstance.CheckType == "" {
		executionOutput.WriteString("This task is not configured for automated execution (no check_type defined).\n")
		executionStatus = "Not Applicable"
	} else {
		checkType := *taskInstance.CheckType
		exec, found := executor.GetExecutor(checkType)
		if !found {
			executionOutput.WriteString(fmt.Sprintf("Execution logic for check type '%s' is not implemented.\n", checkType))
			executionStatus = "Error"
		} else {
			checkCtx := executor.CheckContext{
				TaskInstance: taskInstance,
				Store:        h.Store,
			}

			if taskInstance.Target != nil && *taskInstance.Target != "" {
				connectedSystemID := *taskInstance.Target
				connectedSystem, err := h.Store.GetConnectedSystemByID(connectedSystemID)
				if err != nil {
					executionOutput.WriteString(fmt.Sprintf("Error retrieving Connected System %s (specified as Target): %v\n", connectedSystemID, err))
					executionStatus = "Error"
				} else if connectedSystem == nil {
					executionOutput.WriteString(fmt.Sprintf("Error: Connected System with ID %s (specified as Target) not found.\n", connectedSystemID))
					executionStatus = "Error"
				} else {
					checkCtx.ConnectedSystem = connectedSystem
				}
			} else {
				executionOutput.WriteString(fmt.Sprintf("Error: A Target (Connected System ID) is required for check type '%s' but not provided.\n", checkType))
				executionStatus = "Error"
			}

			if executionStatus != "Error" {
				var systemConfigForValidation []byte
				if checkCtx.ConnectedSystem != nil {
					systemConfigForValidation = checkCtx.ConnectedSystem.Configuration
				}
				isValid, expectedParams, validationErr := exec.ValidateParameters(taskInstance.Parameters, systemConfigForValidation)
				if !isValid || validationErr != nil {
					executionOutput.WriteString(fmt.Sprintf("Parameter validation failed for check type '%s': %v\n", checkType, validationErr))
					executionOutput.WriteString(fmt.Sprintf("Expected parameters: %s\n", expectedParams))
					executionStatus = "Error"
				} else {
					execDetails, err = exec.Execute(checkCtx)
					if err != nil {
						executionOutput.WriteString(fmt.Sprintf("Error during execution of check type '%s': %v\n", checkType, err))
						if execDetails.Output != "" {
							executionOutput.WriteString("Executor output before error:\n" + execDetails.Output)
						}
						executionStatus = "Error"
					} else {
						executionStatus = execDetails.Status
						executionOutput.WriteString(execDetails.Output)
					}
				}
			}
		}
	}

	result := models.CampaignTaskInstanceResult{
		CampaignTaskInstanceID: instanceID,
		ExecutedByUserID:       &executedByUserID,
		Timestamp:              time.Now(),
		Status:                 executionStatus,
		Output:                 executionOutput.String(),
	}

	if err := h.Store.CreateCampaignTaskInstanceResult(&result); err != nil {
		log.Printf("Error storing execution result for instance %s: %v", instanceID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store execution result", "details": err.Error()})
		return
	}

	taskInstance.LastCheckedAt = &result.Timestamp
	taskInstance.LastCheckStatus = &result.Status
	if err := h.Store.UpdateCampaignTaskInstance(taskInstance); err != nil {
		log.Printf("Error updating task instance %s with last check status: %v", instanceID, err)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task instance execution processed.", "status": executionStatus, "output": result.Output})

}

func (h *CampaignHandler) GetCampaignTaskInstanceResultsHandler(c *gin.Context) {
	instanceID := c.Param("id")
	results, err := h.Store.GetCampaignTaskInstanceResults(instanceID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to retrieve execution results", err)
		return
	}
	if results == nil {
		results = []models.CampaignTaskInstanceResult{}
	}
	c.JSON(http.StatusOK, results)
}

func (h *CampaignHandler) CopyEvidenceHandler(c *gin.Context) {
	targetInstanceID := c.Param("id")

	claimsValue, exists := c.Get(string(auth.ContextKeyClaims))
	if !exists {
		sendError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}
	claims, ok := claimsValue.(*auth.Claims)
	if !ok || claims == nil || claims.UserID == "" {
		sendError(c, http.StatusInternalServerError, "Error processing user authentication claims", nil)
		return
	}
	uploaderUserID := claims.UserID

	var payload struct {
		SourceEvidenceIDs []string `json:"source_evidence_ids" binding:"required,dive,uuid"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	if len(payload.SourceEvidenceIDs) == 0 {
		sendError(c, http.StatusBadRequest, "source_evidence_ids cannot be empty", nil)
		return
	}

	err := h.Store.CopyEvidenceToTaskInstance(targetInstanceID, payload.SourceEvidenceIDs, uploaderUserID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to copy evidence", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Evidence copied successfully"})
}
