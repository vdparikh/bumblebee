package models

import (
	"encoding/json"
	"time"
)

type Requirement struct {
	ID                 string          `json:"id" db:"id"`
	StandardID         string          `json:"standardId" db:"standard_id"`
	ControlIDReference string          `json:"controlIdReference" db:"control_id_reference"`
	RequirementText    string          `json:"requirementText" db:"requirement_text"`
	Version            string          `json:"version" db:"version"`
	EffectiveDate      *CustomDate     `json:"effectiveDate" db:"effective_date"`
	ExpiryDate         *CustomDate     `json:"expiryDate" db:"expiry_date"`
	OfficialLink       string          `json:"officialLink" db:"official_link"`
	Priority           string          `json:"priority" db:"priority"`
	Status             string          `json:"status" db:"status"`
	Tags               json.RawMessage `json:"tags" db:"tags"`
	CreatedAt          time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt          time.Time       `json:"updatedAt" db:"updated_at"`
}
