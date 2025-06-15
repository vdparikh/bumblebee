package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/store" // Changed to store
)

// IntegrationHandler handles API requests related to integrations and plugins.
type IntegrationHandler struct {
	dbStore *store.DBStore // Changed from pluginRegistry to dbStore
}

// NewIntegrationHandler creates a new IntegrationHandler.
func NewIntegrationHandler(s *store.DBStore) *IntegrationHandler { // Changed parameter
	return &IntegrationHandler{dbStore: s}
}

// GetIntegrationCheckTypesHandler serves the compiled check type configurations from all registered plugins.
func (h *IntegrationHandler) GetIntegrationCheckTypesHandler(c *gin.Context) {
	// Directly query the database via dbStore
	configs, err := h.dbStore.GetActiveCheckTypeConfigurations()
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to retrieve integration check types", err)
		return
	}
	c.JSON(http.StatusOK, configs)
}
