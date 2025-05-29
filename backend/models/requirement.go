package models // Example: pkg/models/requirement.go

import "time"

// Requirement defines the structure for a compliance requirement.
type Requirement struct {
	ID                 string    `json:"id" db:"id"`
	StandardID         string    `json:"standardId" db:"standard_id"`
	ControlIDReference string    `json:"controlIdReference" db:"control_id_reference"`
	RequirementText    string    `json:"requirementText" db:"requirement_text"`
	CreatedAt          time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt          time.Time `json:"updatedAt" db:"updated_at"`
}
