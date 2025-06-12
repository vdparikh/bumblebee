package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"reflect"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
	"github.com/vdparikh/compliance-automation/backend/utils"
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

	// Audit log for document creation
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging create document %s", doc.ID)
	}
	auditChanges := map[string]interface{}{
		"id":                 doc.ID,
		"name":               doc.Name,
		"description":        doc.Description,
		"document_type":      doc.DocumentType,
		"source_url":         doc.SourceURL,
		"internal_reference": doc.InternalReference,
	}
	if errLog := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "create_document", "document", doc.ID, auditChanges); errLog != nil {
		log.Printf("Error recording audit log for create document %s: %v", doc.ID, errLog)
	}

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

	// Audit log for document update
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging update document %s", docID)
	}

	auditChanges := make(map[string]interface{})
	if existingDoc.Name != payload.Name {
		auditChanges["name"] = map[string]string{"old": existingDoc.Name, "new": payload.Name}
	}
	if existingDoc.Description != payload.Description { // Assuming Description is not a pointer in model
		auditChanges["description"] = map[string]string{"old": existingDoc.Description, "new": payload.Description}
	}
	if existingDoc.DocumentType != payload.DocumentType {
		auditChanges["document_type"] = map[string]string{"old": existingDoc.DocumentType, "new": payload.DocumentType}
	}
	if existingDoc.SourceURL != payload.SourceURL { // Assuming SourceURL is not a pointer
		auditChanges["source_url"] = map[string]string{"old": existingDoc.SourceURL, "new": payload.SourceURL}
	}
	if existingDoc.InternalReference != payload.InternalReference { // Assuming InternalReference is not a pointer
		auditChanges["internal_reference"] = map[string]string{"old": existingDoc.InternalReference, "new": payload.InternalReference}
	}

	if len(auditChanges) > 0 {
		if errLog := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "update_document", "document", docID, auditChanges); errLog != nil {
			log.Printf("Error recording audit log for update document %s: %v", docID, errLog)
		}
	}

	c.JSON(http.StatusOK, payload)
}

func (h *DocumentHandler) DeleteDocumentHandler(c *gin.Context) {
	docID := c.Param("id")

	// Fetch document details before deleting for audit logging
	docToDelete, errGet := h.Store.GetDocumentByID(docID)
	if errGet != nil {
		log.Printf("Warning: Could not fetch document %s before deletion for audit log: %v", docID, errGet)
		// If not found, DeleteDocument will likely also fail, which is handled below.
	}


	err := h.Store.DeleteDocument(docID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "not found for deletion") {
			sendError(c, http.StatusNotFound, "Document not found to delete", err)
			return
		}
		sendError(c, http.StatusInternalServerError, "Failed to delete document", err)
		return
	}

	// Audit log for document deletion
	actorUserID, exists := c.Get("userID")
	var actorUserIDStrPtr *string
	if exists {
		uid := actorUserID.(string)
		actorUserIDStrPtr = &uid
	} else {
		log.Printf("Warning: UserID not found in context for audit logging delete document %s", docID)
	}
	auditChanges := map[string]interface{}{
		"deleted_document_id": docID,
	}
	if docToDelete != nil { // If we managed to fetch it
		auditChanges["name"] = docToDelete.Name
		auditChanges["document_type"] = docToDelete.DocumentType
	}
	if errLog := utils.RecordAuditLog(h.Store, actorUserIDStrPtr, "delete_document", "document", docID, auditChanges); errLog != nil {
		log.Printf("Error recording audit log for delete document %s: %v", docID, errLog)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Document deleted successfully"})
}
