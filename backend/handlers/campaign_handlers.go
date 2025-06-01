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
	"github.com/vdparikh/compliance-automation/backend/auth"     // Import for auth claims
	"github.com/vdparikh/compliance-automation/backend/executor" // New executor package
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

type CampaignHandler struct {
	Store *store.DBStore
}

// sendError is a helper function to standardize error responses.
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
		StartDate            *models.CustomDate                   `json:"start_date"` // Using CustomDate for flexible parsing
		EndDate              *models.CustomDate                   `json:"end_date"`
		Status               string                               `json:"status"` // Defaulted in DB if not provided
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
		Status:      "Draft", // Default status or take from payload if allowed
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
	campaign.ID = campaignID // Set the returned ID
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
		campaigns = []models.Campaign{} // Return empty array instead of null
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
		Name                 string                               `json:"name"` // Allow partial updates
		Description          *string                              `json:"description"`
		StandardID           *string                              `json:"standard_id"`
		StartDate            *models.CustomDate                   `json:"start_date"`
		EndDate              *models.CustomDate                   `json:"end_date"`
		Status               string                               `json:"status"`
		SelectedRequirements []models.CampaignSelectedRequirement `json:"selected_requirements"` // For updating scope
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	// Fetch existing campaign to apply updates
	campaign, err := h.Store.GetCampaignByID(campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			sendError(c, http.StatusNotFound, "Campaign not found to update", nil)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to retrieve campaign for update", err)
		return
	}

	// Apply updates from payload
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

	// Note: Updating selected_requirements might involve complex logic:
	// - Adding new ones
	// - Removing old ones not in the payload
	// - Updating applicability of existing ones
	// This is simplified here; a more robust solution would handle these cases in the store.
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
	// Potentially add filters like userID for owner/assignee from query params
	// userID := c.Query("userId")
	// userField := c.Query("userField")
	taskInstances, err := h.Store.GetCampaignTaskInstances(campaignID, "", "") // Add userID, userField if filtering
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

	// 1. Fetch the existing instance
	existingInstance, err := h.Store.GetCampaignTaskInstanceByID(ctiID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			sendError(c, http.StatusNotFound, "Campaign Task Instance not found to update", nil)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to retrieve CTI for update", err)
		return
	}

	// 2. Define a payload struct with pointers for all updatable fields
	// This helps distinguish between a field not sent and a field sent with a value (e.g., empty string or null)
	var payload struct {
		Title          *string                `json:"title"`
		Description    *string                `json:"description"`
		Category       *string                `json:"category"`
		OwnerUserIDs   *[]string              `json:"owner_user_ids"` // Changed to slice for multiple owners
		AssigneeUserID *string                `json:"assignee_user_id"`
		Status         *string                `json:"status"`
		DueDate        *models.CustomDate     `json:"due_date"` // CustomDate handles null from JSON
		CheckType      *string                `json:"check_type"`
		Target         *string                `json:"target"`
		Parameters     map[string]interface{} `json:"parameters"` // For maps, check if key exists or map is nil in payload
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body for campaign task instance update", err)
		return
	}

	// 3. Apply updates from payload to the existingInstance if the payload field is not nil
	if payload.Title != nil {
		existingInstance.Title = *payload.Title // Title is string in model
	}
	if payload.Description != nil { // Description is *string in model
		existingInstance.Description = payload.Description
	}
	if payload.Category != nil { // Category is *string in model
		existingInstance.Category = payload.Category
	}
	// Handle multiple owners - existingInstance.OwnerUserIDs will be used by the store method
	if payload.OwnerUserIDs != nil {
		// The store method will handle the logic of updating the junction table
		existingInstance.OwnerUserIDs = *payload.OwnerUserIDs
	}
	if payload.AssigneeUserID != nil {
		existingInstance.AssigneeUserID = payload.AssigneeUserID
	}
	if payload.Status != nil {
		existingInstance.Status = *payload.Status // Status is string in model
	}
	if payload.DueDate != nil { // DueDate is *time.Time in model
		existingInstance.DueDate = &payload.DueDate.Time
	}
	if payload.CheckType != nil {
		existingInstance.CheckType = payload.CheckType
	}
	if payload.Target != nil {
		existingInstance.Target = payload.Target
	}
	if payload.Parameters != nil { // Check if the key "parameters" was in the JSON
		existingInstance.Parameters = payload.Parameters
	}

	// 4. Save the updated existingInstance
	// The store method already updates all fields of the passed struct.
	err = h.Store.UpdateCampaignTaskInstance(existingInstance)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to update campaign task instance", err)
		return
	}

	// Fetch the updated instance to return it
	c.JSON(http.StatusOK, existingInstance)
}

