package store

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/vdparikh/compliance-automation/backend/models"
)

type Store interface {
	CreateTask(task *models.Task) (string, error)
	GetTasks(userID, userField string) ([]models.Task, error)
	GetTaskByID(taskID string) (*models.Task, error)
	UpdateTask(task *models.Task) error
	GetTasksByRequirementID(requirementID string) ([]models.Task, error)
	CreateRequirement(req *models.Requirement) error
	GetRequirements() ([]models.Requirement, error)
	GetRequirementByID(id string) (*models.Requirement, error)
	UpdateRequirement(req *models.Requirement) error
	CreateUser(user *models.User) error
	GetUsers() ([]models.User, error)
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(userID uuid.UUID) (*models.User, error)
	UpdateUserPassword(userID string, newHashedPassword string) error
	CreateComplianceStandard(standard *models.ComplianceStandard) error
	GetComplianceStandards() ([]models.ComplianceStandard, error)
	UpdateStandard(standard *models.ComplianceStandard) error
	CreateTaskComment(comment *models.Comment) error
	GetTaskComments(taskID string, campaignTaskInstanceID string) ([]models.Comment, error)
	// CreateTaskEvidence(evidence *models.Evidence) error
	GetTaskEvidence(taskID string) ([]models.Evidence, error)
	CreateCampaign(campaign *models.Campaign, selectedReqs []models.CampaignSelectedRequirement) (string, error)
	GetCampaigns(campaignStatus string) ([]models.Campaign, error)
	GetCampaignByID(campaignID string) (*models.Campaign, error)
	UpdateCampaign(campaign *models.Campaign, newSelectedReqs []models.CampaignSelectedRequirement) error
	DeleteCampaign(campaignID string) error
	GetCampaignSelectedRequirements(campaignID string) ([]models.CampaignSelectedRequirement, error)
	CreateCampaignTaskInstance(tx *sql.Tx, cti *models.CampaignTaskInstance) (string, error)
	GetCampaignTaskInstances(campaignID string, userID string, userField string) ([]models.CampaignTaskInstance, error)
	GetCampaignTaskInstanceByID(ctiID string) (*models.CampaignTaskInstance, error)
	UpdateCampaignTaskInstance(cti *models.CampaignTaskInstance) error
	GetCampaignTaskInstancesForUser(userID string, userField string, campaignStatus string) ([]models.CampaignTaskInstance, error)
	GetTaskInstancesByMasterTaskID(masterTaskID string) ([]models.CampaignTaskInstance, error)

	// Team Management
	CreateTeam(team *models.Team) (string, error)
	GetTeamByID(teamID string) (*models.Team, error)
	GetTeams() ([]models.Team, error)
	UpdateTeam(team *models.Team) error
	DeleteTeam(teamID string) error
	AddUserToTeam(teamID string, userID string, roleInTeam string) error
	RemoveUserFromTeam(teamID string, userID string) error
	GetTeamMembers(teamID string) ([]models.User, error)

	GetUserActivityFeed(userID string, limit, offset int) ([]models.Comment, error)
	CopyEvidenceToTaskInstance(targetInstanceID string, sourceEvidenceIDs []string, uploaderUserID string) error

	// Audit Log
	InsertAuditLog(log *models.AuditLog) error
	GetAuditLogs(filters map[string]interface{}, page, limit int) ([]models.AuditLog, int, error)
}

var ErrNotFound = errors.New("record not found")

type DBStore struct {
	DB *sqlx.DB
}

func NewDBStore(dataSourceName string) (*DBStore, error) {
	db, err := sqlx.Open("postgres", dataSourceName)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err = db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Successfully connected to the database!")
	return &DBStore{DB: db}, nil
}

var _ Store = (*DBStore)(nil) // Interface satisfaction check

// InsertAuditLog inserts a new audit log entry into the database.
func (s *DBStore) InsertAuditLog(log *models.AuditLog) error {
	// The 'id', 'timestamp', and 'created_at' fields in audit_logs table have DB defaults.
	// We are providing 'timestamp' from the application to ensure it matches event time.
	// 'changes' can be null if log.Changes is nil or empty.

	query := `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, timestamp)
              VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`

	var insertedID uuid.UUID
	var createdAt time.Time

	// Handle nil UserID correctly for SQL insertion
	var userID sql.NullString
	if log.UserID != nil {
		userID.String = *log.UserID
		userID.Valid = true
	}

	// Handle nil Changes (JSONB) correctly
	var changesJSON []byte
	if log.Changes != nil && len(log.Changes) > 0 {
		changesJSON = []byte(log.Changes)
	} else {
		changesJSON = nil // Explicitly pass nil for database NULL
	}

	err := s.DB.QueryRow(query, userID, log.Action, log.EntityType, log.EntityID, changesJSON, log.Timestamp).Scan(&insertedID, &createdAt)
	if err != nil {
		// It's good to wrap the error with more context if it's not already descriptive.
		return fmt.Errorf("error inserting audit log into database: %w. Details - UserID: %v, Action: %s, EntityType: %s, EntityID: %s",
			err, log.UserID, log.Action, log.EntityType, log.EntityID)
	}
	log.ID = insertedID.String() // Update the model with the returned ID
	log.Timestamp = createdAt    // Update the model with the returned creation timestamp (from DB)
	return nil
}

