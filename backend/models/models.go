package models

import "time"

type CheckDefinition struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CheckType   string            `json:"checkType"`
	Target      string            `json:"target"`     
	Parameters  map[string]string `json:"parameters"` 
	CreatedAt   time.Time         `json:"createdAt"`
	ScheduledAt *time.Time        `json:"scheduledAt,omitempty"` 
}

type CheckResult struct {
	ID                string    `json:"id"`
	CheckDefinitionID string    `json:"checkDefinitionId"`
	Timestamp         time.Time `json:"timestamp"`
	Status            string    `json:"status"` 
	Output            string    `json:"output"` 
}
