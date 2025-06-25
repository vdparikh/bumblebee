package store

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid" // For handling PostgreSQL arrays if needed for other fields
	"github.com/vdparikh/compliance-automation/backend/models"
)

// ReviewEvidenceUpdateRequest defines the fields that can be updated during an evidence review.
type ReviewEvidenceUpdateRequest struct {
	ReviewStatus   string `json:"review_status" binding:"required,oneof=Approved Rejected"`
	ReviewComments string `json:"review_comments"`
}

// CreateEvidence adds a new evidence record to the database using sqlx.
func (s *DBStore) CreateEvidence(evidence *models.Evidence) (string, error) {
	if evidence.ID == "" {
		evidence.ID = uuid.NewString()
	}
	evidence.UploadedAt = time.Now()
	// Default review status if not set
	if evidence.ReviewStatus == nil || *evidence.ReviewStatus == "" {
		defaultStatus := "Pending"
		evidence.ReviewStatus = &defaultStatus
	}
	evidence.CreatedAt = time.Now() // Ensure these are set if not already
	evidence.UpdatedAt = time.Now()

	query := `
		INSERT INTO evidence (
			id, task_id, campaign_task_instance_id, uploaded_by_user_id, file_name,
			file_path, mime_type, file_size, description, uploaded_at,
			review_status, reviewed_by_user_id, reviewed_at, review_comments, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		) RETURNING id`

	err := s.DB.QueryRowx(query, // Use QueryRowx for INSERT with RETURNING id
		evidence.ID, evidence.TaskID, evidence.CampaignTaskInstanceID, evidence.UploadedByUserID, evidence.FileName,
		evidence.FilePath, evidence.MimeType, evidence.FileSize, evidence.Description, evidence.UploadedAt,
		evidence.ReviewStatus, evidence.ReviewedByUserID, evidence.ReviewedAt, evidence.ReviewComments,
		evidence.CreatedAt, evidence.UpdatedAt).Scan(&evidence.ID) // Scan the returned ID

	if err != nil {
		log.Printf("Error creating evidence in DB: %v. Evidence: %+v", err, evidence)
		return "", fmt.Errorf("failed to create evidence: %w", err)
	}
	return evidence.ID, nil
}

// GetEvidenceByID retrieves a single evidence item by its ID using sqlx.
func (s *DBStore) GetEvidenceByID(evidenceID string) (*models.Evidence, error) {
	var evidence models.Evidence
	query := `
		SELECT
			e.id, e.campaign_task_instance_id, e.uploaded_by_user_id,
			e.task_id, e.file_name, e.file_path, e.mime_type, e.file_size, e.description, e.uploaded_at,
			e.review_status, e.reviewed_by_user_id, e.reviewed_at, e.review_comments,
			uploader.id AS "uploadedbyuser.id", uploader.name AS "uploadedbyuser.name", uploader.email AS "uploadedbyuser.email", uploader.role AS "uploadedbyuser.role",
			COALESCE(reviewer.id, '') AS "reviewedbyuser.id", reviewer.name AS "reviewedbyuser.name", reviewer.email AS "reviewedbyuser.email", reviewer.role AS "reviewedbyuser.role",
			e.created_at, e.updated_at
		FROM evidence e
		LEFT JOIN users uploader ON e.uploaded_by_user_id = uploader.id
		LEFT JOIN users reviewer ON e.reviewed_by_user_id = reviewer.id
		WHERE e.id = $1`

	err := s.DB.Get(&evidence, query, evidenceID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound // ErrNotFound should be defined in this package or imported
		}
		log.Printf("Error getting evidence by ID from DB: %v", err)
		return nil, fmt.Errorf("failed to get evidence by ID %s: %w", evidenceID, err)
	}
	return &evidence, nil
}

