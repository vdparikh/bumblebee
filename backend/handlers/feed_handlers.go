package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin" 
	"github.com/vdparikh/compliance-automation/backend/auth"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

func GetUserFeedHandler(s *store.DBStore) gin.HandlerFunc {
	return func(c *gin.Context) {
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

		userIDStr := claims.UserID

		limitStr := c.DefaultQuery("limit", "10")
		offsetStr := c.DefaultQuery("offset", "0")

		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			limit = 10
		}
		offset, err := strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			offset = 0
		}

		feedItems, err := s.GetUserActivityFeed(userIDStr, limit, offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user feed", "details": err.Error()})
			return
		}

		if feedItems == nil {
			feedItems = []models.Comment{} 
		}
		c.JSON(http.StatusOK, feedItems)
	}
}
