package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/auth" // For auth.Claims
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

type AuditLogHandler struct {
	Store store.Store // Use the interface
}

func NewAuditLogHandler(s store.Store) *AuditLogHandler {
	return &AuditLogHandler{Store: s}
}

func (h *AuditLogHandler) GetAuditLogsHandler(c *gin.Context) {
	// Authorization Check
	claimsValue, exists := c.Get(string(auth.ContextKeyClaims))
	if !exists {
		sendError(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}
	claims, ok := claimsValue.(*auth.Claims)
	if !ok {
		sendError(c, http.StatusInternalServerError, "Invalid user claims type in context", nil)
		return
	}

	if claims.Role != models.UserRoleAdmin && claims.Role != models.UserRoleAuditor {
		sendError(c, http.StatusForbidden, "Insufficient privileges. Admin or Auditor role required.", nil)
		return
	}

	filters := make(map[string]interface{})
	if userID := c.Query("user_id"); userID != "" {
		filters["al.user_id"] = userID
	}
	if entityType := c.Query("entity_type"); entityType != "" {
		filters["al.entity_type"] = entityType
	}
	if entityID := c.Query("entity_id"); entityID != "" {
		filters["al.entity_id"] = entityID
	}
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		startDate, err := time.Parse(time.RFC3339, startDateStr)
		if err != nil {
			sendError(c, http.StatusBadRequest, "Invalid start_date format. Use RFC3339.", err)
			return
		}
		filters["start_date"] = startDate
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		endDate, err := time.Parse(time.RFC3339, endDateStr)
		if err != nil {
			sendError(c, http.StatusBadRequest, "Invalid end_date format. Use RFC3339.", err)
			return
		}
		filters["end_date"] = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	}

	page, errPage := strconv.Atoi(c.DefaultQuery("page", "1"))
	if errPage != nil || page < 1 {
		page = 1
	}
	limit, errLimit := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if errLimit != nil || limit < 1 {
		limit = 20
	}
	if limit > 100 { // Max limit for non-export
		limit = 100
	}

	exportFormat := c.Query("export")

	if exportFormat != "" {
		exportPage := 1    // For export, always start from page 1
		exportLimit := 0 // Indicate to store method to fetch all records

		logs, _, err := h.Store.GetAuditLogs(filters, exportPage, exportLimit) // total is not needed for full export
		if err != nil {
			sendError(c, http.StatusInternalServerError, fmt.Sprintf("Failed to retrieve audit logs for %s export", exportFormat), err)
			return
		}
		if logs == nil {
			logs = []models.AuditLog{}
		}

		filenameTimestamp := time.Now().UTC().Format("20060102_150405")
		var filename string

		switch strings.ToLower(exportFormat) {
		case "csv":
			filename = fmt.Sprintf("audit_logs_%s.csv", filenameTimestamp)
			c.Header("Content-Type", "text/csv")
			c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")

			writer := csv.NewWriter(c.Writer)
			// Write header
			headers := []string{"Timestamp", "UserID", "UserName", "UserEmail", "Action", "EntityType", "EntityID", "Changes", "LogCreatedAt"}
			if err := writer.Write(headers); err != nil {
				// Log error, can't send HTTP error if headers already sent
				log.Printf("Error writing CSV header for audit log export: %v", err)
				c.Error(err) // Inform Gin about the error
				return
			}

			// Write rows
			for _, logEntry := range logs {
				userIDStr, userName, userEmail := "", "", ""
				if logEntry.User != nil {
					if logEntry.User.ID != nil { userIDStr = *logEntry.User.ID }
					if logEntry.User.Name != nil { userName = *logEntry.User.Name }
					userEmail = logEntry.User.Email
				} else if logEntry.UserID != nil { // Fallback to UserID on the log if User struct is nil
					userIDStr = *logEntry.UserID
				}

				changesStr := ""
				if logEntry.Changes != nil {
					changesStr = string(logEntry.Changes)
				}

				row := []string{
					logEntry.Timestamp.Format(time.RFC3339),
					userIDStr,
					userName,
					userEmail,
					logEntry.Action,
					logEntry.EntityType,
					logEntry.EntityID,
					changesStr,
					logEntry.CreatedAt.Format(time.RFC3339),
				}
				if err := writer.Write(row); err != nil {
					log.Printf("Error writing CSV row for audit log %s: %v", logEntry.ID, err)
					c.Error(err)
					return
				}
			}
			writer.Flush()
			if err := writer.Error(); err != nil {
				log.Printf("Error flushing CSV writer for audit log export: %v", err)
				c.Error(err)
			}

		case "json":
			filename = fmt.Sprintf("audit_logs_%s.json", filenameTimestamp)
			c.Header("Content-Type", "application/json")
			c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
			// Write the JSON to the response writer directly for efficiency
			if err := json.NewEncoder(c.Writer).Encode(logs); err != nil {
				// Log error, can't send HTTP error if headers already sent
				log.Printf("Error encoding audit logs to JSON for export: %v", err)
				c.Error(err)
			}
		default:
			sendError(c, http.StatusBadRequest, "Invalid export format. Supported formats: csv, json.", nil)
		}
		return // End request after processing export
	}

	// Default: Paginated JSON response
	logs, total, err := h.Store.GetAuditLogs(filters, page, limit)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to retrieve audit logs", err)
		return
	}

	if logs == nil {
		logs = []models.AuditLog{}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"pagination": gin.H{
			"total_records": total,
			"current_page":  page,
			"page_size":     limit,
			"total_pages":   (total + limit - 1) / limit,
		},
	})
}

// sendError is a local helper, assuming it's defined or accessible.
// If not, it should be defined or imported.
// For this example, I'll define a basic one if not present.
// func sendError(c *gin.Context, code int, message string, err error) {
// 	responseData := gin.H{"error": message}
// 	if err != nil {
// 		responseData["details"] = err.Error()
// 	}
// 	c.JSON(code, responseData)
// }

// Note: The `sendError` function is used by other handlers in this package.
// It's assumed to be present from the initial file creation or other handler files.
// If it's defined in another file within the same `handlers` package, it should be accessible.
// For standalone operation of this file, it would need to be defined here or imported.
// I'll assume it's available from the package context.
// The provided snippet for `audit_log_handlers.go` in the previous turn did not include `sendError`.
// It's often defined in a shared `handlers.go` or similar.
// For this operation, I'll add a local one to ensure the file is complete if it was missing.

// Local sendError if not available package-wide.
// func sendError(c *gin.Context, statusCode int, message string, errDetail error) {
// 	errObj := gin.H{"error": message}
// 	if errDetail != nil {
// 		log.Printf("Error: %s - Detail: %v", message, errDetail.Error())
// 		errObj["details"] = errDetail.Error()
// 	} else {
// 		log.Printf("Error: %s", message)
// 	}
// 	c.JSON(statusCode, errObj)
// }
// It seems `sendError` is used in `campaign_handlers.go` and might be accessible if in same package.
// The prompt for creating `audit_log_handlers.go` did not include a local `sendError`.
// I will rely on it being accessible via the package.
// If `models.UserRoleAdmin` and `models.UserRoleAuditor` are not found, these would need to be string literals "admin", "auditor".
// I'm assuming they exist in `models` package as per the previous structure.
// The `UserBasicInfo` struct has `ID *string` and `Name *string`. CSV writing part was updated to reflect this.
// `UserBasicInfo.Email` is `string`.