// UpdateEvidenceReview updates the review status and related fields of an evidence item using sqlx.
func (s *DBStore) UpdateEvidenceReview(evidenceID string, reviewedByUserID string, req ReviewEvidenceUpdateRequest) (*models.Evidence, error) {
	now := time.Now()
	reviewStatus := sql.NullString{String: req.ReviewStatus, Valid: true}
	reviewComments := sql.NullString{String: req.ReviewComments, Valid: req.ReviewComments != ""}
	reviewerID := sql.NullString{String: reviewedByUserID, Valid: true}
	reviewedAt := sql.NullTime{Time: now, Valid: true}
	// updated_at is handled by DB trigger or set explicitly if no trigger

	query := `
		UPDATE evidence SET
			review_status = $1,
			review_comments = $2,
			reviewed_by_user_id = $3,
			reviewed_at = $4
			-- updated_at = NOW() -- Let DB trigger handle or set explicitly
		WHERE id = $5` // Ensure no trailing comma if updated_at is not set here

	result, err := s.DB.Exec(query, reviewStatus, reviewComments, reviewerID, reviewedAt, evidenceID)
	if err != nil {
		log.Printf("Error updating evidence review in DB: %v. EvidenceID: %s", err, evidenceID)
		return nil, fmt.Errorf("failed to update evidence review for %s: %w", evidenceID, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("failed to get rows affected for evidence review update %s: %w", evidenceID, err)
	}
	if rowsAffected == 0 {
		return nil, ErrNotFound // Or a more specific "evidence not found for update"
	}

	return s.GetEvidenceByID(evidenceID) // Return the updated record with preloads
}

// GetEvidenceByCampaignTaskInstanceID retrieves all evidence for a specific campaign task instance using sqlx.
func (s *DBStore) GetEvidenceByCampaignTaskInstanceID(instanceID string) ([]*models.Evidence, error) {
	var evidenceList []*models.Evidence
	query := `
		SELECT
			e.id, e.task_id, e.campaign_task_instance_id, e.uploaded_by_user_id,
			e.file_name, e.file_path, e.mime_type, e.file_size, e.description, e.uploaded_at,
			e.review_status, e.reviewed_by_user_id, e.reviewed_at, e.review_comments, e.created_at, e.updated_at,
			uploader.id AS "uploadedbyuser.id", uploader.name AS "uploadedbyuser.name", uploader.email AS "uploadedbyuser.email", uploader.role AS "uploadedbyuser.role",
			reviewer.id AS "reviewedbyuser.id", reviewer.name AS "reviewedbyuser.name", reviewer.email AS "reviewedbyuser.email", reviewer.role AS "reviewedbyuser.role"
		FROM evidence e
		LEFT JOIN users uploader ON e.uploaded_by_user_id = uploader.id
		LEFT JOIN users reviewer ON e.reviewed_by_user_id = reviewer.id
		WHERE e.campaign_task_instance_id = $1
		ORDER BY e.uploaded_at DESC`

	err := s.DB.Select(&evidenceList, query, instanceID)
	if err != nil {
		log.Printf("Error getting evidence by campaign task instance ID from DB: %v", err)
		return nil, fmt.Errorf("failed to get evidence for instance %s: %w", instanceID, err)
	}
	if evidenceList == nil { // sqlx.Select initializes the slice if no rows are found, so this check might be redundant
		evidenceList = []*models.Evidence{} // Ensure an empty slice is returned, not nil
	}
	return evidenceList, nil
}

// AddGenericEvidenceToCampaignTaskInstance creates a new evidence record from generic data using sqlx.
func (s *DBStore) AddGenericEvidenceToCampaignTaskInstance(instanceID string, evidenceData *models.Evidence) (*models.Evidence, error) {
	evidenceData.CampaignTaskInstanceID = &instanceID
	if evidenceData.UploadedByUserID == "" {
		// This should ideally be set by the handler from the authenticated user
		return nil, errors.New("uploader user ID is required for adding evidence")
	}
	// Default review status if not set
	if evidenceData.ReviewStatus == nil || *evidenceData.ReviewStatus == "" {
		defaultStatus := "Pending"
		evidenceData.ReviewStatus = &defaultStatus
	}
	evidenceData.TaskID = nil // Generic evidence added to CTI should not have a master TaskID
	newID, err := s.CreateEvidence(evidenceData)
	if err != nil {
		return nil, err
	}
	return s.GetEvidenceByID(newID)
}

// SaveEvidence is a general purpose save method for an evidence model using sqlx.
// This would typically be an UPSERT or separate Create/Update methods.
// For simplicity, this example assumes an update. If ID is not set, it should call CreateEvidence.
func (s *DBStore) SaveEvidence(evidence *models.Evidence) (*models.Evidence, error) {
	if evidence.ID == "" {
		// This indicates a new record, should ideally call CreateEvidence
		return nil, errors.New("SaveEvidence called without an ID, use CreateEvidence for new records")
	} // evidence.UpdatedAt will be handled by DB trigger or set explicitly if no trigger

	query := `
		UPDATE evidence SET
			task_id = $1, campaign_task_instance_id = $2,
			uploaded_by_user_id = $2,
			file_name = $3,
			file_path = $4,
			mime_type = $5,
			file_size = $6,
			description = $7,
			-- uploaded_at should generally not be updated
			review_status = $8,
			reviewed_by_user_id = $9,
			reviewed_at = $10,
			review_comments = $11
			-- updated_at is handled by DB trigger
		WHERE id = $13`

	_, err := s.DB.Exec(query,
		evidence.TaskID, evidence.CampaignTaskInstanceID, evidence.UploadedByUserID, evidence.FileName,
		evidence.FilePath, evidence.MimeType, evidence.FileSize, evidence.Description,
		evidence.ReviewStatus, evidence.ReviewedByUserID, evidence.ReviewedAt, evidence.ReviewComments, // Removed evidence.UpdatedAt
		evidence.ID,
	)
	if err != nil {
		log.Printf("Error saving (updating) evidence in DB: %v. EvidenceID: %s", err, evidence.ID)
		return nil, fmt.Errorf("failed to save evidence %s: %w", evidence.ID, err)
	}
	return s.GetEvidenceByID(evidence.ID)
}

// ListAllEvidence retrieves all evidence records for the Evidence Library, ordered by uploaded date descending.
func (s *DBStore) ListAllEvidence() ([]*models.Evidence, error) {
	var evidenceList []*models.Evidence
	query := `
		SELECT
			e.id, e.task_id, e.campaign_task_instance_id, e.uploaded_by_user_id,
			e.file_name, e.file_path, e.mime_type, e.file_size, e.description, e.uploaded_at,
			e.review_status, e.reviewed_by_user_id, e.reviewed_at, e.review_comments, e.created_at, e.updated_at,
			uploader.id, uploader.name, uploader.email, uploader.role,
			reviewer.id, reviewer.name, reviewer.email, reviewer.role
		FROM evidence e
		LEFT JOIN users uploader ON e.uploaded_by_user_id = uploader.id
		LEFT JOIN users reviewer ON e.reviewed_by_user_id = reviewer.id
		ORDER BY e.uploaded_at DESC`

	rows, err := s.DB.Queryx(query)
	if err != nil {
		log.Printf("Error listing all evidence from DB: %v", err)
		return nil, fmt.Errorf("failed to list all evidence: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var ev models.Evidence
		var uploaderID, uploaderName, uploaderEmail, uploaderRole sql.NullString
		var reviewerID, reviewerName, reviewerEmail, reviewerRole sql.NullString

		err := rows.Scan(
			&ev.ID, &ev.TaskID, &ev.CampaignTaskInstanceID, &ev.UploadedByUserID,
			&ev.FileName, &ev.FilePath, &ev.MimeType, &ev.FileSize, &ev.Description, &ev.UploadedAt,
			&ev.ReviewStatus, &ev.ReviewedByUserID, &ev.ReviewedAt, &ev.ReviewComments, &ev.CreatedAt, &ev.UpdatedAt,
			&uploaderID, &uploaderName, &uploaderEmail, &uploaderRole,
			&reviewerID, &reviewerName, &reviewerEmail, &reviewerRole,
		)
		if err != nil {
			log.Printf("Error scanning evidence row: %v", err)
			continue
		}
		if uploaderID.Valid {
			ev.UploadedByUser = &models.User{
				ID:    uploaderID.String,
				Name:  uploaderName.String,
				Email: uploaderEmail.String,
				Role:  uploaderRole.String,
			}
		}
		if reviewerID.Valid {
			ev.ReviewedByUser = &models.User{
				ID:    reviewerID.String,
				Name:  reviewerName.String,
				Email: reviewerEmail.String,
				Role:  reviewerRole.String,
			}
		}
		evidenceList = append(evidenceList, &ev)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate evidence rows: %w", err)
	}
	if evidenceList == nil {
		evidenceList = []*models.Evidence{}
	}
	return evidenceList, nil
}
