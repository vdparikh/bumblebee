package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/store"
)

type SystemDefinitionHandler struct {
	Store *store.DBStore
}

func NewSystemDefinitionHandler(s *store.DBStore) *SystemDefinitionHandler {
	return &SystemDefinitionHandler{Store: s}
}

func (h *SystemDefinitionHandler) GetSystemTypeDefinitionsHandler(c *gin.Context) {
	definitions, err := h.Store.GetSystemTypeDefinitions()
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to retrieve system type definitions", err)
		return
	}
	c.JSON(http.StatusOK, definitions)
}
