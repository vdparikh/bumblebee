package models

import (
	"time"
)

type Team struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description,omitempty" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	Members     []User    `json:"members,omitempty"` // Populated by JOINs or separate queries
}

type TeamMember struct { // Used if directly managing the join table, often not exposed as a primary model
	TeamID     string    `json:"team_id" db:"team_id"`
	UserID     string    `json:"user_id" db:"user_id"`
	RoleInTeam string    `json:"role_in_team" db:"role_in_team"`
	AddedAt    time.Time `json:"added_at" db:"added_at"`
}
