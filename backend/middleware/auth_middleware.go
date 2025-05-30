package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/auth" // Adjust path
)

// AuthMiddleware extracts and validates JWT from Authorization header.
// If valid, it adds user claims to the request context.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization header format (must be Bearer {token})"})
			return
		}
		tokenString := parts[1]

		claims, err := auth.ValidateJWT(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token: " + err.Error()})
			return
		}

		// Add claims to context for downstream handlers
		c.Set(string(auth.ContextKeyClaims), claims) // Use string key for Gin context
		c.Next()
	}
}

// RoleAuthMiddleware checks if the authenticated user has one of the allowed roles.
// This middleware must run *after* AuthMiddleware.
func RoleAuthMiddleware(allowedRoles []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsValue, exists := c.Get(string(auth.ContextKeyClaims))
		if !exists {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Authentication claims not found in context"})
			return
		}
		claims, ok := claimsValue.(*auth.Claims)
		if !ok || claims == nil {
			// This should ideally not happen if AuthMiddleware ran successfully
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Error processing authentication claims"})
			return
		}

		isAllowed := false
		// for _, role := range allowedRoles {
		// }

		if !isAllowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: You do not have permission to access this resource"})
			return
		}
		c.Next()
	}
}
