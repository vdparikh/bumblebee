package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

type DocumentHandler struct {
	Store *store.DBStore
}

func NewDocumentHandler(s *store.DBStore) *DocumentHandler {
	return &DocumentHandler{Store: s}
}

func (h *DocumentHandler) CreateDocumentHandler(c *gin.Context) {
	var doc models.Document
	if err := c.ShouldBindJSON(&doc); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body for document", err)
		return
	}

	id, err := h.Store.CreateDocument(&doc)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to create document", err)
		return
	}
	doc.ID = id // The store method already populates ID, CreatedAt, UpdatedAt
	c.JSON(http.StatusCreated, doc)
}

func (h *DocumentHandler) GetDocumentsHandler(c *gin.Context) {
	docs, err := h.Store.GetDocuments()
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to fetch documents", err)
		return
	}
	// Already handled in store: if docs == nil { docs = []models.Document{} }
	c.JSON(http.StatusOK, docs)
}

func (h *DocumentHandler) GetDocumentByIDHandler(c *gin.Context) {
	docID := c.Param("id")
	doc, err := h.Store.GetDocumentByID(docID)
	if err != nil {
		// Store's GetDocumentByID returns nil, nil for not found, so error check is primary
		sendError(c, http.StatusInternalServerError, "Failed to fetch document", err)
		return
	}
	if doc == nil {
		sendError(c, http.StatusNotFound, "Document not found", nil)
		return
	}
	c.JSON(http.StatusOK, doc)
}

func (h *DocumentHandler) UpdateDocumentHandler(c *gin.Context) {
	docID := c.Param("id")
	var payload models.Document

	if err := c.ShouldBindJSON(&payload); err != nil {
		sendError(c, http.StatusBadRequest, "Invalid request body for document update", err)
		return
	}

	// Ensure the ID from the path is used, not from the payload, for consistency
	payload.ID = docID

	// Fetch existing to ensure it exists, though UpdateDocument store method also checks
	existingDoc, err := h.Store.GetDocumentByID(docID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Error checking if document exists before update", err)
		return
	}
	if existingDoc == nil {
		sendError(c, http.StatusNotFound, "Document not found to update", nil)
		return
	}

	// The payload will overwrite all fields sent.
	// If partial updates are desired, fetch existingDoc and merge fields.
	// For now, assuming full update of settable fields.
	err = h.Store.UpdateDocument(&payload)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to update document", err)
		return
	}
	// Return the updated document (payload now has updated_at from DB)
	c.JSON(http.StatusOK, payload)
}

func (h *DocumentHandler) DeleteDocumentHandler(c *gin.Context) {
	docID := c.Param("id")
	// Optional: Check if document exists before attempting delete
	// existingDoc, _ := h.Store.GetDocumentByID(docID)
	// if existingDoc == nil {
	// 	sendError(c, http.StatusNotFound, "Document not found to delete", nil)
	// 	return
	// }

	err := h.Store.DeleteDocument(docID)
	if err != nil {
		// Check if the error is due to "not found" if your store method returns a specific error for that
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "not found for deletion") { // Example check
			sendError(c, http.StatusNotFound, "Document not found to delete", err)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to delete document", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Document deleted successfully"})
}
