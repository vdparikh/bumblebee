package models

import (
	"time"
)

type TeamBasicInfo struct {
	ID   *string `json:"id,omitempty" db:"id"`
	Name *string `json:"name,omitempty" db:"name"`
}

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
	ID                            string                 `json:"id" db:"id"`
	CampaignID                    string                 `json:"campaign_id" db:"campaign_id"`
	CampaignName                  *string                `json:"campaign_name,omitempty" db:"campaign_name"`
	MasterTaskID                  *string                `json:"master_task_id,omitempty" db:"master_task_id"`
	CampaignSelectedRequirementID *string                `json:"campaign_selected_requirement_id,omitempty"  db:"campaign_selected_requirement_id"`
	TaskID                        string                 `json:"task_id" db:"task_id"`
	TaskTitle                     string                 `json:"task_title" db:"task_title"`
	TaskDescription               *string                `json:"task_description,omitempty" db:"task_description"`
	TaskCategory                  *string                `json:"task_category,omitempty" db:"task_category"`
	TaskCheckType                 *string                `json:"task_check_type,omitempty" db:"task_check_type"`
	TaskTarget                    *string                `json:"task_target,omitempty" db:"task_target"`
	TaskParameters                map[string]interface{} `json:"task_parameters,omitempty" db:"task_parameters"`
	Title                         string                 `json:"title" db:"title"`
	Description                   *string                `json:"description,omitempty" db:"description"`
	Category                      *string                `json:"category,omitempty" db:"category"`
	OwnerUserIDs                  []string               `json:"owner_user_ids,omitempty" db:"-"` // Not a direct DB column
	Owners                        []UserBasicInfo        `json:"owners,omitempty" db:"-"`         // Populated by JOINs

	AssigneeUserID *string        `json:"assignee_user_id,omitempty" db:"assignee_user_id"`
	AssigneeUser   *UserBasicInfo `json:"assignee_user,omitempty" db:"assigneeuser"` // For sqlx struct scan
	Status         string         `json:"status" db:"status"`
	DueDate        *time.Time     `json:"due_date,omitempty"  db:"due_date"`
	CreatedAt      time.Time      `json:"created_at" db:"created_at"`

	UpdatedAt       time.Time              `json:"updatedAt" db:"updated_at"`
	CheckType       *string                `json:"check_type,omitempty" db:"check_type"`
	Target          *string                `json:"target,omitempty" db:"target"`
	Parameters      map[string]interface{} `json:"parameters,omitempty" db:"parameters"`
	LastCheckedAt   *time.Time             `json:"lastCheckedAt,omitempty" db:"last_checked_at"`
	LastCheckStatus *string                `json:"lastCheckStatus,omitempty" db:"last_check_status"`

	OwnerUserName    *string `json:"owner_user_name,omitempty" db:"owner_user_name"`
	AssigneeUserName *string `json:"assignee_user_name,omitempty" db:"assignee_user_name"`

	OwnerTeamID    *string `json:"owner_team_id,omitempty" db:"owner_team_id"`
	AssigneeTeamID *string `json:"assignee_team_id,omitempty" db:"assignee_team_id"`

	OwnerTeam    *TeamBasicInfo `json:"owner_team,omitempty" db:"ownerteam"`       // For sqlx struct scan
	AssigneeTeam *TeamBasicInfo `json:"assignee_team,omitempty" db:"assigneeteam"` // For sqlx struct scan

	RequirementControlIDReference *string `json:"requirement_control_id_reference,omitempty" db:"requirement_control_id_reference"`

	DefaultPriority       *string  `json:"defaultPriority,omitempty" db:"default_priority"`
	EvidenceTypesExpected []string `json:"evidenceTypesExpected,omitempty" db:"evidence_types_expected"`

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
