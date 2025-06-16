package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// ConfigFieldDefinition matches the structure in frontend's configurationSchemas
type ConfigFieldDefinition struct {
	Name        string   `json:"name"`
	Label       string   `json:"label"`
	Type        string   `json:"type"` // "text", "password", "select", "url", "number", "textarea"
	Placeholder *string  `json:"placeholder,omitempty"`
	Required    bool     `json:"required"`
	Sensitive   bool     `json:"sensitive,omitempty"`
	Options     []string `json:"options,omitempty"` // For type "select" (simple string options)
	HelpText    *string  `json:"helpText,omitempty"`
}

// ConfigurationSchema is a slice of ConfigFieldDefinition
type ConfigurationSchema []ConfigFieldDefinition

// Value makes ConfigurationSchema implement the driver.Valuer interface.
func (cs ConfigurationSchema) Value() (driver.Value, error) {
	if cs == nil {
		return json.Marshal([]ConfigFieldDefinition{}) // Store as empty array if nil
	}
	return json.Marshal(cs)
}

// Scan makes ConfigurationSchema implement the sql.Scanner interface.
func (cs *ConfigurationSchema) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed for ConfigurationSchema")
	}
	return json.Unmarshal(b, &cs)
}

type SystemTypeDefinition struct {
	Value               string              `json:"value" db:"value"`
	Label               string              `json:"label" db:"label"`
	Description         *string             `json:"description,omitempty" db:"description"`
	IconName            *string             `json:"iconName,omitempty" db:"icon_name"`
	Color               *string             `json:"color,omitempty" db:"color"`
	Category            *string             `json:"category,omitempty" db:"category"`
	ConfigurationSchema ConfigurationSchema `json:"configurationSchema,omitempty" db:"configuration_schema"`
	CreatedAt           time.Time           `json:"createdAt" db:"created_at"`
	UpdatedAt           time.Time           `json:"updatedAt" db:"updated_at"`
}
