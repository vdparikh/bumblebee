package store

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/vdparikh/compliance-automation/backend/models"
)

func (s *DBStore) CreateDocument(doc *models.Document) (string, error) {
	query := `INSERT INTO documents (name, description, document_type, source_url, internal_reference)
              VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`
	err := s.DB.QueryRow(query, doc.Name, doc.Description, doc.DocumentType, doc.SourceURL, doc.InternalReference).Scan(&doc.ID, &doc.CreatedAt, &doc.UpdatedAt)
	if err != nil {
		log.Printf("Error creating document in DB: %v", err)
		return "", fmt.Errorf("failed to create document: %w", err)
	}
	return doc.ID, nil
}

func (s *DBStore) GetDocumentByID(id string) (*models.Document, error) {
	var doc models.Document
	query := `SELECT id, name, description, document_type, source_url, internal_reference, created_at, updated_at
              FROM documents WHERE id = $1`
	err := s.DB.Get(&doc, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil 
		}
		log.Printf("Error getting document by ID from DB: %v", err)
		return nil, fmt.Errorf("failed to get document by ID %s: %w", id, err)
	}
	return &doc, nil
}

func (s *DBStore) GetDocuments() ([]models.Document, error) {
	var docs []models.Document
	query := `SELECT id, name, description, document_type, source_url, internal_reference, created_at, updated_at
              FROM documents ORDER BY name ASC`
	err := s.DB.Select(&docs, query)
	if err != nil {
		log.Printf("Error getting documents from DB: %v", err)
		return nil, fmt.Errorf("failed to get documents: %w", err)
	}
	if docs == nil {
		docs = []models.Document{}
	}
	return docs, nil
}

func (s *DBStore) UpdateDocument(doc *models.Document) error {
	query := `UPDATE documents SET
                name = $1,
                description = $2,
                document_type = $3,
                source_url = $4,
                internal_reference = $5
              WHERE id = $6 RETURNING updated_at`
	err := s.DB.QueryRow(query, doc.Name, doc.Description, doc.DocumentType, doc.SourceURL, doc.InternalReference, doc.ID).Scan(&doc.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("document with ID %s not found for update", doc.ID)
		}
		log.Printf("Error updating document in DB: %v", err)
		return fmt.Errorf("failed to update document %s: %w", doc.ID, err)
	}
	return nil
}

func (s *DBStore) DeleteDocument(id string) error {
	query := `DELETE FROM documents WHERE id = $1`
	result, err := s.DB.Exec(query, id)
	if err != nil {
		log.Printf("Error deleting document from DB: %v", err)
		return fmt.Errorf("failed to delete document %s: %w", id, err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected after delete for document %s: %w", id, err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("document with ID %s not found for deletion", id)
	}
	return nil
}

var _ Store = (*DBStore)(nil)
