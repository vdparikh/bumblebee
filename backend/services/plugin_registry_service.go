// File: services/integration_service.go
package services

import (
	"log"
	"sync"

	"github.com/vdparikh/compliance-automation/backend/integrations" // Adjust import path
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

type PluginRegistryService struct {
	mu                  sync.RWMutex
	dbStore             *store.DBStore                            // Added DBStore
	registeredPlugins   map[string]integrations.IntegrationPlugin // Keyed by plugin ID
	compiledCheckTypes  map[string]models.CheckTypeConfiguration  // Keyed by check type key (e.g., "http_get_check")
	checkTypeToPluginID map[string]string                         // Maps check type key to plugin ID
}

func NewPluginRegistryService(dbStore *store.DBStore) *PluginRegistryService {
	s := &PluginRegistryService{
		dbStore:             dbStore,
		registeredPlugins:   make(map[string]integrations.IntegrationPlugin),
		compiledCheckTypes:  make(map[string]models.CheckTypeConfiguration),
		checkTypeToPluginID: make(map[string]string),
	}
	// Optionally load configurations from DB on startup to populate in-memory caches
	// This is useful if the API needs to serve configs before all plugins are programmatically re-registered
	// in a new application instance.
	loadedConfigs, err := s.dbStore.GetActiveCheckTypeConfigurations()
	if err != nil {
		log.Printf("Warning: Failed to load plugin configurations from DB on startup: %v", err)
	} else {
		s.compiledCheckTypes = loadedConfigs
		log.Printf("Loaded %d check type configurations from database on startup.", len(s.compiledCheckTypes))
	}
	return s
}

// RegisterPlugin adds an integration plugin to the service.
// This is where a plugin "registers ... what parameters it needs".
// In a dynamic system, the "Integrations Page" would trigger actions that
// eventually call this method for newly enabled/configured plugins.
func (s *PluginRegistryService) RegisterPlugin(plugin integrations.IntegrationPlugin) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	pluginID := plugin.ID()
	pluginName := plugin.Name()
	checkConfigs := plugin.GetCheckTypeConfigurations()

	// Persist to DB
	if err := s.dbStore.CreateOrUpdateRegisteredPlugin(pluginID, pluginName, checkConfigs); err != nil {
		log.Printf("Error persisting plugin %s to DB: %v", pluginID, err)
		return err // Or handle more gracefully
	}

	// Update in-memory cache of actual plugin instances (for execution)
	s.registeredPlugins[pluginID] = plugin

	// Update in-memory caches for check types (primarily for GetPluginForCheckType)
	for key, config := range checkConfigs {
		s.compiledCheckTypes[key] = config // Keep this for immediate availability if DB load is slow/fails
		s.checkTypeToPluginID[key] = pluginID
	}
	log.Printf("Registered plugin: %s (%s) and persisted to DB.", pluginName, pluginID)
	return nil
}

// UnregisterPlugin marks a plugin as inactive in the DB and removes from in-memory execution caches.
func (s *PluginRegistryService) UnregisterPlugin(pluginID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Mark as inactive in DB
	if err := s.dbStore.SetRegisteredPluginActiveStatus(pluginID, false); err != nil {
		log.Printf("Error marking plugin %s as inactive in DB: %v", pluginID, err)
		// Continue to try and remove from memory
	}

	pluginInstance, exists := s.registeredPlugins[pluginID]
	if !exists {
		// Optionally, log a warning or return an error if re-registering
		// For now, allow re-registration to overwrite (e.g., for updates)
		return nil
	}

	// Remove its check types from the compiled list
	for key := range s.GetCheckTypeConfigurations() {
		delete(s.compiledCheckTypes, key)
		delete(s.checkTypeToPluginID, key)
	}
	// More robust: after marking inactive in DB, reload compiledCheckTypes or remove specific keys
	// For simplicity now, GetCheckTypeConfigurations will fetch fresh from DB.
	// We must remove from registeredPlugins and checkTypeToPluginID for execution.
	if pluginInstance != nil {
		for key := range pluginInstance.GetCheckTypeConfigurations() {
			delete(s.checkTypeToPluginID, key) // Important for GetPluginForCheckType
		}
	}
	delete(s.registeredPlugins, pluginID) // Remove executable instance

	// Reload compiledCheckTypes from DB to reflect the change for subsequent GetCheckTypeConfigurations calls
	// if they were to rely on the cache. But now it fetches directly.
	log.Printf("Unregistered plugin: %s (marked inactive in DB, removed from execution cache).", pluginID)
	return nil
}

// GetCheckTypeConfigurations returns all aggregated check type configurations from active plugins.
func (s *PluginRegistryService) GetCheckTypeConfigurations() map[string]models.CheckTypeConfiguration {
	configs, err := s.dbStore.GetActiveCheckTypeConfigurations()
	if err != nil {
		log.Printf("Error fetching active check type configurations from DB: %v. Returning empty map.", err)
		return make(map[string]models.CheckTypeConfiguration)
	}
	return configs
}

// GetPlugin retrieves a registered plugin by its ID.
func (s *PluginRegistryService) GetPlugin(pluginID string) (integrations.IntegrationPlugin, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	plugin, ok := s.registeredPlugins[pluginID]
	return plugin, ok
}

// GetPluginForCheckType retrieves the plugin responsible for a given check type key.
// It ensures the check type is active in DB before returning an in-memory executable plugin.
func (s *PluginRegistryService) GetPluginForCheckType(checkTypeKey string) (integrations.IntegrationPlugin, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Check if the check type is considered active based on current DB state
	activeConfigs := s.GetCheckTypeConfigurations() // Fetches active from DB
	if _, isActive := activeConfigs[checkTypeKey]; !isActive {
		log.Printf("Check type %s is not active or not found in DB configurations.", checkTypeKey)
		return nil, false
	}

	pluginID, ok := s.checkTypeToPluginID[checkTypeKey]
	if !ok {
		return nil, false
	}
	// Return the actual plugin instance from the in-memory map
	pluginInstance, pluginExists := s.registeredPlugins[pluginID]
	return pluginInstance, pluginExists
}
