package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// ... existing models ...

type Campaign struct {
	ID                   string                        `json:"id"`
	Name                 string                        `json:"name"`
	Description          *string                       `json:"description,omitempty"`
	StandardID           *string                       `json:"standard_id,omitempty"`   // Pointer to allow null
	StandardName         *string                       `json:"standard_name,omitempty"` // For display, populated by JOIN
	StartDate            *time.Time                    `json:"start_date,omitempty"`
	EndDate              *time.Time                    `json:"end_date,omitempty"`
	Status               string                        `json:"status"`
	CreatedAt            time.Time                     `json:"created_at"`
	UpdatedAt            time.Time                     `json:"updated_at"`
	SelectedRequirements []CampaignSelectedRequirement `json:"selected_requirements,omitempty"` // Used for create/update payload
}

type CampaignSelectedRequirement struct {
	ID                 string `json:"id,omitempty"`          // ID of this specific campaign-requirement link
	CampaignID         string `json:"campaign_id,omitempty"` // Only needed if not nested under campaign
	RequirementID      string `json:"requirement_id"`
	IsApplicable       bool   `json:"is_applicable"`
	ControlIDReference string `json:"control_id_reference,omitempty"` // For display
	RequirementText    string `json:"requirement_text,omitempty"`     // For display
}

type UserBasicInfo struct {
	ID    string `json:"id" db:"id"`
	Name  string `json:"name" db:"name"`
	Email string `json:"email,omitempty" db:"email"` // omitempty if not always needed
}

type CampaignTaskInstance struct {
	ID                            string  `json:"id"`
	CampaignID                    string  `json:"campaign_id"`
	CampaignName                  *string `json:"campaign_name,omitempty"` // For display on MyTasks
	MasterTaskID                  *string `json:"master_task_id,omitempty"`
	CampaignSelectedRequirementID *string `json:"campaign_selected_requirement_id,omitempty"`
	Title                         string  `json:"title"`
	Description                   *string `json:"description,omitempty"`
	Category                      *string `json:"category,omitempty"`
	// OwnerUserID                   *string                `json:"owner_user_id,omitempty"`
	OwnerUserIDs []string        `json:"owner_user_ids,omitempty"` // Used for input binding in handlers
	Owners       []UserBasicInfo `json:"owners,omitempty"`         // Populated by store for output

	AssigneeUserID                *string                `json:"assignee_user_id,omitempty"`
	Status                        string                 `json:"status"`
	DueDate                       *time.Time             `json:"due_date,omitempty"`
	CreatedAt                     time.Time              `json:"created_at"`
	UpdatedAt                     time.Time              `json:"updated_at"`
	CheckType                     *string                `json:"check_type,omitempty"`
	Target                        *string                `json:"target,omitempty"`
	Parameters                    map[string]interface{} `json:"parameters,omitempty"`                       // Changed to interface{} for flexibility
	OwnerUserName                 *string                `json:"owner_user_name,omitempty"`                  // For display
	AssigneeUserName              *string                `json:"assignee_user_name,omitempty"`               // For display
	RequirementControlIDReference *string                `json:"requirement_control_id_reference,omitempty"` // For display

	DefaultPriority       *string  `json:"defaultPriority,omitempty"`
	EvidenceTypesExpected []string `json:"evidenceTypesExpected,omitempty"`

	RequirementText         *string `json:"requirement_text,omitempty" db:"requirement_text"`                   // New: Full text of the requirement
	RequirementStandardName *string `json:"requirement_standard_name,omitempty" db:"requirement_standard_name"` // New: Name of the standard for the requirement

}

// Modify TaskComment, TaskEvidence, TaskExecutionResult models if needed
// For example, TaskComment might now primarily use CampaignTaskInstanceID
// For brevity, I'll assume the existing model structures can accommodate the new nullable/alternative FKs for now.
// The backend logic will need to handle which ID to use.

type JSONB json.RawMessage

func (j *JSONB) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, j)
}

func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return json.RawMessage(j).MarshalJSON()
}
