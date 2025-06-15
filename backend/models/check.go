package models

import (
	"encoding/json"
	"time"
)

// ParameterDefinition describes a single parameter required by a check type.
type ParameterDefinition struct {
	Name        string   `json:"name"`
	Label       string   `json:"label"`
	Type        string   `json:"type"` // e.g., "text", "number", "select", "textarea"
	Required    bool     `json:"required"`
	Placeholder string   `json:"placeholder,omitempty"`
	HelpText    string   `json:"helpText,omitempty"`
	Options     []string `json:"options,omitempty"` // For "select" type
}

// CheckTypeConfiguration defines the structure for a specific automated check.
type CheckTypeConfiguration struct {
	Label          string                `json:"label"`
	Parameters     []ParameterDefinition `json:"parameters"`
	TargetType     string                `json:"targetType"` // e.g., "connected_system", "none"
	TargetLabel    string                `json:"targetLabel,omitempty"`
	TargetHelpText string                `json:"targetHelpText,omitempty"`
	// You might add an IntegrationID here if needed for frontend/backend correlation
	// IntegrationID string `json:"integrationId"`
}

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
