package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type Campaign struct {
	ID                   string                        `json:"id"`
	Name                 string                        `json:"name"`
	Description          *string                       `json:"description,omitempty"`
	StandardID           *string                       `json:"standard_id,omitempty"`   
	StandardName         *string                       `json:"standard_name,omitempty"` 
	StartDate            *time.Time                    `json:"start_date,omitempty"`
	EndDate              *time.Time                    `json:"end_date,omitempty"`
	Status               string                        `json:"status"`
	CreatedAt            time.Time                     `json:"created_at"`
	UpdatedAt            time.Time                     `json:"updated_at"`
	SelectedRequirements []CampaignSelectedRequirement `json:"selected_requirements,omitempty"` 
}

type CampaignSelectedRequirement struct {
	ID                 string `json:"id,omitempty"`          
	CampaignID         string `json:"campaign_id,omitempty"` 
	RequirementID      string `json:"requirement_id"`
	IsApplicable       bool   `json:"is_applicable"`
	ControlIDReference string `json:"control_id_reference,omitempty"` 
	RequirementText    string `json:"requirement_text,omitempty"`     
}

type UserBasicInfo struct {
	ID    string `json:"id" db:"id"`
	Name  string `json:"name" db:"name"`
	Email string `json:"email,omitempty" db:"email"` 
}

type CampaignTaskInstance struct {
	ID                            string  `json:"id"`
	CampaignID                    string  `json:"campaign_id"`
	CampaignName                  *string `json:"campaign_name,omitempty"` 
	MasterTaskID                  *string `json:"master_task_id,omitempty"`
	CampaignSelectedRequirementID *string `json:"campaign_selected_requirement_id,omitempty"`
	Title                         string  `json:"title"`
	Description                   *string `json:"description,omitempty"`
	Category                      *string `json:"category,omitempty"`
	OwnerUserIDs []string        `json:"owner_user_ids,omitempty"` 
	Owners       []UserBasicInfo `json:"owners,omitempty"`         

	AssigneeUserID *string    `json:"assignee_user_id,omitempty"`
	Status         string     `json:"status"`
	DueDate        *time.Time `json:"due_date,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`

	UpdatedAt       time.Time              `json:"updatedAt" db:"updated_at"`
	CheckType       *string                `json:"check_type,omitempty" db:"check_type"`
	Target          *string                `json:"target,omitempty" db:"target"`
	Parameters      map[string]interface{} `json:"parameters,omitempty" db:"parameters"`             
	LastCheckedAt   *time.Time             `json:"lastCheckedAt,omitempty" db:"last_checked_at"`     
	LastCheckStatus *string                `json:"lastCheckStatus,omitempty" db:"last_check_status"` 

	OwnerUserName                 *string `json:"owner_user_name,omitempty"`                  
	AssigneeUserName              *string `json:"assignee_user_name,omitempty"`               
	RequirementControlIDReference *string `json:"requirement_control_id_reference,omitempty"` 

	DefaultPriority       *string  `json:"defaultPriority,omitempty"`
	EvidenceTypesExpected []string `json:"evidenceTypesExpected,omitempty"`

	RequirementText         *string    `json:"requirement_text,omitempty" db:"requirement_text"`                   
	RequirementStandardName *string    `json:"requirement_standard_name,omitempty" db:"requirement_standard_name"` 
	LinkedDocuments         []Document `json:"linked_documents,omitempty" db:"-"`                                  

}

type CampaignTaskInstanceResult struct {
	ID                     string         `json:"id" db:"id"`
	CampaignTaskInstanceID string         `json:"campaignTaskInstanceId" db:"campaign_task_instance_id"`
	ExecutedByUserID       *string        `json:"executedByUserId,omitempty" db:"executed_by_user_id"` 
	Timestamp              time.Time      `json:"timestamp" db:"timestamp"`
	Status                 string         `json:"status" db:"status"`       
	Output                 string         `json:"output" db:"output"`       
	ExecutedByUser         *UserBasicInfo `json:"executedByUser,omitempty"` 
}

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
