package utils

import (
	"encoding/json"
	"time"

	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

// RecordAuditLog creates an audit log entry.
// store: The PostgresStore instance for database operations.
// userID: The ID of the user performing the action. Can be nil for system actions.
// action: A string describing the action performed (e.g., "user_login", "create_task").
// entityType: The type of entity that was affected (e.g., "user", "task").
// entityID: The ID of the entity that was affected.
// changes: A map representing the changes made to the entity. Can be nil if no specific changes are logged.
func RecordAuditLog(store store.Store, userID *string, action string, entityType string, entityID string, changes map[string]interface{}) error {
	auditLog := models.AuditLog{
		Timestamp:  time.Now().UTC(), // Use UTC for consistency
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		// ID and CreatedAt will be set by the database or not set if not needed by application logic immediately
	}

	if changes != nil && len(changes) > 0 {
		changesJSON, err := json.Marshal(changes)
		if err != nil {
			// Consider logging this error to a system log as well,
			// but returning it is important for the caller to handle.
			return err
		}
		auditLog.Changes = models.JSONB(changesJSON)
	} else {
		// Ensure Changes is explicitly null if empty, to match JSONB nullable behavior
		auditLog.Changes = nil
	}

	// The InsertAuditLog method will handle setting the ID if RETURNING id is used and scanned.
	err := store.InsertAuditLog(&auditLog)
	if err != nil {
		return err // Or wrap the error for more context
	}

	return nil
}
