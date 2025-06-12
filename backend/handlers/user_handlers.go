package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
	"github.com/vdparikh/compliance-automation/backend/utils"
)

type UserHandler struct {
	Store *store.DBStore
}

func NewUserHandler(s *store.DBStore) *UserHandler {
	return &UserHandler{Store: s}
}

func (h *UserHandler) CreateUserHandler(c *gin.Context) {
	var newUser models.User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	if newUser.Name == "" || newUser.Email == "" || newUser.Role == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name, Email, and Role are required"})
		return
	}

	if err := h.Store.CreateUser(&newUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
		return
	}

	// Audit log for user creation
	// Assuming the userID from context is the admin/user performing the creation.
	// If this is a public registration, userID might be nil or the newUser.ID itself.
	// For consistency with instruction "UserID for the audit log should be extracted from the request context".
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging create user %s. This might be a self-registration.", newUser.Email)
		// In self-registration, you might choose to set actorUserIDStrPtr to &newUser.ID if appropriate,
		// or leave it nil if the action is considered anonymous until the user is created.
		// For now, following the instruction to get it from context, it will be nil if not found.
	}

	auditChanges := map[string]interface{}{
		"created_user_id": newUser.ID,
		"name":            newUser.Name,
		"email":           newUser.Email,
		"role":            newUser.Role,
	}
	if err := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "create_user", "user", newUser.ID, auditChanges); err != nil {
		log.Printf("Error recording audit log for create user %s: %v", newUser.ID, err)
		// Non-critical
	}

	c.JSON(http.StatusCreated, newUser)
}

func (h *UserHandler) GetUsersHandler(c *gin.Context) {
	users, err := h.Store.GetUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}
