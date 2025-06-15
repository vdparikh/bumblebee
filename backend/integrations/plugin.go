// File: integrations/plugin.go
package integrations

import (
	"github.com/vdparikh/compliance-automation/backend/integrations/common"
	"github.com/vdparikh/compliance-automation/backend/models"
)

// IntegrationPlugin defines the interface for an integration.
// Each integration will provide one or more check type configurations.
type IntegrationPlugin interface {
	// ID provides a unique machine-readable identifier for the plugin.
	ID() string
	// Name provides a human-readable name for the plugin.
	Name() string
	// GetCheckTypeConfigurations returns a map of check type keys to their configurations.
	// The key (e.g., "http_get_check") should be unique and used by the frontend.
	GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration
	// Initialize is called when the plugin is registered and configured.
	// It can take a map of configurations specific to this plugin instance
	// (e.g., API keys, global settings for this integration).
	// Initialize(config map[string]string) error
	// ExecuteCheck performs the actual check logic.
	ExecuteCheck(ctx common.CheckContext, checkTypeKey string) (common.ExecutionResult, error)
}

// PluginRegistry defines the interface for a service that can provide plugins.
type PluginRegistry interface {
	GetPluginForCheckType(checkTypeKey string) (IntegrationPlugin, bool)
}
