package handlers

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vdparikh/compliance-automation/backend/auth"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
	"github.com/vdparikh/compliance-automation/backend/utils"
)

type AuthAPI struct {
	UserStore *store.DBStore
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
		"user": map[string]interface{}{ 
			"id":    user.ID, 
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	}

	// Audit log for login
	loginUserID := user.ID // ID of the user who logged in
	auditChangesLogin := map[string]interface{}{
		"user_id": loginUserID,
		"email":   user.Email,
		"status":  "login_successful",
	}
	if err := utils.RecordAuditLog(a.UserStore, &loginUserID, "user_login", "user", loginUserID, auditChangesLogin); err != nil {
		log.Printf("Error recording audit log for user login %s: %v", loginUserID, err)
		// Non-critical
	}

	c.JSON(http.StatusOK, response)
}

func (a *AuthAPI) GetCurrentUser(c *gin.Context) {
	claimsValue, exists := c.Get(string(auth.ContextKeyClaims)) 
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: No user claims found in context"})
		return
	}

	claims, ok := claimsValue.(*auth.Claims)
	if !ok || claims == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error processing user claims"})
		return
	}

	userID, err := uuid.Parse(claims.UserID) 
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
		"id":    user.ID, 
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

	existingUser, err := a.UserStore.GetUserByEmail(req.Email)
	if err != nil && err.Error() != "sql: no rows in result set" { 
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
		Role:           "user", 
	}

	if err := a.UserStore.CreateUser(&newUser); err != nil {
		if strings.Contains(err.Error(), "already exists") { 
			c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
		}
		return
	}

	tokenString, err := auth.GenerateJWT(&newUser)
	if err != nil {
		c.JSON(http.StatusCreated, gin.H{"message": "User created successfully, but failed to generate token.", "user": newUser})
		return
	}

	// Audit log for user registration
	regUserID := newUser.ID // ID of the newly registered user
	auditChangesRegister := map[string]interface{}{
		"user_id": regUserID,
		"name":    newUser.Name,
		"email":   newUser.Email,
		"role":    newUser.Role, // Should be "user" as set above
	}
	// For self-registration, the actor is the user themselves.
	if err := utils.RecordAuditLog(a.UserStore, &regUserID, "user_register", "user", regUserID, auditChangesRegister); err != nil {
		log.Printf("Error recording audit log for user registration %s: %v", regUserID, err)
		// Non-critical
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
		NewPassword     string `json:"newPassword" binding:"required,min=8"` 
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

	userIDUUID, err := uuid.Parse(claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}
	user, err := a.UserStore.GetUserByID(userIDUUID) 
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if !auth.CheckPasswordHash(req.CurrentPassword, user.HashedPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect current password"})
		return
	}

	newHashedPassword, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash new password"})
		return
	}

	if err := a.UserStore.UpdateUserPassword(claims.UserID, newHashedPassword); err != nil { 
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Audit log for password change
	changedPasswordUserID := claims.UserID
	auditChangesPassword := map[string]interface{}{
		"user_id": changedPasswordUserID,
		"action":  "password_changed_successfully",
	}
	if err := utils.RecordAuditLog(a.UserStore, &changedPasswordUserID, "user_change_password", "user", changedPasswordUserID, auditChangesPassword); err != nil {
		log.Printf("Error recording audit log for password change user %s: %v", changedPasswordUserID, err)
		// Non-critical
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}
