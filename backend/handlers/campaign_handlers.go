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

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/auth"
	"github.com/vdparikh/compliance-automation/backend/executor"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
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

	err = h.Store.UpdateCampaign(campaign, payload.SelectedRequirements)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to update campaign", err)
		return
	}
	c.JSON(http.StatusOK, campaign)
}

func (h *CampaignHandler) DeleteCampaignHandler(c *gin.Context) {
	campaignID := c.Param("id")
	err := h.Store.DeleteCampaign(campaignID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to delete campaign", err)
		return
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

	err = h.Store.UpdateCampaignTaskInstance(existingInstance)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to update campaign task instance", err)
		return
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
