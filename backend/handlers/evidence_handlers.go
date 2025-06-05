package handlers

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/auth" // Your auth package
	"github.com/vdparikh/compliance-automation/backend/store"
)

// HandleReviewEvidence handles the request to review an evidence item.
// It expects the DBStore to be passed, allowing it to interact with the database.
func HandleReviewEvidence(s *store.DBStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		evidenceID := c.Param("evidenceId")
		if evidenceID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Evidence ID is required"})
			return
		}
		fmt.Println(evidenceID)

		claimsValue, exists := c.Get(string(auth.ContextKeyClaims))
		if !exists {
			sendError(c, http.StatusUnauthorized, "User not authenticated", nil)
			return
		}
		userClaims, ok := claimsValue.(*auth.Claims)

		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user claims type in context"})
			return
		}

		// Authorization: Check if the user has permission to review evidence
		// Example: Only admin or auditor can review. Adapt to your roles.
		if userClaims.Role != "admin" && userClaims.Role != "auditor" {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to review evidence"})
			return
		}

		var req store.ReviewEvidenceUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
			return
		}

		if req.ReviewStatus == "Rejected" && req.ReviewComments == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Review comments are required when rejecting evidence"})
			return
		}

		updatedEvidence, err := s.UpdateEvidenceReview(evidenceID, userClaims.UserID, req)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Evidence not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update evidence review: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, updatedEvidence)
	}
}
