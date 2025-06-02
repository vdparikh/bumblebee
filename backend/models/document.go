package models

import "time"

type Document struct {
	ID                string    `json:"id" db:"id"`
	Name              string    `json:"name" db:"name" binding:"required"`
	Description       *string   `json:"description,omitempty" db:"description"`
	DocumentType      string    `json:"document_type" db:"document_type" binding:"required"`  
	SourceURL         *string   `json:"source_url,omitempty" db:"source_url"`                 
	InternalReference *string   `json:"internal_reference,omitempty" db:"internal_reference"` 
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
}
