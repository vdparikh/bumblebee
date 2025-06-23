package models

import (
	"encoding/json"
	"time"
)

type Risk struct {
	ID             string          `json:"id" db:"id"`
	RiskID         string          `json:"riskId" db:"risk_id"` // User-defined or system-generated readable ID
	Title          string          `json:"title" db:"title"`
	Description    *string         `json:"description,omitempty" db:"description"`
	Category       *string         `json:"category,omitempty" db:"category"`
	Likelihood     *string         `json:"likelihood,omitempty" db:"likelihood"`
	Impact         *string         `json:"impact,omitempty" db:"impact"`
	Status         string          `json:"status" db:"status"`
	OwnerUserID    *string         `json:"ownerUserId,omitempty" db:"owner_user_id"`
	Owner          *UserBasicInfo  `json:"owner,omitempty" db:"-"` // For joining user details
	Tags           json.RawMessage `json:"tags,omitempty" db:"tags"`
	CreatedAt      time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time       `json:"updatedAt" db:"updated_at"`
	RequirementIDs []string        `json:"requirementIds,omitempty" db:"-"` // For linking requirements
	Requirements   []Requirement   `json:"requirements,omitempty" db:"-"`   // For displaying linked requirements
}
