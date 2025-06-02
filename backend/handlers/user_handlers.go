package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
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
