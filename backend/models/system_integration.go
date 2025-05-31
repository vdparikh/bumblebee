package models

import (
	"encoding/json"
	"time"
)

type ConnectedSystem struct {
	ID              string          `json:"id" db:"id"`
	Name            string          `json:"name" db:"name"`
	SystemType      string          `json:"systemType" db:"system_type"`
	Description     *string         `json:"description,omitempty" db:"description"`
	Configuration   json.RawMessage `json:"configuration" db:"configuration"` // Stored as JSONB
	IsEnabled       bool            `json:"isEnabled" db:"is_enabled"`
	LastCheckedAt   *time.Time      `json:"lastCheckedAt,omitempty" db:"last_checked_at"`
	LastCheckStatus *string         `json:"lastCheckStatus,omitempty" db:"last_check_status"`
	CreatedAt       time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt       time.Time       `json:"updatedAt" db:"updated_at"`
}