// GetUserCampaignTaskInstancesHandler fetches all campaign task instances for a specific user.
// Expects query parameters: userId and userField (owner or assignee)
func (h *CampaignHandler) GetUserCampaignTaskInstancesHandler(c *gin.Context) {
	userID := c.Query("userId")
	userField := c.Query("userField")           // "owner" or "assignee"
	campaignStatus := c.Query("campaignStatus") // New parameter

	if userID == "" || (userField != "owner" && userField != "assignee") {
		sendError(c, http.StatusBadRequest, "userId and a valid userField ('owner' or 'assignee') query parameters are required", nil)
		return
	}

	// Pass campaignStatus to the store method
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
	if instance == nil { // Should be caught by sql.ErrNoRows, but as a safeguard
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign Task Instance not found"})
		return
	}
	c.JSON(http.StatusOK, instance)
}

// --- Campaign Task Instance Comment Handlers ---

func (h *CampaignHandler) AddCampaignTaskInstanceCommentHandler(c *gin.Context) {
	instanceID := c.Param("id")
	var commentReq models.Comment

	if err := c.ShouldBindJSON(&commentReq); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	if commentReq.UserID == "" {
		// In a real app, get UserID from authenticated session/token
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
	// Fetch the comment again to get user_name and other DB-generated fields
	// For simplicity, we'll rely on the frontend to refetch or manage this.
	// Or, the Create method could return the full object.
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

// --- Campaign Task Instance Evidence Handlers ---

func (h *CampaignHandler) UploadCampaignTaskInstanceEvidenceHandler(c *gin.Context) {
	instanceID := c.Param("id")

	// Get uploaderUserID from authenticated user claims
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
		CampaignTaskInstanceID: &instanceID,
		UploaderUserID:         uploaderUserID,
	}

	contentType := c.ContentType()

	if strings.HasPrefix(contentType, "multipart/form-data") {
		// Handle file upload
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			sendError(c, http.StatusBadRequest, "File upload error", err)
			return
		}
		defer file.Close()

		fileName := strings.ReplaceAll(filepath.Base(header.Filename), " ", "_")
		uploadDir := filepath.Join("./uploads/campaign_tasks/", instanceID) // Use filepath.Join for OS-agnostic paths
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
		evidence.MimeType = header.Header.Get("Content-Type") // This is the multipart content type, better to get from file header
		if len(header.Header["Content-Type"]) > 0 {
			evidence.MimeType = header.Header["Content-Type"][0]
		}
		evidence.FileSize = header.Size

		// Get description from form data if provided
		description := c.Request.FormValue("description")
		if description != "" {
			evidence.Description = &description
		}

	} else if strings.HasPrefix(contentType, "application/json") {
		// Handle JSON payload for link or text
		var jsonPayload models.Evidence // Assuming frontend sends fields matching models.Evidence for link/text
		if err := c.ShouldBindJSON(&jsonPayload); err != nil {
			sendError(c, http.StatusBadRequest, "Invalid JSON payload", err)
			return
		}
		evidence.FileName = jsonPayload.FileName       // For links, this might be "Link Evidence" or derived
		evidence.FilePath = jsonPayload.FilePath       // For links, this is the URL
		evidence.MimeType = jsonPayload.MimeType       // e.g., "text/url" or "text/plain"
		evidence.Description = jsonPayload.Description // For text, this holds the content; for links, a description
		// FileSize would be 0 or not applicable for links/text

	} else {
		sendError(c, http.StatusUnsupportedMediaType, "Unsupported content type: "+contentType, nil)
		return
	}

	// Save the evidence record to the database
	if err := h.Store.CreateCampaignTaskInstanceEvidence(&evidence); err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to save evidence metadata", err)
		return
	}

	// Log evidence upload as a comment for the activity feed
	uploaderUserName := "User" // Fallback
	if claims != nil && claims.Email != "" {
		uploaderUserName = claims.Email
	}

	commentText := fmt.Sprintf("%s uploaded evidence: %s", uploaderUserName, evidence.FileName)
	if evidence.Description != nil && *evidence.Description != "" {
		commentText = fmt.Sprintf("%s uploaded evidence '%s': %s", uploaderUserName, *evidence.Description, evidence.FileName)
	}

	activityComment := models.Comment{
		CampaignTaskInstanceID: &instanceID,
		UserID:                 uploaderUserID, // User who performed the action
		Text:                   commentText,
	}
	if err := h.Store.CreateCampaignTaskInstanceComment(&activityComment); err != nil {
		log.Printf("Failed to log evidence upload comment for CTI %s: %v", instanceID, err)
		// This is a non-critical error for the evidence upload itself, so we don't return an error to the client for this.
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

// ... other imports and your CampaignHandler struct ...

func (h *CampaignHandler) ExecuteCampaignTaskInstanceHandler(c *gin.Context) {
	instanceID := c.Param("id")

	// Get uploaderUserID from authenticated user claims
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
	executionStatus := "Failed" // Default to Failed
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
			// Prepare context for the executor
			checkCtx := executor.CheckContext{
				TaskInstance: taskInstance,
				Store:        h.Store,
			}

			// If a Target is specified, it's assumed to be a ConnectedSystem ID for all automated checks.
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
			} else { // If Target is nil or empty, but check_type implies one is needed (most automated checks will)
				// Specific executors will fail if checkCtx.ConnectedSystem is nil and they require one.
				// For script_run_check, it now requires a ConnectedSystem (e.g., "Local Host").
				executionOutput.WriteString(fmt.Sprintf("Error: A Target (Connected System ID) is required for check type '%s' but not provided.\n", checkType))
				executionStatus = "Error"
			}

			// If fetching/validating the Connected System failed, executionStatus would be "Error".
			// Otherwise, proceed to validate parameters and execute.
			if executionStatus != "Error" {
				// Validate parameters before execution
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
					if err != nil { // Error occurred during executor.Execute
						executionOutput.WriteString(fmt.Sprintf("Error during execution of check type '%s': %v\n", checkType, err))
						// Append any output the executor might have generated before erroring
						if execDetails.Output != "" {
							executionOutput.WriteString("Executor output before error:\n" + execDetails.Output)
						}
						executionStatus = "Error" // Ensure status reflects the error
					} else { // Executor.Execute completed without returning an error
						executionStatus = execDetails.Status
						executionOutput.WriteString(execDetails.Output)
					}
				}
			}
		}
	}

	// Store the result
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

	// Update the last_checked_at and last_check_status for the task instance itself
	taskInstance.LastCheckedAt = &result.Timestamp
	taskInstance.LastCheckStatus = &result.Status
	if err := h.Store.UpdateCampaignTaskInstance(taskInstance); err != nil {
		log.Printf("Error updating task instance %s with last check status: %v", instanceID, err)
		// Non-fatal, continue
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
		results = []models.CampaignTaskInstanceResult{} // Return empty array instead of null
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
		SourceEvidenceIDs []string `json:"source_evidence_ids" binding:"required,dive,uuid"` // dive validates each string in slice as uuid
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
