package models

import (
	"time"
)

type ComplianceStandard struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	ShortName    string  `json:"shortName"`
	Description  string  `json:"description"`
	Version      *string `json:"version,omitempty" db:"version"`
	IssuingBody  *string `json:"issuing_body,omitempty" db:"issuing_body"`
	OfficialLink *string `json:"official_link,omitempty" db:"official_link"`
}

type Task struct {
	ID            string    `json:"id"`
	RequirementID string    `json:"requirementId"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	Category      string    `json:"category"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`

	CheckType  *string                `json:"checkType,omitempty"`
	Target     *string                `json:"target,omitempty"`
	Parameters map[string]interface{} `json:"parameters,omitempty"`

	LinkedDocumentIDs []string   `json:"linked_document_ids,omitempty"`
	LinkedDocuments   []Document `json:"linked_documents,omitempty" db:"-"`

	EvidenceTypesExpected []string `json:"evidenceTypesExpected,omitempty" db:"evidence_types_expected"`
	DefaultPriority       *string  `json:"defaultPriority,omitempty" db:"default_priority"`
}

type TaskExecutionResult struct {
	ID               string    `json:"id"`
	TaskID           string    `json:"taskId"`
	Timestamp        time.Time `json:"timestamp"`
	Status           string    `json:"status"`
	Output           string    `json:"output"`
	ExecutedByUserID string    `json:"executedByUserId"`
}
