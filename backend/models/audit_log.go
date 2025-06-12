package models

import (
	"time"
)

// JSONB type for handling JSON data in the database
// type JSONB json.RawMessage

// // Scan implements the Scanner interface for JSONB type
// func (j *JSONB) Scan(value interface{}) error {
// 	bytes, ok := value.([]byte)
// 	if !ok {
// 		return errors.New("type assertion to []byte failed")
// 	}
// 	return json.Unmarshal(bytes, j)
// }

// // Value implements the Valuer interface for JSONB type
// func (j JSONB) Value() (driver.Value, error) {
// 	if len(j) == 0 {
// 		// Return null if the JSONB is empty
// 		return nil, nil
// 	}
// 	return json.RawMessage(j).MarshalJSON()
// }

// AuditLog struct defines the structure for audit log entries
type AuditLog struct {
	ID         string    `json:"id" db:"id"`                     // Primary Key, UUID
	CreatedAt  time.Time `json:"created_at" db:"created_at"`     // Timestamp of creation
	Timestamp  time.Time `json:"timestamp" db:"timestamp"`       // Timestamp of the action
	UserID     *string   `json:"user_id,omitempty" db:"user_id"` // Foreign Key to users table, UUID (nullable)
	Action     string    `json:"action" db:"action"`             // e.g., "create", "update", "delete", "login", "logout"
	EntityType string    `json:"entity_type" db:"entity_type"`   // e.g., "task", "evidence", "user", "campaign"
	EntityID   string    `json:"entity_id" db:"entity_id"`       // UUID of the entity affected
	Changes    JSONB     `json:"changes,omitempty" db:"changes"` // Details of changes (old/new values)

	// User is optional and can be populated by JOINs if needed for direct response
	User *UserBasicInfo `json:"user,omitempty" db:"user"`
}
