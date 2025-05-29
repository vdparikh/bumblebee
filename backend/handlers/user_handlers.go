package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

// UserHandler holds the store for database operations.
type UserHandler struct {
	Store *store.DBStore
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(s *store.DBStore) *UserHandler {
	return &UserHandler{Store: s}
}

// CreateUserHandler handles the creation of new users.
func (h *UserHandler) CreateUserHandler(c *gin.Context) {
	var newUser models.User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	// Basic validation
	if newUser.Name == "" || newUser.Email == "" || newUser.Role == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name, Email, and Role are required"})
		return
	}

	if err := h.Store.CreateUser(&newUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, newUser)
}

// GetUsersHandler lists all users.
func (h *UserHandler) GetUsersHandler(c *gin.Context) {
	users, err := h.Store.GetUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}
