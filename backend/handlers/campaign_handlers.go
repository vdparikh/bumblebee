package handlers

import (
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	// "time"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/auth" // Import for auth claims
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

type CampaignHandler struct {
	Store *store.DBStore
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
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
		log.Printf("Error creating campaign: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create campaign"})
		return
	}
	campaign.ID = campaignID // Set the returned ID
	c.JSON(http.StatusCreated, campaign)
}

func (h *CampaignHandler) GetCampaignsHandler(c *gin.Context) {
	campaignStatus := c.Query("campaignStatus")

	campaigns, err := h.Store.GetCampaigns(campaignStatus)
	if err != nil {
		log.Printf("Error fetching campaigns: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaigns"})
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
		if err.Error() == "sql: no rows in result set" { // Or a custom error type
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		log.Printf("Error fetching campaign by ID %s: %v", campaignID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	// Fetch existing campaign to apply updates
	campaign, err := h.Store.GetCampaignByID(campaignID)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found to update"})
			return
		}
		log.Printf("Error fetching campaign %s for update: %v", campaignID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve campaign for update"})
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
		log.Printf("Error updating campaign %s: %v", campaignID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update campaign"})
		return
	}
	c.JSON(http.StatusOK, campaign)
}

func (h *CampaignHandler) DeleteCampaignHandler(c *gin.Context) {
	campaignID := c.Param("id")
	err := h.Store.DeleteCampaign(campaignID)
	if err != nil {
		log.Printf("Error deleting campaign %s: %v", campaignID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete campaign"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Campaign deleted successfully"})
}

func (h *CampaignHandler) GetCampaignSelectedRequirementsHandler(c *gin.Context) {
	campaignID := c.Param("id")
	requirements, err := h.Store.GetCampaignSelectedRequirements(campaignID)
	if err != nil {
		log.Printf("Error fetching selected requirements for campaign %s: %v", campaignID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch selected requirements"})
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
		log.Printf("Error fetching task instances for campaign %s: %v", campaignID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch task instances"})
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
		if err.Error() == "sql: no rows in result set" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign Task Instance not found to update"})
			return
		}
		log.Printf("Error fetching CTI %s for update: %v", ctiID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve CTI for update"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body for campaign task instance update: " + err.Error()})
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
		log.Printf("Error updating campaign task instance %s: %v", ctiID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update campaign task instance"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId and a valid userField ('owner' or 'assignee') query parameters are required"})
		return
	}

	// Pass campaignStatus to the store method
	taskInstances, err := h.Store.GetCampaignTaskInstancesForUser(userID, userField, campaignStatus)
	if err != nil {
		log.Printf("Error fetching campaign task instances for user %s (%s), status %s: %v", userID, userField, campaignStatus, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user's campaign tasks"})
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
		if err.Error() == "sql: no rows in result set" { // Or a custom error type
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign Task Instance not found"})
			return
		}
		log.Printf("Error fetching campaign task instance by ID %s: %v", instanceID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign task instance"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if commentReq.UserID == "" {
		// In a real app, get UserID from authenticated session/token
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required for comment"})
		return
	}

	comment := models.Comment{
		CampaignTaskInstanceID: &instanceID,
		UserID:                 commentReq.UserID,
		Text:                   commentReq.Text,
	}

	if err := h.Store.CreateCampaignTaskInstanceComment(&comment); err != nil {
		log.Printf("Error creating comment for campaign task instance %s: %v", instanceID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add comment"})
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
		log.Printf("Error fetching comments for campaign task instance %s: %v", instanceID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve comments"})
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	claims, ok := claimsValue.(*auth.Claims)
	if !ok || claims == nil || claims.UserID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error processing user authentication claims"})
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
			log.Printf("File upload error for CTI %s: %v", instanceID, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "File upload error: " + err.Error()})
			return
		}
		defer file.Close()

		fileName := strings.ReplaceAll(filepath.Base(header.Filename), " ", "_")
		uploadDir := filepath.Join("./uploads/campaign_tasks/", instanceID) // Use filepath.Join for OS-agnostic paths

		if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
			log.Printf("Error creating upload directory %s for CTI %s: %v", uploadDir, instanceID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
			return
		}
		filePath := filepath.Join(uploadDir, fileName)

		out, err := os.Create(filePath)
		if err != nil {
			log.Printf("Error creating file %s for CTI %s: %v", filePath, instanceID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
			return
		}
		defer out.Close()

		_, err = io.Copy(out, file)
		if err != nil {
			log.Printf("Error copying file content to %s for CTI %s: %v", filePath, instanceID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write file content"})
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
			log.Printf("Invalid JSON payload for CTI %s: %v", instanceID, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON payload: " + err.Error()})
			return
		}
		evidence.FileName = jsonPayload.FileName       // For links, this might be "Link Evidence" or derived
		evidence.FilePath = jsonPayload.FilePath       // For links, this is the URL
		evidence.MimeType = jsonPayload.MimeType       // e.g., "text/url" or "text/plain"
		evidence.Description = jsonPayload.Description // For text, this holds the content; for links, a description
		// FileSize would be 0 or not applicable for links/text

	} else {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "Unsupported content type: " + contentType})
		return
	}

	// Save the evidence record to the database
	if err := h.Store.CreateCampaignTaskInstanceEvidence(&evidence); err != nil {
		log.Printf("Error creating evidence record for CTI %s: %v", instanceID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save evidence metadata"})
		return
	}
	c.JSON(http.StatusCreated, evidence)
}

func (h *CampaignHandler) GetCampaignTaskInstanceEvidenceHandler(c *gin.Context) {
	instanceID := c.Param("id")
	evidences, err := h.Store.GetCampaignTaskInstanceEvidence(instanceID)
	if err != nil {
		log.Printf("Error fetching evidence for CTI %s: %v", instanceID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve evidence"})
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
	// TODO:
	// 1. Retrieve the campaign task instance by instanceID from the store.
	// 2. Check if it's an automated task (has check_type, target, parameters).
	// 3. If automated, trigger the execution logic (e.g., call a script, API, etc.).
	// 4. Store the execution result (status, output, timestamp) in a new table
	//    (e.g., campaign_task_instance_results) linked to the instanceID.
	// 5. Return a success response or an error.
	c.JSON(http.StatusOK, gin.H{"message": "Execution triggered for instance " + instanceID}) // Placeholder
}

func (h *CampaignHandler) GetCampaignTaskInstanceResultsHandler(c *gin.Context) {
	instanceID := c.Param("id")
	// TODO:
	// 1. Retrieve all execution results for the given instanceID from the
	//    campaign_task_instance_results table.
	// 2. Return the results as JSON or an error if not found/other issues.
	c.JSON(http.StatusOK, gin.H{"results": "Results for instance " + instanceID}) // Placeholder
}