func (s *DBStore) CreateTask(task *models.Task) (string, error) {
	task.ID = uuid.NewString()
	task.CreatedAt = time.Now()
	task.UpdatedAt = time.Now()

	tx, err := s.DB.Beginx()
	if err != nil {
		return "", fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	paramsJSON, err := json.Marshal(task.Parameters)
	if err != nil {
		return "", fmt.Errorf("failed to marshal task parameters: %w", err)
	}

	tagsJSON := task.Tags
	if tagsJSON == nil {
		tagsJSON = json.RawMessage([]byte("[]"))
	}

	linkedDocIDs := pq.Array(task.LinkedDocumentIDs)
	evidenceTypesExpected := pq.Array(task.EvidenceTypesExpected)

	query := `
		INSERT INTO tasks (
			id, title, description, category, created_at, updated_at, version, priority, status, tags, high_level_check_type, check_type, target, parameters, linked_document_ids, evidence_types_expected, default_priority
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		) RETURNING id
	`
	_, err = tx.Exec(query,
		task.ID,
		task.Title,
		task.Description,
		task.Category,
		task.CreatedAt,
		task.UpdatedAt,
		task.Version,
		task.Priority,
		task.Status,
		tagsJSON,
		task.HighLevelCheckType,
		task.CheckType,
		task.Target,
		paramsJSON,
		linkedDocIDs,
		evidenceTypesExpected,
		task.DefaultPriority,
	)
	if err != nil {
		return "", fmt.Errorf("failed to insert task: %w", err)
	}

	// Insert task-requirement associations
	if len(task.RequirementIDs) > 0 {
		stmt, err := tx.Preparex(`
			INSERT INTO task_requirements (task_id, requirement_id)
			VALUES ($1, $2)
		`)
		if err != nil {
			return "", fmt.Errorf("failed to prepare task_requirements insert statement: %w", err)
		}
		defer stmt.Close()

		for _, reqID := range task.RequirementIDs {
			_, err = stmt.Exec(task.ID, reqID)
			if err != nil {
				return "", fmt.Errorf("failed to insert task-requirement association: %w", err)
			}
		}
	}

	// Link documents if any
	if len(task.LinkedDocumentIDs) > 0 {
		if err := s.linkDocumentsToTask(tx, task.ID, task.LinkedDocumentIDs); err != nil {
			return "", fmt.Errorf("failed to link documents to task: %w", err)
		}
	}

	if err = tx.Commit(); err != nil {
		return "", fmt.Errorf("failed to commit transaction: %w", err)
	}

	return task.ID, nil
}

func (s *DBStore) GetTasks(userID, userField string) ([]models.Task, error) {
	baseQuery := `
		SELECT t.id, t.title, t.description, t.category, t.created_at, t.updated_at,
		       t.version, t.priority, t.status, t.tags, t.high_level_check_type, t.check_type, t.target, t.parameters, t.evidence_types_expected, t.default_priority,
		       COALESCE(
			   json_agg(
				   json_build_object(
					   'id', r.id,
					   'controlIdReference', r.control_id_reference,
					   'requirementText', r.requirement_text
				   )
			   ) FILTER (WHERE r.id IS NOT NULL),
			   '[]'
		   ) as requirements
		FROM tasks t
		LEFT JOIN task_requirements tr ON t.id = tr.task_id
		LEFT JOIN requirements r ON tr.requirement_id = r.id
	`
	var args []interface{}

	if userID != "" {
		baseQuery += " WHERE "
		if userField == "owner" {
			baseQuery += "t.owner_user_id = $1"
		} else if userField == "assignee" {
			baseQuery += "t.assignee_user_id = $1"
		}
		args = append(args, userID)
	}

	baseQuery += " GROUP BY t.id ORDER BY t.created_at DESC"

	rows, err := s.DB.Query(baseQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query tasks: %w", err)
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var t models.Task
		var paramsJSON []byte
		var requirementsJSON []byte
		var tagsJSON []byte

		err := rows.Scan(
			&t.ID, &t.Title, &t.Description, &t.Category,
			&t.CreatedAt, &t.UpdatedAt,
			&t.Version, &t.Priority, &t.Status, &tagsJSON, &t.HighLevelCheckType, &t.CheckType, &t.Target,
			&paramsJSON, pq.Array(&t.EvidenceTypesExpected), &t.DefaultPriority,
			&requirementsJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task row: %w", err)
		}

		// Parse tags
		if len(tagsJSON) > 0 && string(tagsJSON) != "null" {
			t.Tags = tagsJSON
		} else {
			t.Tags = []byte("[]")
		}

		// Parse parameters
		if len(paramsJSON) > 0 && string(paramsJSON) != "null" {
			if err := json.Unmarshal(paramsJSON, &t.Parameters); err != nil {
				log.Printf("Warning: failed to unmarshal parameters for task %s: %v", t.ID, err)
				t.Parameters = make(map[string]interface{})
			}
		} else {
			t.Parameters = make(map[string]interface{})
		}

		// Parse requirements
		if len(requirementsJSON) > 0 && string(requirementsJSON) != "null" {
			if err := json.Unmarshal(requirementsJSON, &t.Requirements); err != nil {
				log.Printf("Warning: failed to unmarshal requirements for task %s: %v", t.ID, err)
			}
			// Populate RequirementIDs from Requirements
			t.RequirementIDs = make([]string, len(t.Requirements))
			for i, req := range t.Requirements {
				t.RequirementIDs[i] = req.ID
			}
		}

		// Get linked documents
		linkedDocs, err := s.getLinkedDocumentsForTask(t.ID)
		if err != nil {
			log.Printf("Warning: failed to fetch linked documents for task %s: %v", t.ID, err)
		}
		t.LinkedDocuments = linkedDocs

		tasks = append(tasks, t)
	}

	return tasks, rows.Err()
}

func (s *DBStore) GetTaskByID(taskID string) (*models.Task, error) {
	query := `
		SELECT t.id, t.title, t.description, t.category, t.created_at, t.updated_at, 
		       t.check_type, t.target, t.parameters, t.evidence_types_expected, t.default_priority,
		       COALESCE(
			   json_agg(
				   json_build_object(
					   'id', r.id,
					   'controlIdReference', r.control_id_reference,
					   'requirementText', r.requirement_text,
					   'standardId', r.standard_id
				   )
			   ) FILTER (WHERE r.id IS NOT NULL),
			   '[]'
		   ) as requirements
		FROM tasks t
		LEFT JOIN task_requirements tr ON t.id = tr.task_id
		LEFT JOIN requirements r ON tr.requirement_id = r.id
		WHERE t.id = $1
		GROUP BY t.id
	`
	var task models.Task
	var paramsJSON []byte
	var requirementsJSON []byte

	err := s.DB.QueryRow(query, taskID).Scan(
		&task.ID, &task.Title, &task.Description, &task.Category,
		&task.CreatedAt, &task.UpdatedAt, &task.CheckType, &task.Target,
		&paramsJSON, pq.Array(&task.EvidenceTypesExpected), &task.DefaultPriority,
		&requirementsJSON,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	// Parse parameters
	if len(paramsJSON) > 0 && string(paramsJSON) != "null" {
		if err := json.Unmarshal(paramsJSON, &task.Parameters); err != nil {
			return nil, fmt.Errorf("failed to unmarshal task parameters: %w", err)
		}
	} else {
		task.Parameters = make(map[string]interface{})
	}

	// Parse requirements
	if len(requirementsJSON) > 0 && string(requirementsJSON) != "null" {
		if err := json.Unmarshal(requirementsJSON, &task.Requirements); err != nil {
			return nil, fmt.Errorf("failed to unmarshal task requirements: %w", err)
		}
		// Populate RequirementIDs from Requirements
		task.RequirementIDs = make([]string, len(task.Requirements))
		for i, req := range task.Requirements {
			task.RequirementIDs[i] = req.ID
		}
	}

	// Get linked documents
	linkedDocs, err := s.getLinkedDocumentsForTask(task.ID)
	if err != nil {
		log.Printf("Warning: failed to fetch linked documents for task %s: %v", task.ID, err)
	}
	task.LinkedDocuments = linkedDocs

	return &task, nil
}

func (s *DBStore) UpdateTask(task *models.Task) error {
	task.UpdatedAt = time.Now()

	tx, err := s.DB.Beginx()
	if err != nil {
		return fmt.Errorf("failed to begin transaction for task update: %w", err)
	}
	defer tx.Rollback()

	paramsJSON, err := json.Marshal(task.Parameters)
	if err != nil {
		return fmt.Errorf("failed to marshal task parameters: %w", err)
	}

	tagsJSON := task.Tags
	if tagsJSON == nil {
		tagsJSON = json.RawMessage([]byte("[]"))
	}

	query := `
		UPDATE tasks
		SET title = $2, description = $3, category = $4, updated_at = $5, version = $6, priority = $7, status = $8, tags = $9, high_level_check_type = $10, check_type = $11, target = $12, parameters = $13, evidence_types_expected = $14, default_priority = $15
		WHERE id = $1
	`
	_, err = tx.Exec(query,
		task.ID, task.Title, task.Description, task.Category, task.UpdatedAt, task.Version, task.Priority, task.Status, tagsJSON, task.HighLevelCheckType, task.CheckType, task.Target, paramsJSON, pq.Array(task.EvidenceTypesExpected), task.DefaultPriority,
	)
	if err != nil {
		return fmt.Errorf("failed to update task: %w", err)
	}

	// Update task-requirement associations
	_, err = tx.Exec(`DELETE FROM task_requirements WHERE task_id = $1`, task.ID)
	if err != nil {
		return fmt.Errorf("failed to delete existing task-requirement associations: %w", err)
	}

	if len(task.RequirementIDs) > 0 {
		stmt, err := tx.Preparex(`
			INSERT INTO task_requirements (task_id, requirement_id)
				VALUES ($1, $2)
		`)
		if err != nil {
			return fmt.Errorf("failed to prepare task_requirements insert statement: %w", err)
		}
		defer stmt.Close()

		for _, reqID := range task.RequirementIDs {
			_, err = stmt.Exec(task.ID, reqID)
			if err != nil {
				return fmt.Errorf("failed to insert task-requirement association: %w", err)
			}
		}
	}

	if err := s.unlinkAllDocumentsFromTask(tx, task.ID); err != nil {
		return fmt.Errorf("failed to clear existing document links: %w", err)
	}
	if len(task.LinkedDocumentIDs) > 0 {
		if err := s.linkDocumentsToTask(tx, task.ID, task.LinkedDocumentIDs); err != nil {
			return fmt.Errorf("failed to link documents to task: %w", err)
		}
	}

	return tx.Commit()
}

func (s *DBStore) GetTasksByRequirementID(requirementID string) ([]models.Task, error) {
	query := `
		SELECT t.id, t.title, t.description, t.category, t.created_at, t.updated_at, 
		       t.check_type, t.target, t.parameters, t.evidence_types_expected, t.default_priority,
		       COALESCE(
			   json_agg(
				   json_build_object(
					   'id', r.id,
					   'controlIdReference', r.control_id_reference,
					   'requirementText', r.requirement_text
				   )
			   ) FILTER (WHERE r.id IS NOT NULL),
			   '[]'
		   ) as requirements
		FROM tasks t
		JOIN task_requirements tr ON t.id = tr.task_id
		LEFT JOIN task_requirements tr2 ON t.id = tr2.task_id
		LEFT JOIN requirements r ON tr2.requirement_id = r.id
		WHERE tr.requirement_id = $1
		GROUP BY t.id
	`
	rows, err := s.DB.Query(query, requirementID)
	if err != nil {
		return nil, fmt.Errorf("failed to query tasks by requirement_id %s: %w", requirementID, err)
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var t models.Task
		var paramsJSON []byte
		var requirementsJSON []byte

		err := rows.Scan(
			&t.ID, &t.Title, &t.Description, &t.Category,
			&t.CreatedAt, &t.UpdatedAt, &t.CheckType, &t.Target,
			&paramsJSON, pq.Array(&t.EvidenceTypesExpected), &t.DefaultPriority,
			&requirementsJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task row for requirement_id %s: %w", requirementID, err)
		}

		// Parse parameters
		if len(paramsJSON) > 0 && string(paramsJSON) != "null" {
			if err := json.Unmarshal(paramsJSON, &t.Parameters); err != nil {
				log.Printf("Warning: failed to unmarshal parameters for task %s: %v", t.ID, err)
				t.Parameters = make(map[string]interface{})
			}
		} else {
			t.Parameters = make(map[string]interface{})
		}

		// Parse requirements
		if len(requirementsJSON) > 0 && string(requirementsJSON) != "null" {
			if err := json.Unmarshal(requirementsJSON, &t.Requirements); err != nil {
				log.Printf("Warning: failed to unmarshal requirements for task %s: %v", t.ID, err)
			}
			// Populate RequirementIDs from Requirements
			t.RequirementIDs = make([]string, len(t.Requirements))
			for i, req := range t.Requirements {
				t.RequirementIDs[i] = req.ID
			}
		}

		tasks = append(tasks, t)
	}

	return tasks, rows.Err()
}

func parsePostgresTextArray(dbValue []byte) ([]string, error) {
	if dbValue == nil || len(dbValue) == 0 {
		return []string{}, nil
	}
	s := string(dbValue)
	if s == "NULL" || s == "{}" {
		return []string{}, nil
	}
	if !strings.HasPrefix(s, "{") || !strings.HasSuffix(s, "}") {
		return nil, errors.New("invalid array format: missing braces")
	}
	s = s[1 : len(s)-1]
	if s == "" {
		return []string{}, nil
	}

	return strings.Split(s, ","), nil
}

func (s *DBStore) getLinkedDocumentsForTask(taskID string) ([]models.Document, error) {
	var docs []models.Document
	query := `
        SELECT d.id, d.name, d.description, d.document_type, d.source_url, d.internal_reference, d.created_at, d.updated_at
        FROM documents d
        JOIN task_documents td ON d.id = td.document_id
        WHERE td.task_id = $1
        ORDER BY d.name ASC
    `
	err := s.DB.Select(&docs, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get linked documents for task %s: %w", taskID, err)
	}
	if docs == nil {
		docs = []models.Document{}
	}
	return docs, nil
}

func (s *DBStore) linkDocumentsToTask(tx *sqlx.Tx, taskID string, documentIDs []string) error {
	if len(documentIDs) == 0 {
		return nil
	}
	var stmt *sqlx.Stmt
	var err error
	if tx != nil {
		stmt, err = tx.Preparex("INSERT INTO task_documents (task_id, document_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
	} else {
		stmt, err = s.DB.Preparex("INSERT INTO task_documents (task_id, document_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
	}
	if err != nil {
		return fmt.Errorf("failed to prepare link document statement: %w", err)
	}
	defer stmt.Close()

	for _, docID := range documentIDs {
		if _, err := stmt.Exec(taskID, docID); err != nil {
			return fmt.Errorf("failed to link document %s to task %s: %w", docID, taskID, err)
		}
	}
	return nil
}

func (s *DBStore) unlinkAllDocumentsFromTask(tx *sqlx.Tx, taskID string) error {
	_, err := tx.Exec("DELETE FROM task_documents WHERE task_id = $1", taskID)
	if err != nil {
		return fmt.Errorf("failed to unlink documents from task %s: %w", taskID, err)
	}
	return nil
}

func (s *DBStore) CreateRequirement(req *models.Requirement) error {
	req.ID = uuid.NewString()

	query := `
		INSERT INTO requirements (
			id, standard_id, control_id_reference, requirement_text, version, official_link, priority, status, tags
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		)
	`
	_, err := s.DB.Exec(query,
		req.ID,
		req.StandardID,
		req.ControlIDReference,
		req.RequirementText,
		req.Version,
		// req.EffectiveDate,
		// req.ExpiryDate,
		req.OfficialLink,
		req.Priority,
		req.Status,
		req.Tags,
	)
	if err != nil {
		return fmt.Errorf("failed to insert requirement: %w", err)
	}
	return nil
}

func (s *DBStore) GetRequirements() ([]models.Requirement, error) {
	query := `SELECT id, standard_id, control_id_reference, requirement_text, version, effective_date, expiry_date, official_link, priority, status, tags, created_at, updated_at FROM requirements ORDER BY control_id_reference ASC`
	rows, err := s.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query requirements: %w", err)
	}
	defer rows.Close()

	var requirements []models.Requirement
	for rows.Next() {
		var r models.Requirement
		var effectiveDateNull, expiryDateNull, tagsNull sql.NullString
		if err := rows.Scan(&r.ID, &r.StandardID, &r.ControlIDReference, &r.RequirementText, &r.Version, &effectiveDateNull, &expiryDateNull, &r.OfficialLink, &r.Priority, &r.Status, &tagsNull, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan requirement row: %w", err)
		}
		if effectiveDateNull.Valid {
			r.EffectiveDate = &models.CustomDate{Time: time.Time{}}
			if err := r.EffectiveDate.UnmarshalJSON([]byte(effectiveDateNull.String)); err != nil {
				return nil, fmt.Errorf("failed to parse effective_date: %w", err)
			}
		}
		if expiryDateNull.Valid {
			r.ExpiryDate = &models.CustomDate{Time: time.Time{}}
			if err := r.ExpiryDate.UnmarshalJSON([]byte(expiryDateNull.String)); err != nil {
				return nil, fmt.Errorf("failed to parse expiry_date: %w", err)
			}
		}
		if tagsNull.Valid {
			r.Tags = json.RawMessage(tagsNull.String)
		} else {
			r.Tags = nil
		}
		requirements = append(requirements, r)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for requirements: %w", err)
	}
	return requirements, nil
}

func (s *DBStore) GetUsers() ([]models.User, error) {
	query := `
		SELECT id, name, email, role
		FROM users ORDER BY name ASC
	`
	rows, err := s.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role); err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}
		users = append(users, u)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for users: %w", err)
	}
	return users, nil
}

