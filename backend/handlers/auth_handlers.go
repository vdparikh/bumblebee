package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vdparikh/compliance-automation/backend/auth"   // Adjust path
	"github.com/vdparikh/compliance-automation/backend/models" // Adjust path
	"github.com/vdparikh/compliance-automation/backend/store"  // Assuming this is your actual store package
)

type AuthAPI struct {
	UserStore *store.DBStore
	// Use your actual store type
}

func NewAuthAPI(userStore *store.DBStore) *AuthAPI {
	return &AuthAPI{UserStore: userStore}
}

func (a *AuthAPI) Login(c *gin.Context) {
	var creds models.LoginRequest
	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	user, err := a.UserStore.GetUserByEmail(creds.Email)
	if err != nil {
		// Log internal server error
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server error while fetching user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !auth.CheckPasswordHash(creds.Password, user.HashedPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	tokenString, err := auth.GenerateJWT(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	response := map[string]interface{}{
		"token": tokenString,
		"user": map[string]interface{}{ // Send back basic user info
			"id":    user.ID, // Assuming user.ID is already a string from your model
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	}
	c.JSON(http.StatusOK, response)
}

// GetCurrentUser: Fetches user details based on token in context
func (a *AuthAPI) GetCurrentUser(c *gin.Context) {
	claimsValue, exists := c.Get(string(auth.ContextKeyClaims)) // Use string key for Gin context
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: No user claims found in context"})
		return
	}

	claims, ok := claimsValue.(*auth.Claims)
	if !ok || claims == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error processing user claims"})
		return
	}

	userID, err := uuid.Parse(claims.UserID) // claims.UserID should be string
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID in token claims: " + err.Error()})
		return
	}

	user, err := a.UserStore.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching user details"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	responseUser := map[string]interface{}{
		"id":    user.ID, // Assuming user.ID is already a string
		"name":  user.Name,
		"email": user.Email,
		"role":  user.Role,
	}
	c.JSON(http.StatusOK, responseUser)
}

func (a *AuthAPI) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	// Check if user already exists
	existingUser, err := a.UserStore.GetUserByEmail(req.Email)
	if err != nil && err.Error() != "sql: no rows in result set" { // Be careful with exact error string matching
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server error while checking email"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		return
	}

	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	newUser := models.User{
		Name:           req.Name,
		Email:          req.Email,
		HashedPassword: hashedPassword,
		Role:           "user", // Default role for self-registration
	}

	if err := a.UserStore.CreateUser(&newUser); err != nil {
		if strings.Contains(err.Error(), "already exists") { // More specific check from store
			c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
		}
		return
	}

	// Optionally, log the user in immediately by generating a token
	tokenString, err := auth.GenerateJWT(&newUser)
	if err != nil {
		// User created, but token generation failed. This is an edge case.
		// You might decide to return success without token, or an error.
		c.JSON(http.StatusCreated, gin.H{"message": "User created successfully, but failed to generate token.", "user": newUser})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"token": tokenString, "user": newUser, "message": "User registered successfully"})
}

func (a *AuthAPI) ChangePasswordHandler(c *gin.Context) {
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

	var req struct {
		CurrentPassword string `json:"currentPassword" binding:"required"`
		NewPassword     string `json:"newPassword" binding:"required,min=8"` // Add password complexity rules if needed
		ConfirmPassword string `json:"confirmPassword" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	if req.NewPassword != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New passwords do not match"})
		return
	}

	// Fetch user from DB
	userIDUUID, err := uuid.Parse(claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}
	user, err := a.UserStore.GetUserByID(userIDUUID) // Assuming GetUserByID exists and returns hashed_password
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Verify current password
	if !auth.CheckPasswordHash(req.CurrentPassword, user.HashedPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect current password"})
		return
	}

	// Hash new password and update
	newHashedPassword, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash new password"})
		return
	}

	if err := a.UserStore.UpdateUserPassword(claims.UserID, newHashedPassword); err != nil { // You'll need to implement UpdateUserPassword in your store
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}
