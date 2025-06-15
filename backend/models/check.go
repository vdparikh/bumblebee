package models

import (
	"encoding/json"
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
	// EffectiveDate *CustomDate     `json:"effective_date,omitempty" db:"effective_date"`
	// ExpiryDate    *CustomDate     `json:"expiry_date,omitempty" db:"expiry_date"`
	Jurisdiction *string         `json:"jurisdiction,omitempty" db:"jurisdiction"`
	Industry     *string         `json:"industry,omitempty" db:"industry"`
	Tags         json.RawMessage `json:"tags,omitempty" db:"tags"`
}

type Task struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`

	// TaskID  string `json:"taskId" db:"task_id"`
	Version string `json:"version" db:"version"`
	// EffectiveDate      *CustomDate     `json:"effectiveDate,omitempty" db:"effective_date"`
	// ExpiryDate         *CustomDate     `json:"expiryDate,omitempty" db:"expiry_date"`
	Priority           string          `json:"priority" db:"priority"`
	Status             string          `json:"status" db:"status"`
	Tags               json.RawMessage `json:"tags,omitempty" db:"tags"`
	HighLevelCheckType *string         `json:"highLevelCheckType,omitempty" db:"high_level_check_type"`

	CheckType  *string                `json:"checkType,omitempty"`
	Target     *string                `json:"target,omitempty"`
	Parameters map[string]interface{} `json:"parameters,omitempty"`

	LinkedDocumentIDs []string   `json:"linkedDocumentIDs,omitempty"`
	LinkedDocuments   []Document `json:"linked_documents,omitempty" db:"-"`

	EvidenceTypesExpected []string `json:"evidenceTypesExpected,omitempty" db:"evidence_types_expected"`
	DefaultPriority       *string  `json:"defaultPriority,omitempty" db:"default_priority"`

	// Requirements related fields
	RequirementIDs []string      `json:"requirementIds,omitempty" db:"-"`
	Requirements   []Requirement `json:"requirements,omitempty" db:"-"`
}

type TaskExecutionResult struct {
	ID               string    `json:"id"`
	TaskID           string    `json:"taskId"`
	Timestamp        time.Time `json:"timestamp"`
	Status           string    `json:"status"`
	Output           string    `json:"output"`
	ExecutedByUserID string    `json:"executedByUserId"`
}
