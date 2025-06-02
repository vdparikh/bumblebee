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
	doc.ID = id 
	c.JSON(http.StatusCreated, doc)
}

func (h *DocumentHandler) GetDocumentsHandler(c *gin.Context) {
	docs, err := h.Store.GetDocuments()
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to fetch documents", err)
		return
	}
	c.JSON(http.StatusOK, docs)
}

func (h *DocumentHandler) GetDocumentByIDHandler(c *gin.Context) {
	docID := c.Param("id")
	doc, err := h.Store.GetDocumentByID(docID)
	if err != nil {
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

	payload.ID = docID

	existingDoc, err := h.Store.GetDocumentByID(docID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Error checking if document exists before update", err)
		return
	}
	if existingDoc == nil {
		sendError(c, http.StatusNotFound, "Document not found to update", nil)
		return
	}

	err = h.Store.UpdateDocument(&payload)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "Failed to update document", err)
		return
	}
	c.JSON(http.StatusOK, payload)
}

func (h *DocumentHandler) DeleteDocumentHandler(c *gin.Context) {
	docID := c.Param("id")

	err := h.Store.DeleteDocument(docID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "not found for deletion") { 
			sendError(c, http.StatusNotFound, "Document not found to delete", err)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to delete document", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Document deleted successfully"})
}