func (s *DBStore) CreateUser(user *models.User) error {
	user.ID = uuid.New().String()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	query := `
		INSERT INTO users (id, name, email, role, hashed_password, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := s.DB.Exec(query, user.ID, user.Name, user.Email, user.Role, user.HashedPassword, user.CreatedAt, user.UpdatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "duplicate key") {
			return fmt.Errorf("user with this email already exists: %w", err)
		}
		return fmt.Errorf("failed to insert user: %w", err)
	}
	return nil
}

func (s *DBStore) GetUserByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, name, email, role, hashed_password, created_at, updated_at 
		FROM users WHERE email = $1
	`
	row := s.DB.QueryRow(query, email)
	var user models.User
	err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&user.HashedPassword,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to scan user row by email %s: %w", email, err)
	}
	return &user, nil
}

func (s *DBStore) GetUserByID(userID uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, name, email, role, hashed_password, created_at, updated_at 
		FROM users WHERE id = $1
	`
	row := s.DB.QueryRow(query, userID)
	var user models.User
	err := row.Scan(&user.ID, &user.Name, &user.Email, &user.Role, &user.HashedPassword, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to scan user row by ID %s: %w", userID, err)
	}
	return &user, nil
}

func (s *DBStore) CreateComplianceStandard(standard *models.ComplianceStandard) error {
	standard.ID = uuid.NewString()

	query := `
		INSERT INTO compliance_standards (
			id, name, short_name, description, version, issuing_body, official_link, jurisdiction, industry, tags
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
	`
	_, err := s.DB.Exec(query,
		standard.ID,
		standard.Name,
		standard.ShortName,
		standard.Description,
		standard.Version,
		standard.IssuingBody,
		standard.OfficialLink,
		// standard.EffectiveDate,
		// standard.ExpiryDate,
		standard.Jurisdiction,
		standard.Industry,
		standard.Tags,
	)
	if err != nil {
		return fmt.Errorf("failed to insert compliance standard: %w", err)
	}
	return nil
}

func (s *DBStore) GetComplianceStandards() ([]models.ComplianceStandard, error) {
	query := `SELECT id, name, short_name, description, version, issuing_body, official_link, jurisdiction, industry, tags FROM compliance_standards ORDER BY name ASC`
	rows, err := s.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query compliance standards: %w", err)
	}
	defer rows.Close()

	var standards []models.ComplianceStandard
	for rows.Next() {
		var std models.ComplianceStandard
		var tagsNull sql.NullString
		if err := rows.Scan(&std.ID, &std.Name, &std.ShortName, &std.Description, &std.Version, &std.IssuingBody, &std.OfficialLink, &std.Jurisdiction, &std.Industry, &tagsNull); err != nil {
			return nil, fmt.Errorf("failed to scan compliance standard row: %w", err)
		}
		if tagsNull.Valid {
			std.Tags = json.RawMessage(tagsNull.String)
		} else {
			std.Tags = nil
		}
		standards = append(standards, std)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for compliance standards: %w", err)
	}
	return standards, nil
}

func (s *DBStore) GetRequirementByID(id string) (*models.Requirement, error) {
	var requirement models.Requirement
	query := `SELECT id, standard_id, control_id_reference, requirement_text, version, effective_date, expiry_date, official_link, priority, status, tags, created_at, updated_at FROM requirements WHERE id = $1`
	row := s.DB.QueryRow(query, id)
	err := row.Scan(
		&requirement.ID,
		&requirement.StandardID,
		&requirement.ControlIDReference,
		&requirement.RequirementText,
		&requirement.Version,
		&requirement.EffectiveDate,
		&requirement.ExpiryDate,
		&requirement.OfficialLink,
		&requirement.Priority,
		&requirement.Status,
		&requirement.Tags,
		&requirement.CreatedAt,
		&requirement.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, fmt.Errorf("error scanning requirement by id %s: %w", id, err)
	}
	return &requirement, nil
}

func (s *DBStore) CreateTaskComment(comment *models.Comment) error {
	comment.ID = uuid.NewString()
	comment.CreatedAt = time.Now()

	query := `
		INSERT INTO task_comments (id, task_id, campaign_task_instance_id, user_id, text, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := s.DB.Exec(query, comment.ID, comment.TaskID, comment.CampaignTaskInstanceID, comment.UserID, comment.Text, comment.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert task comment: %w", err)
	}
	return nil
}

// func (s *DBStore) CreateTaskEvidence(evidence *models.Evidence) error {
// 	evidence.ID = uuid.NewString()
// 	evidence.UploadedAt = time.Now()

// 	query := `
// 		INSERT INTO task_evidence (id, task_id, campaign_task_instance_id, uploader_user_id, file_name, file_path, mime_type, file_size, description, uploaded_at)
// 		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
// 	`
// 	_, err := s.DB.Exec(query, evidence.ID, evidence.TaskID, evidence.CampaignTaskInstanceID, evidence.UploadedByUserID, evidence.FileName, evidence.FilePath, evidence.MimeType, evidence.FileSize, evidence.Description, evidence.UploadedAt)
// 	if err != nil {
// 		return fmt.Errorf("failed to insert task evidence: %w", err)
// 	}
// 	return nil
// }

func (s *DBStore) GetTaskEvidence(taskID string) ([]models.Evidence, error) {
	query := `
		SELECT id, task_id, campaign_task_instance_id, uploaded_by_user_id, 
		       file_name, file_path, mime_type, file_size, description, uploaded_at,
		       created_at, updated_at, review_status, reviewed_by_user_id, reviewed_at, review_comments
		FROM evidence
		WHERE task_id = $1 AND campaign_task_instance_id IS NULL
		ORDER BY uploaded_at DESC
	`
	var evidences []models.Evidence
	rows, err := s.DB.Query(query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query task evidence for task_id %s: %w", taskID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var ev models.Evidence
		if err := rows.Scan(&ev.ID, &ev.TaskID, &ev.CampaignTaskInstanceID, &ev.UploadedByUserID,
			&ev.FileName, &ev.FilePath, &ev.MimeType, &ev.FileSize, &ev.Description, &ev.UploadedAt,
			&ev.CreatedAt, &ev.UpdatedAt, &ev.ReviewStatus, &ev.ReviewedByUserID, &ev.ReviewedAt, &ev.ReviewComments); err != nil {

			return nil, fmt.Errorf("failed to scan task evidence row: %w", err)
		}
		evidences = append(evidences, ev)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for task evidence: %w", err)
	}
	return evidences, nil
}

func (s *DBStore) CreateCampaignTaskInstanceComment(comment *models.Comment) error {
	if comment.CampaignTaskInstanceID == nil || *comment.CampaignTaskInstanceID == "" { // Corrected nil check for pointer to string
		return fmt.Errorf("CampaignTaskInstanceID is required for campaign task comments")
	}
	comment.TaskID = nil
	return s.CreateTaskComment(comment)
}

func (s *DBStore) GetCampaignTaskInstanceComments(campaignTaskInstanceID string) ([]models.Comment, error) {
	return s.GetTaskComments("", campaignTaskInstanceID)
}

func (s *DBStore) CreateCampaignTaskInstanceEvidence(evidence *models.Evidence) error {
	if evidence.CampaignTaskInstanceID == nil { // Corrected nil check for string
		return fmt.Errorf("campaignTaskInstanceId is required for campaign task evidence")
	}
	evidence.TaskID = nil
	// Use the consolidated CreateEvidence method from evidence_store.go
	// This method is part of DBStore as evidence_store.go and postgres_store.go are in the same package.
	_, err := s.CreateEvidence(evidence)
	return err
}

func (s *DBStore) GetCampaignTaskInstanceEvidence(campaignTaskInstanceID string) ([]models.Evidence, error) {
	query := `
		SELECT id, task_id, campaign_task_instance_id, uploaded_by_user_id, 
		       file_name, file_path, mime_type, file_size, description, uploaded_at,
		       created_at, updated_at, review_status, reviewed_by_user_id, reviewed_at, review_comments
		FROM evidence
		WHERE campaign_task_instance_id = $1
		ORDER BY uploaded_at DESC
	`
	var evidences []models.Evidence
	rows, err := s.DB.Query(query, campaignTaskInstanceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query campaign task evidence for instance_id %s: %w", campaignTaskInstanceID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var ev models.Evidence
		if err := rows.Scan(&ev.ID, &ev.TaskID, &ev.CampaignTaskInstanceID, &ev.UploadedByUserID,
			&ev.FileName, &ev.FilePath, &ev.MimeType, &ev.FileSize, &ev.Description, &ev.UploadedAt,
			&ev.CreatedAt, &ev.UpdatedAt, &ev.ReviewStatus, &ev.ReviewedByUserID, &ev.ReviewedAt, &ev.ReviewComments); err != nil {

			return nil, fmt.Errorf("failed to scan campaign task evidence row: %w", err)
		}
		evidences = append(evidences, ev)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for campaign task evidence: %w", err)
	}
	return evidences, nil
}

func (s *DBStore) UpdateRequirement(req *models.Requirement) error {
	query := `
		UPDATE requirements
		SET standard_id = $2, control_id_reference = $3, requirement_text = $4, version = $5, effective_date = $6, expiry_date = $7, official_link = $8, priority = $9, status = $10, tags = $11, updated_at = $12
		WHERE id = $1`
	_, err := s.DB.Exec(query, req.ID, req.StandardID, req.ControlIDReference, req.RequirementText, req.Version, req.EffectiveDate, req.ExpiryDate, req.OfficialLink, req.Priority, req.Status, req.Tags, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update requirement with id %s: %w", req.ID, err)
	}
	return nil
}

func (s *DBStore) UpdateStandard(standard *models.ComplianceStandard) error {
	query := `
		UPDATE compliance_standards
		SET name = $2, short_name = $3, description = $4, version = $5, issuing_body = $6, official_link = $7, jurisdiction = $8, industry = $9, tags = $10
		WHERE id = $1`
	_, err := s.DB.Exec(query, standard.ID, standard.Name, standard.ShortName, standard.Description, standard.Version, standard.IssuingBody, standard.OfficialLink, standard.Jurisdiction, standard.Industry, standard.Tags)
	if err != nil {
		return fmt.Errorf("failed to update compliance standard with id %s: %w", standard.ID, err)
	}
	return nil
}

func (s *DBStore) CreateCampaign(campaign *models.Campaign, selectedReqs []models.CampaignSelectedRequirement) (string, error) {
	campaign.ID = uuid.NewString()
	campaign.CreatedAt = time.Now()
	campaign.UpdatedAt = time.Now()

	tx, err := s.DB.Begin()
	if err != nil {
		return "", fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO campaigns (id, name, description, standard_id, start_date, end_date, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err = tx.Exec(query, campaign.ID, campaign.Name, campaign.Description, campaign.StandardID, campaign.StartDate, campaign.EndDate, campaign.Status, campaign.CreatedAt, campaign.UpdatedAt)
	if err != nil {
		return "", fmt.Errorf("failed to insert campaign: %w", err)
	}

	if len(selectedReqs) > 0 {
		stmt, err := tx.Prepare(`
			INSERT INTO campaign_selected_requirements (id, campaign_id, requirement_id, is_applicable)
			VALUES ($1, $2, $3, $4)
		`)
		if err != nil {
			return "", fmt.Errorf("failed to prepare statement for campaign_selected_requirements: %w", err)
		}
		defer stmt.Close()

		for _, sr := range selectedReqs {
			campaignSelectedRequirementID := uuid.NewString()
			_, err = stmt.Exec(campaignSelectedRequirementID, campaign.ID, sr.RequirementID, sr.IsApplicable)
			if err != nil {
				return "", fmt.Errorf("failed to insert campaign_selected_requirement: %w", err)
			}
			if sr.IsApplicable {
				masterTasks, err := s.GetTasksByRequirementID(sr.RequirementID)
				if err != nil {
					log.Printf("Error fetching master tasks for requirement %s during campaign creation: %v", sr.RequirementID, err)
					continue
				}

				for _, masterTask := range masterTasks {
					campaignTaskInstance := models.CampaignTaskInstance{
						CampaignID:                    campaign.ID,
						MasterTaskID:                  &masterTask.ID,
						CampaignSelectedRequirementID: &campaignSelectedRequirementID,
						Title:                         masterTask.Title,
						Description:                   &masterTask.Description,
						Category:                      &masterTask.Category,
						Status:                        "Open",
						CheckType:                     masterTask.CheckType,
						Target:                        masterTask.Target,
						Parameters:                    masterTask.Parameters,
						Priority:                      masterTask.DefaultPriority,
					}

					if masterTask.Description == "" {
						campaignTaskInstance.Description = nil
					}
					if masterTask.Category == "" {
						campaignTaskInstance.Category = nil
					}

					_, err := s.CreateCampaignTaskInstance(tx, &campaignTaskInstance)
					if err != nil {
						log.Printf("Error creating campaign task instance for master task %s: %v", masterTask.ID, err)
						continue
					}
				}
			}
		}
	}
	if err = tx.Commit(); err != nil {
		return "", fmt.Errorf("failed to commit transaction: %w", err)
	}
	return campaign.ID, nil
}

func (s *DBStore) GetCampaigns(campaignStatus string) ([]models.Campaign, error) {
	query := `
		SELECT c.id, c.name, c.description, c.standard_id, cs.name as standard_name, c.start_date, c.end_date, c.status, c.created_at, c.updated_at
		FROM campaigns c
		LEFT JOIN compliance_standards cs ON c.standard_id = cs.id
	`
	if campaignStatus != "" {
		query += fmt.Sprintf(" WHERE c.status = '%s'", campaignStatus)
	}

	query += " ORDER BY c.created_at DESC"
	fmt.Println(query)
	rows, err := s.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query campaigns: %w", err)
	}
	defer rows.Close()

	var campaigns []models.Campaign
	for rows.Next() {
		var camp models.Campaign
		if err := rows.Scan(
			&camp.ID, &camp.Name, &camp.Description, &camp.StandardID, &camp.StandardName,
			&camp.StartDate, &camp.EndDate, &camp.Status, &camp.CreatedAt, &camp.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan campaign row: %w", err)
		}
		campaigns = append(campaigns, camp)
	}
	return campaigns, rows.Err()
}

func (s *DBStore) GetCampaignByID(campaignID string) (*models.Campaign, error) {
	query := `
		SELECT c.id, c.name, c.description, c.standard_id, cs.name as standard_name, c.start_date, c.end_date, c.status, c.created_at, c.updated_at
		FROM campaigns c
		LEFT JOIN compliance_standards cs ON c.standard_id = cs.id
		WHERE c.id = $1
	`
	row := s.DB.QueryRow(query, campaignID)
	var camp models.Campaign
	err := row.Scan(
		&camp.ID, &camp.Name, &camp.Description, &camp.StandardID, &camp.StandardName,
		&camp.StartDate, &camp.EndDate, &camp.Status, &camp.CreatedAt, &camp.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, fmt.Errorf("failed to scan campaign row for ID %s: %w", campaignID, err)
	}
	return &camp, nil
}

func (s *DBStore) UpdateCampaign(campaign *models.Campaign, newSelectedReqs []models.CampaignSelectedRequirement) error {
	campaign.UpdatedAt = time.Now()
	tx, err := s.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction for update campaign: %w", err)
	}
	defer tx.Rollback()

	query := `
		UPDATE campaigns
		SET name = $2, description = $3, standard_id = $4, start_date = $5, end_date = $6, status = $7, updated_at = $8
		WHERE id = $1
	`
	_, err = tx.Exec(query, campaign.ID, campaign.Name, campaign.Description, campaign.StandardID, campaign.StartDate, campaign.EndDate, campaign.Status, campaign.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to update campaign %s: %w", campaign.ID, err)
	}

	currentDBReqs, err := s.getCampaignSelectedRequirementsTx(tx, campaign.ID)
	if err != nil {
		return fmt.Errorf("failed to get current selected requirements for campaign %s: %w", campaign.ID, err)
	}

	currentReqMap := make(map[string]models.CampaignSelectedRequirement)
	for _, req := range currentDBReqs {
		currentReqMap[req.RequirementID] = req
	}

	newReqMap := make(map[string]models.CampaignSelectedRequirement)
	for _, req := range newSelectedReqs {
		newReqMap[req.RequirementID] = req
	}

	for reqID, currentReq := range currentReqMap {
		newReq, existsInNew := newReqMap[reqID]
		if !existsInNew || (currentReq.IsApplicable && !newReq.IsApplicable) {
			_, err = tx.Exec("DELETE FROM campaign_task_instances WHERE campaign_id = $1 AND campaign_selected_requirement_id = $2", campaign.ID, currentReq.ID)
			if err != nil {
				return fmt.Errorf("failed to delete task instances for removed/non-applicable requirement %s (csr_id: %s): %w", reqID, currentReq.ID, err)
			}
			_, err = tx.Exec("DELETE FROM campaign_selected_requirements WHERE id = $1", currentReq.ID)
			if err != nil {
				return fmt.Errorf("failed to delete campaign_selected_requirement %s: %w", currentReq.ID, err)
			}
		}
	}

	csrStmt, err := tx.Prepare(`INSERT INTO campaign_selected_requirements (id, campaign_id, requirement_id, is_applicable) VALUES ($1, $2, $3, $4) ON CONFLICT (campaign_id, requirement_id) DO UPDATE SET is_applicable = EXCLUDED.is_applicable RETURNING id`)
	if err != nil {
		return fmt.Errorf("failed to prepare statement for campaign_selected_requirements on update: %w", err)
	}
	defer csrStmt.Close()

	for _, newReq := range newSelectedReqs {
		var campaignSelectedRequirementID string
		err = csrStmt.QueryRow(uuid.NewString(), campaign.ID, newReq.RequirementID, newReq.IsApplicable).Scan(&campaignSelectedRequirementID)
		if err != nil {
			return fmt.Errorf("failed to insert/update campaign_selected_requirement for req %s: %w", newReq.RequirementID, err)
		}

		if newReq.IsApplicable {
			masterTasks, err := s.GetTasksByRequirementID(newReq.RequirementID)
			if err != nil {
				return fmt.Errorf("error fetching master tasks for requirement %s (CSR_ID: %s) during campaign update: %w", newReq.RequirementID, campaignSelectedRequirementID, err)
			}

			if len(masterTasks) == 0 {
				log.Printf("No master tasks found for applicable requirement %s (CSR_ID: %s, ControlID: %s) in campaign %s. No new campaign task instances will be created for it if none exist.", newReq.RequirementID, campaignSelectedRequirementID, newReq.ControlIDReference, campaign.ID)
			}

			existingCTIMasterTaskIDs := make(map[string]bool)
			queryExistingCTIs := `
				SELECT master_task_id 
				FROM campaign_task_instances 
				WHERE campaign_id = $1 AND campaign_selected_requirement_id = $2 AND master_task_id IS NOT NULL
			`
			rows, err := tx.Query(queryExistingCTIs, campaign.ID, campaignSelectedRequirementID)
			if err != nil {
				log.Printf("Error fetching existing CTIs for campaign %s, CSR_ID %s: %v", campaign.ID, campaignSelectedRequirementID, err)
				return fmt.Errorf("failed to fetch existing CTIs for CSR_ID %s: %w", campaignSelectedRequirementID, err)
			}

			for rows.Next() {
				var mtID sql.NullString
				if err := rows.Scan(&mtID); err != nil {
					rows.Close()
					log.Printf("Error scanning existing CTI master_task_id for CSR_ID %s: %v", campaignSelectedRequirementID, err)
					return fmt.Errorf("failed to scan existing CTI master_task_id for CSR_ID %s: %w", campaignSelectedRequirementID, err)
				}
				if mtID.Valid {
					existingCTIMasterTaskIDs[mtID.String] = true
				}
			}
			rows.Close()

			for _, masterTask := range masterTasks {
				if _, exists := existingCTIMasterTaskIDs[masterTask.ID]; !exists {
					cti := models.CampaignTaskInstance{
						CampaignID:                    campaign.ID,
						MasterTaskID:                  &masterTask.ID,
						CampaignSelectedRequirementID: &campaignSelectedRequirementID,
						Title:                         masterTask.Title,
						Description:                   &masterTask.Description,
						Category:                      &masterTask.Category,
						Status:                        "Open",
						CheckType:                     masterTask.CheckType,
						Target:                        masterTask.Target,
						Parameters:                    masterTask.Parameters,
						Priority:                      masterTask.DefaultPriority,
					}
					if masterTask.Description == "" {
						cti.Description = nil
					}
					if masterTask.Category == "" {
						cti.Category = nil
					}
					_, err := s.CreateCampaignTaskInstance(tx, &cti)
					if err != nil {
						return fmt.Errorf("error creating new CTI for master task %s (CSR_ID: %s) during campaign update: %w", masterTask.ID, campaignSelectedRequirementID, err)
					}
					log.Printf("Successfully created new CTI for master task %s (CSR_ID: %s, ControlID: %s) in campaign %s", masterTask.ID, campaignSelectedRequirementID, newReq.ControlIDReference, campaign.ID)
				}
			}
		}
	}

	return tx.Commit()
}

func (s *DBStore) GetCampaignTaskInstancesByStatus(campaignStatus string, taskStatus string) ([]models.CampaignTaskInstance, error) {
	var instances []models.CampaignTaskInstance
	args := []interface{}{}
	conditions := []string{}

	query := `
		SELECT 
			cti.id, cti.campaign_id, c.name as campaign_name, cti.master_task_id, cti.campaign_selected_requirement_id, 
			cti.title, cti.description, cti.category, cti.assignee_user_id, cti.owner_team_id, cti.assignee_team_id,
			cti.status, cti.due_date, cti.created_at, cti.updated_at, 
			cti.check_type, cti.target, cti.parameters,
			assignee.name as assignee_user_name,
			req.control_id_reference as requirement_control_id_reference,
			req.requirement_text as requirement_text,
			std.name as requirement_standard_name,
			mt.default_priority,
			mt.evidence_types_expected,
			owner_team.id AS "ownerteam.id", owner_team.name AS "ownerteam.name",
			assignee_team.id AS "assigneeteam.id", assignee_team.name AS "assigneeteam.name"
		FROM campaign_task_instances cti
		LEFT JOIN campaigns c ON cti.campaign_id = c.id
		LEFT JOIN users assignee ON cti.assignee_user_id = assignee.id
		LEFT JOIN campaign_selected_requirements csr ON cti.campaign_selected_requirement_id = csr.id
		LEFT JOIN requirements req ON csr.requirement_id = req.id
		LEFT JOIN compliance_standards std ON req.standard_id = std.id
		LEFT JOIN tasks mt ON cti.master_task_id = mt.id
		LEFT JOIN teams owner_team ON cti.owner_team_id = owner_team.id
		LEFT JOIN teams assignee_team ON cti.assignee_team_id = assignee_team.id
	`
	paramIndex := 1
	if campaignStatus != "" {
		conditions = append(conditions, fmt.Sprintf("c.status = $%d", paramIndex))
		args = append(args, campaignStatus)
		paramIndex++
	}
	if taskStatus != "" {
		conditions = append(conditions, fmt.Sprintf("cti.status = $%d", paramIndex))
		args = append(args, taskStatus)
		paramIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += " ORDER BY cti.due_date ASC NULLS LAST, cti.created_at DESC"

	rows, err := s.DB.Queryx(query, args...) // Using Queryx for struct scanning
	if err != nil {
		return nil, fmt.Errorf("failed to query campaign task instances by status: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var i models.CampaignTaskInstance
		i.OwnerTeam = &models.TeamBasicInfo{}
		i.AssigneeTeam = &models.TeamBasicInfo{}
		var paramsJSON []byte // For handling JSONB parameters

		// Adjust scan to match the selected columns and their order
		err := rows.Scan(
			&i.ID, &i.CampaignID, &i.CampaignName, &i.MasterTaskID, &i.CampaignSelectedRequirementID,
			&i.Title, &i.Description, &i.Category, &i.AssigneeUserID, &i.OwnerTeamID, &i.AssigneeTeamID,
			&i.Status, &i.DueDate, &i.CreatedAt, &i.UpdatedAt,
			&i.CheckType, &i.Target, &paramsJSON, // Scan parameters as JSON bytes first
			&i.AssigneeUserName, &i.RequirementControlIDReference, &i.RequirementText, &i.RequirementStandardName,
			&i.DefaultPriority, pq.Array(&i.EvidenceTypesExpected),
			&i.OwnerTeam.ID, &i.OwnerTeam.Name,
			&i.AssigneeTeam.ID, &i.AssigneeTeam.Name,
		)
		if err != nil {
			log.Printf("Error scanning campaign task instance row by status: %v", err)
			return nil, fmt.Errorf("failed to scan campaign task instance row by status: %w", err)
		}

		if len(paramsJSON) > 0 && string(paramsJSON) != "null" {
			if err := json.Unmarshal(paramsJSON, &i.Parameters); err != nil {
				log.Printf("Warning: failed to unmarshal parameters for CTI %s: %v", i.ID, err)
				i.Parameters = make(map[string]interface{}) // Initialize to empty map on error
			}
		} else {
			i.Parameters = make(map[string]interface{}) // Initialize if null or empty
		}

		// If team IDs are nil after scan, it means no team was joined. Set the team struct to nil.
		if i.OwnerTeam != nil && i.OwnerTeam.ID == nil {
			i.OwnerTeam = nil
		}
		if i.AssigneeTeam != nil && i.AssigneeTeam.ID == nil {
			i.AssigneeTeam = nil
		}

		// Fetch owners separately as it's a one-to-many relationship
		owners, err := s.getCampaignTaskInstanceOwners(i.ID)
		if err != nil {
			// Log error but continue, or decide if this is a critical failure
			log.Printf("Warning: failed to fetch owners for CTI %s: %v", i.ID, err)
		}
		i.Owners = owners

		instances = append(instances, i)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for campaign task instances by status: %w", err)
	}

	return instances, nil
}

func (s *DBStore) DeleteCampaign(campaignID string) error {
	query := "DELETE FROM campaigns WHERE id = $1"
	result, err := s.DB.Exec(query, campaignID)
	if err != nil {
		return fmt.Errorf("failed to delete campaign %s: %w", campaignID, err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected for delete campaign %s: %w", campaignID, err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("campaign %s not found for deletion", campaignID)
	}
	return nil
}

func (s *DBStore) GetCampaignSelectedRequirements(campaignID string) ([]models.CampaignSelectedRequirement, error) {
	query := `
		SELECT csr.id, csr.campaign_id, csr.requirement_id, r.control_id_reference, r.requirement_text, csr.is_applicable
		FROM campaign_selected_requirements csr
		JOIN requirements r ON csr.requirement_id = r.id
		WHERE csr.campaign_id = $1
		ORDER BY r.control_id_reference
	`
	rows, err := s.DB.Query(query, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to query campaign selected requirements: %w", err)
	}
	defer rows.Close()

	var reqs []models.CampaignSelectedRequirement
	for rows.Next() {
		var r models.CampaignSelectedRequirement
		if err := rows.Scan(&r.ID, &r.CampaignID, &r.RequirementID, &r.ControlIDReference, &r.RequirementText, &r.IsApplicable); err != nil {
			return nil, fmt.Errorf("failed to scan campaign selected requirement: %w", err)
		}
		reqs = append(reqs, r)
	}
	return reqs, rows.Err()
}

func (s *DBStore) getCampaignSelectedRequirementsTx(tx *sql.Tx, campaignID string) ([]models.CampaignSelectedRequirement, error) {
	query := `
		SELECT csr.id, csr.campaign_id, csr.requirement_id, r.control_id_reference, r.requirement_text, csr.is_applicable
		FROM campaign_selected_requirements csr
		JOIN requirements r ON csr.requirement_id = r.id
		WHERE csr.campaign_id = $1
	`
	rows, err := tx.Query(query, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var reqs []models.CampaignSelectedRequirement
	for rows.Next() {
		var r models.CampaignSelectedRequirement
		if err := rows.Scan(&r.ID, &r.CampaignID, &r.RequirementID, &r.ControlIDReference, &r.RequirementText, &r.IsApplicable); err != nil {
			return nil, err
		}
		reqs = append(reqs, r)
	}
	return reqs, rows.Err()
}

func (s *DBStore) CreateCampaignTaskInstance(tx *sql.Tx, cti *models.CampaignTaskInstance) (string, error) {
	cti.ID = uuid.NewString()
	cti.CreatedAt = time.Now()
	cti.UpdatedAt = time.Now()

	paramsJSON, err := json.Marshal(cti.Parameters)
	if err != nil {
		return "", fmt.Errorf("failed to marshal campaign task instance parameters: %w", err)
	}

	query := `
		INSERT INTO campaign_task_instances (
			id, campaign_id, master_task_id, campaign_selected_requirement_id, title, description, category, 
			assignee_user_id, status, due_date, created_at, updated_at, 
			check_type, target, parameters, owner_team_id, assignee_team_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`

	var execFunc func(query string, args ...interface{}) (sql.Result, error)
	if tx != nil {
		execFunc = tx.Exec
	} else {
		execFunc = s.DB.Exec
	}

	_, err = execFunc(query, cti.ID, cti.CampaignID, cti.MasterTaskID, cti.CampaignSelectedRequirementID,
		cti.Title, cti.Description, cti.Category, cti.AssigneeUserID, cti.Status, cti.DueDate,
		cti.CreatedAt, cti.UpdatedAt, cti.CheckType, cti.Target, paramsJSON, cti.OwnerTeamID, cti.AssigneeTeamID)

	if err != nil {
		return "", fmt.Errorf("failed to insert campaign task instance: %w", err)
	}

	err = s.updateCampaignTaskInstanceOwners(tx, cti.ID, cti.OwnerUserIDs)

	if err != nil {
		return "", fmt.Errorf("failed to insert campaign task instance: %w", err)
	}
	return cti.ID, nil
}

func (s *DBStore) GetCampaignTaskInstances(campaignID string, userID string, userField string) ([]models.CampaignTaskInstance, error) {
	baseQuery := `
		SELECT 
			cti.id, cti.campaign_id, cti.master_task_id, cti.campaign_selected_requirement_id, 
			cti.title, cti.description, cti.category, cti.assignee_user_id, cti.priority,
			cti.owner_team_id, cti.assignee_team_id, cti.status, cti.due_date, cti.created_at, cti.updated_at,
			cti.check_type, cti.target,
			assignee.name as assignee_user_name,
			req.control_id_reference as requirement_control_id_reference,
			req.requirement_text as requirement_text,
			std.name as requirement_standard_name,
			owner_team.id AS "ownerteam.id", owner_team.name AS "ownerteam.name",
			assignee_team.id AS "assigneeteam.id", assignee_team.name AS "assigneeteam.name"
		FROM campaign_task_instances cti
		LEFT JOIN users assignee ON cti.assignee_user_id = assignee.id
		LEFT JOIN campaign_selected_requirements csr ON cti.campaign_selected_requirement_id = csr.id
		LEFT JOIN requirements req ON csr.requirement_id = req.id
		LEFT JOIN compliance_standards std ON req.standard_id = std.id
		LEFT JOIN teams owner_team ON cti.owner_team_id = owner_team.id
		LEFT JOIN teams assignee_team ON cti.assignee_team_id = assignee_team.id
		WHERE cti.campaign_id = $1
	`
	args := []interface{}{campaignID}
	var fullQuery string

	if userID != "" {
		if userField == "assignee" {
			fullQuery = baseQuery + " AND cti.assignee_user_id = $2 ORDER BY cti.due_date ASC NULLS LAST, cti.created_at DESC"
			args = append(args, userID)
		} else {
			fullQuery = baseQuery + " ORDER BY cti.due_date ASC NULLS LAST, cti.created_at DESC"
		}
	} else {
		fullQuery = baseQuery + " ORDER BY cti.due_date ASC NULLS LAST, cti.created_at DESC"
	}

	fmt.Println(fullQuery)
	var instances []models.CampaignTaskInstance
	err := s.DB.Select(&instances, fullQuery, args...)
	if err != nil {
		if err == sql.ErrNoRows {
			return []models.CampaignTaskInstance{}, nil
		}
		return nil, fmt.Errorf("failed to query campaign task instances for campaign %s: %w", campaignID, err)
	}

	// Post-process to fetch owners for each instance
	// This is done separately as sqlx.Select doesn't easily handle one-to-many for nested slices like Owners.
	for i := range instances {
		// Unmarshal Parameters from JSONB to ParametersMap
		// if instances[i].Parameters != nil && len(instances[i].Parameters) > 0 && string(instances[i].Parameters) != "null" {
		// 	var tempMap map[string]interface{}
		// 	if err := json.Unmarshal(instances[i].Parameters, &tempMap); err != nil {
		// 		log.Printf("Warning: failed to unmarshal parameters (JSONB) for CTI %s: %v", instances[i].ID, err)
		// 		instances[i].ParametersMap = make(map[string]interface{})
		// 	} else {
		// 		instances[i].ParametersMap = tempMap
		// 	}
		// } else {
		// 	instances[i].ParametersMap = make(map[string]interface{})
		// }

		owners, err := s.getCampaignTaskInstanceOwners(instances[i].ID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch owners for CTI %s: %w", instances[i].ID, err)
		}
		instances[i].Owners = owners
	}
	return instances, nil
}

func (s *DBStore) GetCampaignTaskInstanceByID(ctiID string) (*models.CampaignTaskInstance, error) {
	query := `SELECT cti.id, cti.campaign_id, c.name as campaign_name, cti.master_task_id, cti.priority,
	cti.campaign_selected_requirement_id, cti.title, cti.description, cti.category, 
	cti.assignee_user_id, cti.owner_team_id, cti.assignee_team_id, cti.last_checked_at, cti.last_check_status,
    cti.status, cti.due_date, cti.created_at, cti.updated_at,
    mt.high_level_check_type, mt.check_type, mt.target, mt.parameters,
    assignee.name as assignee_user_name,
    req.control_id_reference as requirement_control_id_reference,
    req.requirement_text as requirement_text,
    std.name as requirement_standard_name,
    mt.default_priority,
    mt.evidence_types_expected,
	owner_team.id, owner_team.name,
	assignee_team.id, assignee_team.name 
    FROM campaign_task_instances cti
    LEFT JOIN campaigns c ON cti.campaign_id = c.id
    LEFT JOIN users assignee ON cti.assignee_user_id = assignee.id
    LEFT JOIN campaign_selected_requirements csr ON cti.campaign_selected_requirement_id = csr.id
    LEFT JOIN requirements req ON csr.requirement_id = req.id
    LEFT JOIN compliance_standards std ON req.standard_id = std.id
    LEFT JOIN tasks mt ON cti.master_task_id = mt.id
	LEFT JOIN teams owner_team ON cti.owner_team_id = owner_team.id
	LEFT JOIN teams assignee_team ON cti.assignee_team_id = assignee_team.id
    WHERE cti.id = $1
`

	fmt.Println(query)

	row := s.DB.QueryRow(query, ctiID)
	var cti models.CampaignTaskInstance
	// Initialize nested structs that will have their fields scanned into
	cti.OwnerTeam = &models.TeamBasicInfo{}
	cti.AssigneeTeam = &models.TeamBasicInfo{}

	var paramsJSON []byte
	if err := row.Scan(
		&cti.ID, &cti.CampaignID, &cti.CampaignName, &cti.MasterTaskID, &cti.Priority, &cti.CampaignSelectedRequirementID,
		&cti.Title, &cti.Description, &cti.Category, &cti.AssigneeUserID, &cti.OwnerTeamID, &cti.AssigneeTeamID,
		&cti.LastCheckedAt, &cti.LastCheckStatus,
		&cti.Status, &cti.DueDate, &cti.CreatedAt, &cti.UpdatedAt,
		&cti.HighLevelCheckType, &cti.CheckType, &cti.Target, &paramsJSON,
		&cti.AssigneeUserName, &cti.RequirementControlIDReference, &cti.RequirementText, &cti.RequirementStandardName,
		&cti.DefaultPriority, pq.Array(&cti.EvidenceTypesExpected), // pq.Array handles NULL arrays
		&cti.OwnerTeam.ID, &cti.OwnerTeam.Name, // Scan into initialized struct fields
		&cti.AssigneeTeam.ID, &cti.AssigneeTeam.Name, // Scan into initialized struct fields
	); err != nil {
		return nil, fmt.Errorf("failed to scan campaign task instance by ID %s: %w", ctiID, err)
	}

	if len(paramsJSON) > 0 && string(paramsJSON) != "null" {
		if err := json.Unmarshal(paramsJSON, &cti.Parameters); err != nil {
			log.Printf("Warning: failed to unmarshal parameters for CTI %s: %v", cti.ID, err)
			cti.Parameters = make(map[string]interface{})
		}
	} else {
		cti.Parameters = make(map[string]interface{})
	}

	// If team IDs are nil after scan, it means no team was joined. Set the team struct to nil.
	if cti.OwnerTeam != nil && cti.OwnerTeam.ID == nil {
		cti.OwnerTeam = nil
	}
	if cti.AssigneeTeam != nil && cti.AssigneeTeam.ID == nil {
		cti.AssigneeTeam = nil
	}

	if cti.MasterTaskID != nil && *cti.MasterTaskID != "" {
		masterTask, err := s.GetTaskByID(*cti.MasterTaskID)
		if err != nil {
			log.Printf("Warning: failed to fetch master task %s for CTI %s: %v", *cti.MasterTaskID, cti.ID, err)
		} else if masterTask != nil {
			cti.LinkedDocuments = masterTask.LinkedDocuments
		}
	}
	owners, err := s.getCampaignTaskInstanceOwners(cti.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch owners for CTI %s: %w", cti.ID, err)
	}
	cti.Owners = owners

	return &cti, nil
}

func (s *DBStore) UpdateCampaignTaskInstance(cti *models.CampaignTaskInstance) error {
	cti.UpdatedAt = time.Now()

	tx, err := s.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction for CTI update: %w", err)
	}
	defer tx.Rollback()

	paramsJSON, err := json.Marshal(cti.Parameters)
	if err != nil {
		return fmt.Errorf("failed to marshal CTI parameters for update: %w", err)
	}

	ctiQuery := `
		UPDATE campaign_task_instances
		SET title = $2, description = $3, category = $4, 
		    assignee_user_id = $5, owner_team_id = $6, assignee_team_id = $7, status = $8, due_date = $9, updated_at = $10,
		    check_type = $11, target = $12, parameters = $13
		WHERE id = $1
	`
	_, err = tx.Exec(ctiQuery, cti.ID, cti.Title, cti.Description, cti.Category,
		cti.AssigneeUserID, cti.OwnerTeamID, cti.AssigneeTeamID, cti.Status, cti.DueDate, cti.UpdatedAt,
		cti.CheckType, cti.Target, paramsJSON)

	if err != nil {
		return fmt.Errorf("failed to update campaign task instance %s: %w", cti.ID, err)
	}

	if cti.OwnerUserIDs != nil {
		err = s.updateCampaignTaskInstanceOwners(tx, cti.ID, cti.OwnerUserIDs)
		if err != nil {
			return fmt.Errorf("failed to update owners for CTI %s: %w", cti.ID, err)
		}
	}

	return tx.Commit()
}

func (s *DBStore) updateCampaignTaskInstanceOwners(tx *sql.Tx, ctiID string, ownerIDs []string) error {
	var execFunc func(query string, args ...interface{}) (sql.Result, error)
	if tx != nil {
		execFunc = tx.Exec
	} else {
		execFunc = s.DB.Exec
	}

	_, err := execFunc("DELETE FROM campaign_task_instance_owners WHERE campaign_task_instance_id = $1", ctiID)
	if err != nil {
		return fmt.Errorf("failed to delete existing owners for CTI %s: %w", ctiID, err)
	}

	if len(ownerIDs) == 0 {
		return nil
	}

	var stmt *sql.Stmt
	if tx != nil {
		stmt, err = tx.Prepare("INSERT INTO campaign_task_instance_owners (campaign_task_instance_id, user_id) VALUES ($1, $2)")
	} else {
		stmt, err = s.DB.Prepare("INSERT INTO campaign_task_instance_owners (campaign_task_instance_id, user_id) VALUES ($1, $2)")
	}
	if err != nil {
		return fmt.Errorf("failed to prepare statement for inserting owners: %w", err)
	}
	defer stmt.Close()

	for _, ownerID := range ownerIDs {
		_, err = stmt.Exec(ctiID, ownerID)
		if err != nil {
			return fmt.Errorf("failed to insert owner %s for CTI %s: %w", ownerID, ctiID, err)
		}
	}
	return nil
}

func (s *DBStore) GetCampaignTaskInstancesForUser(userID string, userField string, campaignStatus string) ([]models.CampaignTaskInstance, error) {
	if userID == "" || (userField != "owner" && userField != "assignee" && userField != "owner_team" && userField != "assignee_team") {
		return nil, fmt.Errorf("userID and a valid userField ('owner' or 'assignee') are required")
	}
	var args []interface{}

	query := `
		SELECT 
			cti.id, cti.campaign_id, c.name as campaign_name, cti.master_task_id, cti.campaign_selected_requirement_id, 
			cti.title, cti.description, cti.category, cti.assignee_user_id, cti.owner_team_id, cti.assignee_team_id,
			cti.status, cti.due_date, cti.created_at, cti.updated_at, 
			cti.check_type, cti.target, cti.parameters,
			assignee.name as assignee_user_name,
			req.control_id_reference as requirement_control_id_reference,
			req.requirement_text as requirement_text,
			std.name as requirement_standard_name,
			mt.default_priority,
			mt.evidence_types_expected,
			owner_team.id AS "ownerteam.id", owner_team.name AS "ownerteam.name",
			assignee_team.id AS "assigneeteam.id", assignee_team.name AS "assigneeteam.name"
		FROM campaign_task_instances cti
		LEFT JOIN campaigns c ON cti.campaign_id = c.id
		LEFT JOIN users assignee ON cti.assignee_user_id = assignee.id
		LEFT JOIN campaign_selected_requirements csr ON cti.campaign_selected_requirement_id = csr.id
		LEFT JOIN requirements req ON csr.requirement_id = req.id
		LEFT JOIN compliance_standards std ON req.standard_id = std.id
		LEFT JOIN tasks mt ON cti.master_task_id = mt.id
		LEFT JOIN teams owner_team ON cti.owner_team_id = owner_team.id
		LEFT JOIN teams assignee_team ON cti.assignee_team_id = assignee_team.id
    	`
	conditions := []string{}
	paramIndex := 1

	if userField == "owner" {
		conditions = append(conditions, fmt.Sprintf(
			"(EXISTS (SELECT 1 FROM campaign_task_instance_owners cto WHERE cto.campaign_task_instance_id = cti.id AND cto.user_id = $%d) OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = cti.owner_team_id AND tm.user_id = $%d))",
			paramIndex, paramIndex,
		))
	} else if userField == "assignee" {
		conditions = append(conditions, fmt.Sprintf("cti.assignee_user_id = $%d", paramIndex))
	} else if userField == "owner_team" {
		conditions = append(conditions, fmt.Sprintf("EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = cti.owner_team_id AND tm.user_id = $%d)", paramIndex))
	} else if userField == "assignee_team" {
		conditions = append(conditions, fmt.Sprintf("EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = cti.assignee_team_id AND tm.user_id = $%d)", paramIndex))
	} else {
		return nil, fmt.Errorf("invalid userField: %s", userField)
	}
	args = append(args, userID)
	paramIndex++

	if campaignStatus != "" {
		conditions = append(conditions, fmt.Sprintf("c.status = $%d", paramIndex))
		args = append(args, campaignStatus)
		paramIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += " ORDER BY cti.due_date ASC, cti.created_at DESC"

	rows, err := s.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query campaign task instances for user %s (%s): %w", userID, userField, err)
	}
	defer rows.Close()

	var instances []models.CampaignTaskInstance

	for rows.Next() {
		var i models.CampaignTaskInstance

		i.OwnerTeam = &models.TeamBasicInfo{}
		i.AssigneeTeam = &models.TeamBasicInfo{}

		var paramsJSON []byte
		err := rows.Scan(
			&i.ID, &i.CampaignID, &i.CampaignName, &i.MasterTaskID, &i.CampaignSelectedRequirementID,
			&i.Title, &i.Description, &i.Category, &i.AssigneeUserID, &i.OwnerTeamID, &i.AssigneeTeamID,
			&i.Status, &i.DueDate, &i.CreatedAt, &i.UpdatedAt,
			&i.CheckType, &i.Target, &paramsJSON,
			&i.AssigneeUserName, &i.RequirementControlIDReference, &i.RequirementText, &i.RequirementStandardName,
			&i.DefaultPriority, pq.Array(&i.EvidenceTypesExpected),
			&i.OwnerTeam.ID, &i.OwnerTeam.Name, // For owner_team
			&i.AssigneeTeam.ID, &i.AssigneeTeam.Name, // For assignee_team
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan campaign task instance row for user: %w", err)
		}

		if len(paramsJSON) > 0 && string(paramsJSON) != "null" {
			if err := json.Unmarshal(paramsJSON, &i.Parameters); err != nil {
				log.Printf("Warning: failed to unmarshal parameters for CTI %s: %v", i.ID, err)
				i.Parameters = make(map[string]interface{})
			}
		} else {
			i.Parameters = make(map[string]interface{})
		}

		owners, err := s.getCampaignTaskInstanceOwners(i.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch owners for CTI %s: %w", i.ID, err)
		}
		i.Owners = owners
		instances = append(instances, i)
	}
	return instances, rows.Err()
}

func (s *DBStore) GetTaskInstancesByMasterTaskID(masterTaskID string) ([]models.CampaignTaskInstance, error) {
	query := `
		SELECT
			cti.id, cti.campaign_id, c.name as campaign_name, cti.master_task_id,
			cti.title, cti.status, cti.due_date, cti.created_at, cti.updated_at,
			assignee.name as assignee_user_name,
			req.control_id_reference as requirement_control_id_reference
		FROM campaign_task_instances cti
		LEFT JOIN campaigns c ON cti.campaign_id = c.id
		LEFT JOIN users assignee ON cti.assignee_user_id = assignee.id
		LEFT JOIN campaign_selected_requirements csr ON cti.campaign_selected_requirement_id = csr.id
		LEFT JOIN requirements req ON csr.requirement_id = req.id
		WHERE cti.master_task_id = $1
		ORDER BY c.created_at DESC, cti.created_at DESC
	`
	rows, err := s.DB.Queryx(query, masterTaskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query task instances for master task ID %s: %w", masterTaskID, err)
	}
	defer rows.Close()

	var instances []models.CampaignTaskInstance
	for rows.Next() {
		var i models.CampaignTaskInstance
		// Scan only the necessary fields for the historical list
		err := rows.Scan(
			&i.ID, &i.CampaignID, &i.CampaignName, &i.MasterTaskID,
			&i.Title, &i.Status, &i.DueDate, &i.CreatedAt, &i.UpdatedAt,
			&i.AssigneeUserName,
			&i.RequirementControlIDReference,
		)
		if err != nil {
			log.Printf("Error scanning task instance row for master task ID %s: %v", masterTaskID, err)
			return nil, fmt.Errorf("failed to scan task instance row for master task ID %s: %w", masterTaskID, err)
		}
		// Fetch owners separately if needed for display, or simplify the historical view
		// owners, err := s.getCampaignTaskInstanceOwners(i.ID)
		// if err != nil {
		// 	log.Printf("Warning: failed to fetch owners for historical CTI %s: %v", i.ID, err)
		// }
		// i.Owners = owners
		instances = append(instances, i)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for task instances by master task ID %s: %w", masterTaskID, err)
	}
	return instances, nil
}

func (s *DBStore) getCampaignTaskInstanceOwners(ctiID string) ([]models.UserBasicInfo, error) {
	query := `
		SELECT u.id, u.name, u.email
		FROM users u
		JOIN campaign_task_instance_owners cto ON u.id = cto.user_id
		WHERE cto.campaign_task_instance_id = $1
	`
	rows, err := s.DB.Query(query, ctiID)
	if err != nil {
		return nil, fmt.Errorf("failed to query owners for CTI %s: %w", ctiID, err)
	}
	defer rows.Close()

	var owners []models.UserBasicInfo
	for rows.Next() {
		var owner models.UserBasicInfo
		if err := rows.Scan(&owner.ID, &owner.Name, &owner.Email); err != nil {
			return nil, fmt.Errorf("failed to scan owner for CTI %s: %w", ctiID, err)
		}
		owners = append(owners, owner)
	}
	return owners, rows.Err()
}

func (s *DBStore) GetTaskComments(taskID string, campaignTaskInstanceID string) ([]models.Comment, error) {
	var query string
	var args []interface{}

	baseQuery := `
        SELECT tc.id, tc.task_id, tc.campaign_task_instance_id, tc.user_id, u.name as user_name, tc.text, tc.created_at
        FROM task_comments tc
        LEFT JOIN users u ON tc.user_id = u.id
    `
	if campaignTaskInstanceID != "" {
		query = baseQuery + " WHERE tc.campaign_task_instance_id = $1 ORDER BY tc.created_at ASC"
		args = append(args, campaignTaskInstanceID)
	} else if taskID != "" {
		query = baseQuery + " WHERE tc.task_id = $1 AND tc.campaign_task_instance_id IS NULL ORDER BY tc.created_at ASC"
		args = append(args, taskID)
	} else {
		return nil, fmt.Errorf("either taskID or campaignTaskInstanceID must be provided")
	}
	rows, err := s.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query task comments: %w", err)
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var c models.Comment
		if err := rows.Scan(&c.ID, &c.TaskID, &c.CampaignTaskInstanceID, &c.UserID, &c.UserName, &c.Text, &c.CreatedAt); err != nil {
			log.Printf("Error scanning comment: %v. Row data might be unexpected.", err)
			continue
		}
		comments = append(comments, c)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for task comments: %w", err)
	}
	return comments, nil
}

func (s *DBStore) UpdateUserPassword(userID string, newHashedPassword string) error {
	query := `UPDATE users SET hashed_password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := s.DB.Exec(query, newHashedPassword, userID)
	return err
}

func (s *DBStore) GetUserActivityFeed(userID string, limit, offset int) ([]models.Comment, error) {
	query := `
		SELECT
			tc.id,
			tc.task_id,
			tc.campaign_task_instance_id,
			tc.user_id,
			u.name AS user_name, 
			tc.text,
			tc.created_at,
			cti.title AS task_title 
		FROM task_comments tc
		JOIN users u ON tc.user_id = u.id
		JOIN campaign_task_instances cti ON tc.campaign_task_instance_id = cti.id
		WHERE tc.campaign_task_instance_id IS NOT NULL AND tc.campaign_task_instance_id IN (
			SELECT cto.campaign_task_instance_id
			FROM campaign_task_instance_owners cto
			WHERE cto.user_id = $1
			UNION
			SELECT cti_assignee.id
			FROM campaign_task_instances cti_assignee
			WHERE cti_assignee.assignee_user_id = $1
		)
		ORDER BY tc.created_at DESC
		LIMIT $2 OFFSET $3;
	`

	rows, err := s.DB.Query(query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query user activity feed for user %s: %w", userID, err)
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var c models.Comment
		var taskTitle sql.NullString
		if err := rows.Scan(&c.ID, &c.TaskID, &c.CampaignTaskInstanceID, &c.UserID, &c.UserName, &c.Text, &c.CreatedAt, &taskTitle); err != nil {
			log.Printf("Error scanning activity feed row: %v", err)
			continue
		}
		if taskTitle.Valid {
			c.TaskTitle = &taskTitle.String
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

func (s *DBStore) CopyEvidenceToTaskInstance(targetInstanceID string, sourceEvidenceIDs []string, uploaderUserID string) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction for copying evidence: %w", err)
	}
	defer tx.Rollback()

	for _, sourceEvidenceID := range sourceEvidenceIDs {
		var sourceEvidence models.Evidence
		querySource := `
			SELECT id, task_id, campaign_task_instance_id, uploaded_by_user_id,
			       file_name, file_path, mime_type, file_size, description, uploaded_at
			FROM evidence WHERE id = $1`
		err := tx.QueryRow(querySource, sourceEvidenceID).Scan(
			&sourceEvidence.ID, &sourceEvidence.TaskID, &sourceEvidence.CampaignTaskInstanceID, // Corrected field name
			&sourceEvidence.UploadedByUserID, &sourceEvidence.FileName, &sourceEvidence.FilePath, // Corrected field name
			&sourceEvidence.MimeType, &sourceEvidence.FileSize, &sourceEvidence.Description,
			&sourceEvidence.UploadedAt,
		)
		if err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("source evidence with ID %s not found", sourceEvidenceID)
			}
			return fmt.Errorf("failed to fetch source evidence %s: %w", sourceEvidenceID, err)
		}

		newEvidence := models.Evidence{
			ID:                     uuid.NewString(),
			TaskID:                 nil, // Copied evidence is for a campaign instance
			CampaignTaskInstanceID: &targetInstanceID,
			UploadedByUserID:       uploaderUserID,

			FileName:    sourceEvidence.FileName,
			FilePath:    sourceEvidence.FilePath,
			MimeType:    sourceEvidence.MimeType,
			FileSize:    sourceEvidence.FileSize,
			Description: sourceEvidence.Description,
			UploadedAt:  time.Now(),
			// Reset review status for the new copy
			ReviewStatus:     func() *string { s := "Pending"; return &s }(),
			ReviewedByUserID: nil,
			ReviewedAt:       nil,
			ReviewComments:   nil,
		}

		queryInsert := `INSERT INTO evidence (id, task_id, campaign_task_instance_id, uploaded_by_user_id, file_name, file_path, mime_type, file_size, description, uploaded_at, created_at, updated_at, review_status)
		                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`
		_, err = tx.Exec(queryInsert, newEvidence.ID, newEvidence.TaskID, newEvidence.CampaignTaskInstanceID, newEvidence.UploadedByUserID, newEvidence.FileName, newEvidence.FilePath, newEvidence.MimeType, newEvidence.FileSize, newEvidence.Description, newEvidence.UploadedAt, newEvidence.CreatedAt, newEvidence.UpdatedAt, newEvidence.ReviewStatus)

		if err != nil {
			return fmt.Errorf("failed to insert copied evidence record for source %s: %w", sourceEvidenceID, err)
		}
	}

	return tx.Commit()
}

func (s *DBStore) CreateConnectedSystem(system *models.ConnectedSystem) error {
	query := `INSERT INTO connected_systems (name, system_type, description, configuration, is_enabled)
              VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`
	err := s.DB.QueryRow(query, system.Name, system.SystemType, system.Description, system.Configuration, system.IsEnabled).Scan(&system.ID, &system.CreatedAt, &system.UpdatedAt)
	if err != nil {
		log.Printf("Error creating connected system in DB: %v. System details: %+v", err, system)
	}
	return err
}

func (s *DBStore) GetConnectedSystemByID(id string) (*models.ConnectedSystem, error) {
	var system models.ConnectedSystem
	query := `SELECT id, name, system_type, description, configuration, is_enabled, last_checked_at, last_check_status, created_at, updated_at
              FROM connected_systems WHERE id = $1`
	err := s.DB.Get(&system, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &system, err
}

func (s *DBStore) GetAllConnectedSystems() ([]models.ConnectedSystem, error) {
	var systems []models.ConnectedSystem
	query := `SELECT id, name, system_type, description, configuration, is_enabled, last_checked_at, last_check_status, created_at, updated_at
              FROM connected_systems ORDER BY name ASC`
	err := s.DB.Select(&systems, query)
	return systems, err
}

func (s *DBStore) UpdateConnectedSystem(system *models.ConnectedSystem) error {
	query := `UPDATE connected_systems
              SET name = $1, system_type = $2, description = $3, configuration = $4, is_enabled = $5,
                  last_checked_at = $6, last_check_status = $7, updated_at = NOW()
              WHERE id = $8 RETURNING updated_at`
	var lastCheckedAt sql.NullTime
	if system.LastCheckedAt != nil {
		lastCheckedAt = sql.NullTime{Time: *system.LastCheckedAt, Valid: true}
	}

	var lastCheckStatus sql.NullString
	if system.LastCheckStatus != nil {
		lastCheckStatus = sql.NullString{String: *system.LastCheckStatus, Valid: true}
	}

	err := s.DB.QueryRow(query, system.Name, system.SystemType, system.Description, system.Configuration, system.IsEnabled,
		lastCheckedAt, lastCheckStatus, system.ID).Scan(&system.UpdatedAt)
	if err != nil {
		log.Printf("Error updating connected system in DB: %v. System ID: %s, Details: %+v", err, system.ID, system)
	}
	return err
}

func (s *DBStore) DeleteConnectedSystem(id string) error {
	query := `DELETE FROM connected_systems WHERE id = $1`
	_, err := s.DB.Exec(query, id)
	return err
}

func (s *DBStore) UpdateConnectedSystemStatus(id string, lastCheckedAt time.Time, status string) error {
	query := `UPDATE connected_systems
              SET last_checked_at = $1, last_check_status = $2, updated_at = NOW()
              WHERE id = $3`
	_, err := s.DB.Exec(query, lastCheckedAt, status, id)
	if err != nil {
		log.Printf("Error updating connected system status in DB: %v. System ID: %s", err, id)
	}
	return err
}

func (s *DBStore) CreateCampaignTaskInstanceResult(result *models.CampaignTaskInstanceResult) error {
	query := `INSERT INTO campaign_task_instance_results (campaign_task_instance_id, task_execution_id, executed_by_user_id, timestamp, status, output)
              VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
	err := s.DB.QueryRow(query,
		result.CampaignTaskInstanceID,
		result.TaskExecutionID,
		result.ExecutedByUserID,
		result.Timestamp,
		result.Status,
		result.Output,
	).Scan(&result.ID)
	if err != nil {
		log.Printf("Error creating campaign task instance result in DB: %v. Result details: %+v", err, result)
		return fmt.Errorf("failed to create campaign task instance result: %w", err)
	}
	return nil
}

func (s *DBStore) GetCampaignTaskInstanceResults(instanceID string) ([]models.CampaignTaskInstanceResult, error) {
	var results []models.CampaignTaskInstanceResult
	query := `
		SELECT 
			ctir.id, 
			ctir.campaign_task_instance_id,
			ctir.task_execution_id,
			ctir.executed_by_user_id, 
			u.name as executed_by_user_name, 
			ctir.timestamp, 
			ctir.status, 
			ctir.output
		FROM campaign_task_instance_results ctir
		LEFT JOIN users u ON ctir.executed_by_user_id = u.id
		WHERE ctir.campaign_task_instance_id = $1
		ORDER BY ctir.timestamp DESC
	`
	rows, err := s.DB.Queryx(query, instanceID)
	if err != nil {
		return nil, fmt.Errorf("failed to query campaign task instance results for instance %s: %w", instanceID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var result models.CampaignTaskInstanceResult
		var executedByUser models.UserBasicInfo
		var userName sql.NullString
		err := rows.Scan(
			&result.ID,
			&result.CampaignTaskInstanceID,
			&result.TaskExecutionID,
			&result.ExecutedByUserID,
			&userName,
			&result.Timestamp,
			&result.Status,
			&result.Output,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan campaign task instance result: %w", err)
		}
		if result.ExecutedByUserID != nil {
			executedByUser.ID = *result.ExecutedByUserID
			if userName.Valid {
				executedByUser.Name = userName.String
			}
			result.ExecutedByUser = &executedByUser
		}
		results = append(results, result)
	}
	return results, rows.Err()
}

// GetAuditLogs retrieves audit logs based on filters and pagination.
// It also joins with the users table to populate UserBasicInfo.
func (s *DBStore) GetAuditLogs(filters map[string]interface{}, page, limit int) ([]models.AuditLog, int, error) {
	var logs []models.AuditLog
	var total int

	baseQuery := `
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
    `
	countQuery := "SELECT COUNT(al.id) " + baseQuery
	selectQuery := `
        SELECT
            al.id, al.timestamp, al.user_id, al.action, al.entity_type, al.entity_id, al.changes, al.created_at,
            u.id AS "user.id", u.name AS "user.name", u.email AS "user.email"
    ` + baseQuery

	var whereClauses []string
	var args []interface{}
	argCount := 1

	for key, value := range filters {
		switch key {
		case "al.user_id", "al.entity_type", "al.entity_id":
			whereClauses = append(whereClauses, fmt.Sprintf("%s = $%d", key, argCount))
			args = append(args, value)
			argCount++
		case "start_date":
			whereClauses = append(whereClauses, fmt.Sprintf("al.timestamp >= $%d", argCount))
			args = append(args, value)
			argCount++
		case "end_date":
			whereClauses = append(whereClauses, fmt.Sprintf("al.timestamp <= $%d", argCount))
			args = append(args, value)
			argCount++
		}
	}

	if len(whereClauses) > 0 {
		whereCondition := " WHERE " + strings.Join(whereClauses, " AND ")
		countQuery += whereCondition
		selectQuery += whereCondition
	}

	// Get total count
	err := s.DB.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		log.Printf("Error counting audit logs: %v. Query: %s, Args: %v", err, countQuery, args)
		return nil, 0, fmt.Errorf("error counting audit logs: %w", err)
	}

	if total == 0 {
		return []models.AuditLog{}, 0, nil
	}

	// Add ordering and pagination to select query
	selectQuery += " ORDER BY al.timestamp DESC"

	// Handle pagination or fetching all records
	if limit > 0 { // Apply pagination only if limit is positive
		offset := (page - 1) * limit
		selectQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argCount, argCount+1)
		args = append(args, limit, offset)
	}
	// If limit is 0 or negative, no LIMIT/OFFSET clause is added, fetching all matching records.

	// Fetch logs
	rows, err := s.DB.Queryx(selectQuery, args...)
	if err != nil {
		log.Printf("Error querying audit logs: %v. Query: %s, Args: %v", err, selectQuery, args)
		return nil, 0, fmt.Errorf("error querying audit logs: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var logEntry models.AuditLog
		// Initialize User field because it's a pointer to a struct.
		// sqlx.StructScan handles nested structs with "parent.child" aliases.
		logEntry.User = &models.UserBasicInfo{}

		err := rows.StructScan(&logEntry)
		if err != nil {
			// If user_id was NULL, user.id, user.name, user.email will be scanned as NULLs.
			// Check if the User struct was meant to be populated (i.e., user_id was not null)
			// and if the error is due to trying to scan NULL into non-pointer fields of UserBasicInfo if it had any.
			// However, UserBasicInfo has string fields which can handle default empty values from DB if user_id is NULL.
			// If logEntry.UserID is nil, then logEntry.User should remain nil or be an empty UserBasicInfo.
			if logEntry.UserID == nil {
				logEntry.User = nil // Explicitly set to nil if user_id was null in DB
			} else if logEntry.User != nil && (logEntry.User.ID == "") {
				// This check is tricky; if user_id was not null but user record not found or all fields are null
				// For a LEFT JOIN, if u.id is NULL, then user.id would be scanned as such.
				// sqlx should handle this by not erroring if User.ID is a *string or string.
				// If User.ID is string and db returns NULL for it, it becomes empty string.
				// We only set User to nil if the UserID itself on the audit_log is nil.
			}
			// If it's a genuine scan error not related to null user, then it's a problem.
			log.Printf("Error scanning audit log entry: %v", err)
			// Decide whether to return error or skip this entry
			// For now, let's skip problematic entries but log them.
			continue
		}
		logs = append(logs, logEntry)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating audit log rows: %v", err)
		return nil, 0, fmt.Errorf("error iterating audit log rows: %w", err)
	}

	return logs, total, nil
}

// Placeholder for other methods...
// Ensure all existing methods from the original file are preserved below this line.
// ... (rest of the file content from the read_files output)

// CreateOrUpdateRegisteredPlugin inserts a new plugin or updates an existing one.
// It stores the plugin's check type configurations as JSON.
func (s *DBStore) CreateOrUpdateRegisteredPlugin(pluginID, pluginName string, checkConfigs map[string]models.CheckTypeConfiguration) error {
	configsJSON, err := json.Marshal(checkConfigs)
	if err != nil {
		return fmt.Errorf("failed to marshal check type configurations for plugin %s: %w", pluginID, err)
	}

	query := `
		INSERT INTO registered_plugins (id, name, check_type_configurations, is_active)
		VALUES ($1, $2, $3, TRUE)
		ON CONFLICT (id) DO UPDATE
		SET name = EXCLUDED.name,
			check_type_configurations = EXCLUDED.check_type_configurations,
			is_active = TRUE, -- Ensure it's marked active on update/registration
			updated_at = CURRENT_TIMESTAMP;
	`
	_, err = s.DB.Exec(query, pluginID, pluginName, configsJSON)
	if err != nil {
		return fmt.Errorf("failed to execute create/update for registered plugin %s: %w", pluginID, err)
	}
	return nil
}

// SetRegisteredPluginActiveStatus updates the is_active flag for a plugin.
func (s *DBStore) SetRegisteredPluginActiveStatus(pluginID string, isActive bool) error {
	query := `UPDATE registered_plugins SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`
	_, err := s.DB.Exec(query, isActive, pluginID)
	if err != nil {
		return fmt.Errorf("failed to set active status for plugin %s: %w", pluginID, err)
	}
	return nil
}

// GetActiveCheckTypeConfigurations retrieves and merges CheckTypeConfiguration maps
// from all plugins marked as active in the database.
func (s *DBStore) GetActiveCheckTypeConfigurations() (map[string]models.CheckTypeConfiguration, error) {
	query := `SELECT check_type_configurations FROM registered_plugins WHERE is_active = TRUE;`
	rows, err := s.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query active plugin configurations: %w", err)
	}
	defer rows.Close()

	mergedConfigs := make(map[string]models.CheckTypeConfiguration)
	for rows.Next() {
		var configsJSON json.RawMessage
		if err := rows.Scan(&configsJSON); err != nil {
			return nil, fmt.Errorf("failed to scan plugin configurations row: %w", err)
		}

		var pluginCheckConfigs map[string]models.CheckTypeConfiguration
		if err := json.Unmarshal(configsJSON, &pluginCheckConfigs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal check type configurations from DB: %w", err)
		}
		for key, config := range pluginCheckConfigs {
			mergedConfigs[key] = config // Assumes check type keys are globally unique
		}
	}
	return mergedConfigs, rows.Err()
}
