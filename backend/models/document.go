package models

import "time"

// Document represents a policy, procedure, or other reference material.
type Document struct {
	ID                string    `json:"id" db:"id"`
	Name              string    `json:"name" db:"name" binding:"required"`
	Description       *string   `json:"description,omitempty" db:"description"`
	DocumentType      string    `json:"document_type" db:"document_type" binding:"required"`  // e.g., "Policy", "Procedure", "Regulatory Document", "SOP"
	SourceURL         *string   `json:"source_url,omitempty" db:"source_url"`                 // Link to the document if external or in a DMS
	InternalReference *string   `json:"internal_reference,omitempty" db:"internal_reference"` // e.g., version, internal ID, file path if stored locally
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
	// Future considerations:
	// Tags             []string   `json:"tags,omitempty"`
	// OwnerUserID      *string    `json:"owner_user_id,omitempty"`
	// ReviewDate       *time.Time `json:"review_date,omitempty"`
}
