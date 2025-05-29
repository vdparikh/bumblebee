package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq" // PostgreSQL driver
	"github.com/vdparikh/compliance-automation/backend/models"
)

// DBStore holds the database connection.
type DBStore struct {
	DB *sql.DB
}

// NewDBStore creates a new DBStore and pings the database.
func NewDBStore(dataSourceName string) (*DBStore, error) {
	db, err := sql.Open("postgres", dataSourceName)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err = db.Ping(); err != nil {
		db.Close() // Close the connection if ping fails
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Successfully connected to the database!")
	return &DBStore{DB: db}, nil
}

// --- Task Methods ---

// CreateTask creates a new task in the database.
func (s *DBStore) CreateTask(task *models.Task) error {
	task.ID = uuid.NewString()
	task.CreatedAt = time.Now()
	task.UpdatedAt = time.Now()

	// Handle nullable fields for automated checks
	var checkType sql.NullString
	if task.CheckType != nil && *task.CheckType != "" {
		checkType.String = *task.CheckType
		checkType.Valid = true
	}
	var target sql.NullString
	if task.Target != nil && *task.Target != "" {
		target.String = *task.Target
		target.Valid = true
	}

	var paramsJSON []byte
	var err error
	if task.Parameters != nil {
		paramsJSON, err = json.Marshal(task.Parameters)
		if err != nil {
			return fmt.Errorf("failed to marshal task parameters: %w", err)
		}
	} else {
		paramsJSON = []byte("{}") // Default to empty JSON object if nil
	}

	query := `
		INSERT INTO tasks (id, requirement_id, title, description, category, owner_user_id, assignee_user_id, status, due_date, created_at, updated_at, check_type, target, parameters)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	_, err = s.DB.Exec(query, task.ID, task.RequirementID, task.Title, task.Description, task.Category, task.OwnerUserID, task.AssigneeUserID, task.Status, task.DueDate, task.CreatedAt, task.UpdatedAt, checkType, target, paramsJSON)
	if err != nil {
		return fmt.Errorf("failed to insert task: %w", err)
	}
	return nil
}

// GetTasks retrieves tasks. If userID is provided, filters by owner_user_id or assignee_user_id based on userField.
func (s *DBStore) GetTasks(userID, userField string) ([]models.Task, error) {
	baseQuery := `
		SELECT id, requirement_id, title, description, category, owner_user_id, assignee_user_id, status, due_date, created_at, updated_at, check_type, target, parameters
		FROM tasks
	`
	var args []interface{}
	var fullQuery string

	if userID != "" {
		if userField == "owner" {
			fullQuery = baseQuery + " WHERE owner_user_id = $1 ORDER BY created_at DESC"
		} else if userField == "assignee" {
			fullQuery = baseQuery + " WHERE assignee_user_id = $1 ORDER BY created_at DESC"
		} else { // Default to all tasks if userField is invalid but userID is present (or handle error)
			fullQuery = baseQuery + " ORDER BY created_at DESC"
		}
		args = append(args, userID)
	} else {
		fullQuery = baseQuery + " ORDER BY created_at DESC"
	}

	rows, err := s.DB.Query(fullQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query tasks: %w", err)
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var t models.Task
		var paramsJSON []byte // For scanning JSONB from DB
		if err := rows.Scan(&t.ID, &t.RequirementID, &t.Title, &t.Description, &t.Category, &t.OwnerUserID, &t.AssigneeUserID, &t.Status, &t.DueDate, &t.CreatedAt, &t.UpdatedAt, &t.CheckType, &t.Target, &paramsJSON); err != nil {
			return nil, fmt.Errorf("failed to scan task row: %w", err)
		}
		if len(paramsJSON) > 0 && string(paramsJSON) != "null" { // Check for actual JSON data
			if err := json.Unmarshal(paramsJSON, &t.Parameters); err != nil {
				// Log error but continue, or handle more gracefully
				log.Printf("Warning: failed to unmarshal parameters for task %s: %v", t.ID, err)
				t.Parameters = make(map[string]interface{}) // Initialize to empty map
			}
		} else {
			t.Parameters = make(map[string]interface{}) // Initialize if null or empty
		}
		tasks = append(tasks, t)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for tasks: %w", err)
	}
	return tasks, nil
}

// GetTaskByID retrieves a single task by its ID.
func (s *DBStore) GetTaskByID(taskID string) (*models.Task, error) {
	query := `
		SELECT id, requirement_id, title, description, category, owner_user_id, assignee_user_id, status, due_date, created_at, updated_at, check_type, target, parameters
		FROM tasks WHERE id = $1
	`
	row := s.DB.QueryRow(query, taskID)

	var t models.Task
	var paramsJSON []byte
	err := row.Scan(&t.ID, &t.RequirementID, &t.Title, &t.Description, &t.Category, &t.OwnerUserID, &t.AssigneeUserID, &t.Status, &t.DueDate, &t.CreatedAt, &t.UpdatedAt, &t.CheckType, &t.Target, &paramsJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Or a specific "not found" error
		}
		return nil, fmt.Errorf("failed to scan task row: %w", err)
	}

	if len(paramsJSON) > 0 && string(paramsJSON) != "null" {
		if err := json.Unmarshal(paramsJSON, &t.Parameters); err != nil {
			log.Printf("Warning: failed to unmarshal parameters for task %s: %v", t.ID, err)
			t.Parameters = make(map[string]interface{})
		}
	} else {
		t.Parameters = make(map[string]interface{})
	}

	return &t, nil
}

// UpdateTask updates an existing task in the database.
func (s *DBStore) UpdateTask(task *models.Task) error {
	task.UpdatedAt = time.Now()

	var checkType sql.NullString
	if task.CheckType != nil && *task.CheckType != "" {
		checkType.String = *task.CheckType
		checkType.Valid = true
	}
	var target sql.NullString
	if task.Target != nil && *task.Target != "" {
		target.String = *task.Target
		target.Valid = true
	}

	paramsJSON, err := json.Marshal(task.Parameters)
	if err != nil {
		return fmt.Errorf("failed to marshal task parameters for update: %w", err)
	}

	query := `
		UPDATE tasks
		SET requirement_id = $2, title = $3, description = $4, category = $5, owner_user_id = $6, 
		    assignee_user_id = $7, status = $8, due_date = $9, updated_at = $10, 
		    check_type = $11, target = $12, parameters = $13
		WHERE id = $1`
	_, err = s.DB.Exec(query, task.ID, task.RequirementID, task.Title, task.Description, task.Category, task.OwnerUserID, task.AssigneeUserID, task.Status, task.DueDate, task.UpdatedAt, checkType, target, paramsJSON)
	if err != nil {
		return fmt.Errorf("failed to update task with id %s: %w", task.ID, err)
	}
	return nil
}

// GetTasksByRequirementID retrieves all master tasks associated with a specific requirement ID.
func (s *DBStore) GetTasksByRequirementID(requirementID string) ([]models.Task, error) {
	query := `
		SELECT id, requirement_id, title, description, category, owner_user_id, assignee_user_id, status, due_date, created_at, updated_at, check_type, target, parameters
		FROM tasks
		WHERE requirement_id = $1
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
		if err := rows.Scan(&t.ID, &t.RequirementID, &t.Title, &t.Description, &t.Category, &t.OwnerUserID, &t.AssigneeUserID, &t.Status, &t.DueDate, &t.CreatedAt, &t.UpdatedAt, &t.CheckType, &t.Target, &paramsJSON); err != nil {
			return nil, fmt.Errorf("failed to scan task row for requirement_id %s: %w", requirementID, err)
		}
		if len(paramsJSON) > 0 && string(paramsJSON) != "null" {
			if err := json.Unmarshal(paramsJSON, &t.Parameters); err != nil {
				log.Printf("Warning: failed to unmarshal parameters for task %s: %v", t.ID, err)
				t.Parameters = make(map[string]interface{}) // Initialize to empty map
			}
		} else {
			t.Parameters = make(map[string]interface{}) // Initialize if null or empty
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

// --- Requirement Methods ---

// CreateRequirement creates a new requirement in the database.
func (s *DBStore) CreateRequirement(req *models.Requirement) error {
	req.ID = uuid.NewString() // Assuming IDs are UUIDs generated by the app

	query := `
		INSERT INTO requirements (id, standard_id, control_id_reference, requirement_text)
		VALUES ($1, $2, $3, $4)
	`
	// Note: standard_id should be a valid UUID of an existing compliance_standard.
	// For simplicity, we're not fetching/validating it here, but in a real app, you would.
	_, err := s.DB.Exec(query, req.ID, req.StandardID, req.ControlIDReference, req.RequirementText)
	if err != nil {
		return fmt.Errorf("failed to insert requirement: %w", err)
	}
	return nil
}

// GetRequirements retrieves all requirements from the database.
func (s *DBStore) GetRequirements() ([]models.Requirement, error) {
	query := `
		SELECT id, standard_id, control_id_reference, requirement_text
		FROM requirements ORDER BY control_id_reference ASC
	`
	rows, err := s.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query requirements: %w", err)
	}
	defer rows.Close()

	var requirements []models.Requirement
	for rows.Next() {
		var r models.Requirement
		if err := rows.Scan(&r.ID, &r.StandardID, &r.ControlIDReference, &r.RequirementText); err != nil {
			return nil, fmt.Errorf("failed to scan requirement row: %w", err)
		}
		requirements = append(requirements, r)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for requirements: %w", err)
	}
	return requirements, nil
}

// --- User Methods ---

// CreateUser creates a new user in the database.
func (s *DBStore) CreateUser(user *models.User) error {
	user.ID = uuid.NewString() // Assuming IDs are UUIDs generated by the app

	query := `
		INSERT INTO users (id, name, email, role)
		VALUES ($1, $2, $3, $4)
	`
	// In a real app, you'd hash passwords if storing them, and handle email uniqueness etc.
	_, err := s.DB.Exec(query, user.ID, user.Name, user.Email, user.Role)
	if err != nil {
		return fmt.Errorf("failed to insert user: %w", err)
	}
	return nil
}

// GetUsers retrieves all users from the database.
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

// TODO: Implement methods for GetTaskByID, UpdateTask, DeleteTask
// TODO: Implement methods for other models (Users, Requirements, Standards, Evidence, Comments, TaskExecutionResults)

// --- ComplianceStandard Methods ---

// CreateComplianceStandard creates a new compliance standard in the database.
func (s *DBStore) CreateComplianceStandard(standard *models.ComplianceStandard) error {
	standard.ID = uuid.NewString() // Assuming IDs are UUIDs generated by the app

	query := `
		INSERT INTO compliance_standards (id, name, short_name, description)
		VALUES ($1, $2, $3, $4)
	`
	_, err := s.DB.Exec(query, standard.ID, standard.Name, standard.ShortName, standard.Description)
	if err != nil {
		return fmt.Errorf("failed to insert compliance standard: %w", err)
	}
	return nil
}

// GetComplianceStandards retrieves all compliance standards from the database.
func (s *DBStore) GetComplianceStandards() ([]models.ComplianceStandard, error) {
	query := `
		SELECT id, name, short_name, description
		FROM compliance_standards ORDER BY name ASC
	`
	rows, err := s.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query compliance standards: %w", err)
	}
	defer rows.Close()

	var standards []models.ComplianceStandard
	for rows.Next() {
		var std models.ComplianceStandard
		if err := rows.Scan(&std.ID, &std.Name, &std.ShortName, &std.Description); err != nil {
			return nil, fmt.Errorf("failed to scan compliance standard row: %w", err)
		}
		standards = append(standards, std)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for compliance standards: %w", err)
	}
	return standards, nil
}

// GetRequirementByID retrieves a single requirement by its ID.
func (s *DBStore) GetRequirementByID(id string) (*models.Requirement, error) {
	var requirement models.Requirement
	// Query adjusted to select fields consistent with other Requirement methods.
	// Assumes models.Requirement primarily uses ID, StandardID, ControlIDReference, RequirementText.
	// If CreatedAt and UpdatedAt are needed here, ensure they are in the models.Requirement struct
	// and uncomment them in the query and Scan below.
	query := `SELECT id, standard_id, control_id_reference, requirement_text 
              FROM requirements WHERE id = $1`
	row := s.DB.QueryRow(query, id)
	err := row.Scan(
		&requirement.ID,
		&requirement.StandardID,
		&requirement.ControlIDReference,
		&requirement.RequirementText,
		// &requirement.CreatedAt, // Uncomment if field exists in model and query
		// &requirement.UpdatedAt, // Uncomment if field exists in model and query
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err // Return sql.ErrNoRows directly for the handler
		}
		return nil, fmt.Errorf("error scanning requirement by id %s: %w", id, err)
	}
	return &requirement, nil
}

// --- TaskComment Methods ---

// CreateTaskComment adds a new comment to a task.
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

// --- TaskEvidence Methods ---

// CreateTaskEvidence adds a new evidence record for a task.
func (s *DBStore) CreateTaskEvidence(evidence *models.Evidence) error {
	evidence.ID = uuid.NewString()
	evidence.UploadedAt = time.Now()

	query := `
		INSERT INTO task_evidence (id, task_id, campaign_task_instance_id, uploader_user_id, file_name, file_path, mime_type, file_size, description, uploaded_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := s.DB.Exec(query, evidence.ID, evidence.TaskID, evidence.CampaignTaskInstanceID, evidence.UploaderUserID, evidence.FileName, evidence.FilePath, evidence.MimeType, evidence.FileSize, evidence.Description, evidence.UploadedAt)
	if err != nil {
		return fmt.Errorf("failed to insert task evidence: %w", err)
	}
	return nil
}

// GetTaskEvidence retrieves all evidence for a given task_id.
func (s *DBStore) GetTaskEvidence(taskID string) ([]models.Evidence, error) {
	// Similar to comments, you might want to JOIN with users table to get uploader_name
	query := `
		SELECT id, task_id, campaign_task_instance_id, uploader_user_id, file_name, file_path, mime_type, file_size, description, uploaded_at
		FROM task_evidence
		WHERE task_id = $1 AND campaign_task_instance_id IS NULL
		ORDER BY uploaded_at DESC
	`
	// This is a simplified version. For a full implementation, you'd use rows.Scan similar to GetTaskComments.
	// For brevity, I'm omitting the full scan loop here, but it would be analogous.
	var evidences []models.Evidence
	// Placeholder: Implement actual rows scanning here
	rows, err := s.DB.Query(query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to query task evidence for task_id %s: %w", taskID, err)
	}
	defer rows.Close()

	for rows.Next() {
		var ev models.Evidence
		if err := rows.Scan(&ev.ID, &ev.TaskID, &ev.CampaignTaskInstanceID, &ev.UploaderUserID, &ev.FileName, &ev.FilePath, &ev.MimeType, &ev.FileSize, &ev.Description, &ev.UploadedAt); err != nil {
			return nil, fmt.Errorf("failed to scan task evidence row: %w", err)
		}
		evidences = append(evidences, ev)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for task evidence: %w", err)
	}
	return evidences, nil
}

// CreateCampaignTaskInstanceComment is an alias for CreateTaskComment, ensuring CampaignTaskInstanceID is set.
func (s *DBStore) CreateCampaignTaskInstanceComment(comment *models.Comment) error {
	if comment.CampaignTaskInstanceID == nil || *comment.CampaignTaskInstanceID == "" {
		return fmt.Errorf("CampaignTaskInstanceID is required for campaign task comments")
	}
	comment.TaskID = nil // Ensure master TaskID is null for campaign-specific comments
	return s.CreateTaskComment(comment)
}

// GetCampaignTaskInstanceComments retrieves comments for a specific campaign task instance.
func (s *DBStore) GetCampaignTaskInstanceComments(campaignTaskInstanceID string) ([]models.Comment, error) {
	return s.GetTaskComments("", campaignTaskInstanceID) // Use the existing GetTaskComments logic
}

// CreateCampaignTaskInstanceEvidence adds evidence for a specific campaign task instance.
func (s *DBStore) CreateCampaignTaskInstanceEvidence(evidence *models.Evidence) error {
	if evidence.CampaignTaskInstanceID == nil || *evidence.CampaignTaskInstanceID == "" {
		return fmt.Errorf("CampaignTaskInstanceID is required for campaign task evidence")
	}
	evidence.TaskID = nil // Ensure master TaskID is null for campaign-specific evidence
	return s.CreateTaskEvidence(evidence)
}

// GetCampaignTaskInstanceEvidence retrieves evidence for a specific campaign task instance.
func (s *DBStore) GetCampaignTaskInstanceEvidence(campaignTaskInstanceID string) ([]models.Evidence, error) {
	query := `
		SELECT id, task_id, campaign_task_instance_id, uploader_user_id, file_name, file_path, mime_type, file_size, description, uploaded_at
		FROM task_evidence
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
		if err := rows.Scan(&ev.ID, &ev.TaskID, &ev.CampaignTaskInstanceID, &ev.UploaderUserID, &ev.FileName, &ev.FilePath, &ev.MimeType, &ev.FileSize, &ev.Description, &ev.UploadedAt); err != nil {
			return nil, fmt.Errorf("failed to scan campaign task evidence row: %w", err)
		}
		evidences = append(evidences, ev)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for campaign task evidence: %w", err)
	}
	return evidences, nil
}

// --- Requirement Methods ---

// UpdateRequirement updates an existing requirement in the database.
func (s *DBStore) UpdateRequirement(req *models.Requirement) error {
	// req.UpdatedAt = time.Now() // If you add an updated_at column
	query := `
		UPDATE requirements
		SET standard_id = $2, control_id_reference = $3, requirement_text = $4
		WHERE id = $1`
	_, err := s.DB.Exec(query, req.ID, req.StandardID, req.ControlIDReference, req.RequirementText)
	if err != nil {
		return fmt.Errorf("failed to update requirement with id %s: %w", req.ID, err)
	}
	return nil
}

// --- ComplianceStandard Methods ---

// UpdateStandard updates an existing compliance standard.
func (s *DBStore) UpdateStandard(standard *models.ComplianceStandard) error {
	// standard.UpdatedAt = time.Now() // If you add an updated_at column
	query := `
		UPDATE compliance_standards
		SET name = $2, short_name = $3, description = $4
		WHERE id = $1`
	_, err := s.DB.Exec(query, standard.ID, standard.Name, standard.ShortName, standard.Description)
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
	defer tx.Rollback() // Rollback if not committed

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
			// Generate ID for campaign_selected_requirements here to use it for campaign_task_instances
			campaignSelectedRequirementID := uuid.NewString()
			_, err = stmt.Exec(campaignSelectedRequirementID, campaign.ID, sr.RequirementID, sr.IsApplicable)
			if err != nil {
				return "", fmt.Errorf("failed to insert campaign_selected_requirement: %w", err)
			}
			// If the requirement is applicable, copy its associated master tasks
			if sr.IsApplicable {
				masterTasks, err := s.GetTasksByRequirementID(sr.RequirementID)
				if err != nil {
					// Log error but continue transaction? Or rollback? For now, log and continue.
					log.Printf("Error fetching master tasks for requirement %s during campaign creation: %v", sr.RequirementID, err)
					// return "", fmt.Errorf("failed to fetch master tasks for requirement %s: %w", sr.RequirementID, err) // Option to rollback
					continue
				}

				for _, masterTask := range masterTasks {
					campaignTaskInstance := models.CampaignTaskInstance{
						// ID will be generated by CreateCampaignTaskInstance
						CampaignID:                    campaign.ID,
						MasterTaskID:                  &masterTask.ID,
						CampaignSelectedRequirementID: &campaignSelectedRequirementID, // Link to the specific campaign_selected_requirement
						Title:                         masterTask.Title,
						Description:                   &masterTask.Description, // Assuming description can be nil in master task
						Category:                      &masterTask.Category,    // Assuming category can be nil
						Status:                        "Open",                  // Default status for new campaign tasks
						// OwnerUserID and AssigneeUserID will be set later by the auditor
						// DueDate can also be set later or inherited/calculated
						CheckType:  masterTask.CheckType,
						Target:     masterTask.Target,
						Parameters: masterTask.Parameters, // This assumes Task.Parameters (map[string]string) can be assigned to CTI.Parameters (map[string]interface{})
					}
					if masterTask.Description == "" { // Handle empty string vs nil for pointers
						campaignTaskInstance.Description = nil
					}
					if masterTask.Category == "" {
						campaignTaskInstance.Category = nil
					}

					_, err := s.CreateCampaignTaskInstance(tx, &campaignTaskInstance) // Pass transaction
					if err != nil {
						// Log error but continue transaction? Or rollback?
						log.Printf("Error creating campaign task instance for master task %s: %v", masterTask.ID, err)
						// return "", fmt.Errorf("failed to create campaign task instance for master task %s: %w", masterTask.ID, err) // Option to rollback
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
		// Return sql.ErrNoRows directly if that's the error, so handler can check
		if err == sql.ErrNoRows {
			return nil, err
		}
		return nil, fmt.Errorf("failed to scan campaign row for ID %s: %w", campaignID, err)
	}
	// Optionally, fetch selected requirements and task instances here and populate them
	// camp.SelectedRequirements, _ = s.GetCampaignSelectedRequirements(campaignID)
	return &camp, nil
}

// UpdateCampaign updates an existing campaign.
// This version includes logic to manage CampaignTaskInstances based on changes to selected requirements.
func (s *DBStore) UpdateCampaign(campaign *models.Campaign, newSelectedReqs []models.CampaignSelectedRequirement) error {
	campaign.UpdatedAt = time.Now()
	tx, err := s.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction for update campaign: %w", err)
	}
	defer tx.Rollback()

	// Update campaign basic details
	query := `
		UPDATE campaigns
		SET name = $2, description = $3, standard_id = $4, start_date = $5, end_date = $6, status = $7, updated_at = $8
		WHERE id = $1
	`
	_, err = tx.Exec(query, campaign.ID, campaign.Name, campaign.Description, campaign.StandardID, campaign.StartDate, campaign.EndDate, campaign.Status, campaign.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to update campaign %s: %w", campaign.ID, err)
	}

	// --- Manage CampaignSelectedRequirements and CampaignTaskInstances ---
	// 1. Get current selected requirements for this campaign
	currentDBReqs, err := s.getCampaignSelectedRequirementsTx(tx, campaign.ID) // Helper to run query in transaction
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

	// 2. Delete old campaign_selected_requirements and their tasks if they are removed or no longer applicable
	for reqID, currentReq := range currentReqMap {
		newReq, existsInNew := newReqMap[reqID]
		if !existsInNew || (currentReq.IsApplicable && !newReq.IsApplicable) {
			// Requirement removed from scope or made not applicable - delete its tasks for this campaign
			_, err = tx.Exec("DELETE FROM campaign_task_instances WHERE campaign_id = $1 AND campaign_selected_requirement_id = $2", campaign.ID, currentReq.ID)
			if err != nil {
				return fmt.Errorf("failed to delete task instances for removed/non-applicable requirement %s (csr_id: %s): %w", reqID, currentReq.ID, err)
			}
			// And delete the campaign_selected_requirement itself
			_, err = tx.Exec("DELETE FROM campaign_selected_requirements WHERE id = $1", currentReq.ID)
			if err != nil {
				return fmt.Errorf("failed to delete campaign_selected_requirement %s: %w", currentReq.ID, err)
			}
		}
	}

	// 3. Add/Update new selected requirements and create tasks if applicable
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

		// If the requirement is marked as applicable in the current update,
		// ensure all its master tasks are instanced for this campaign.
		if newReq.IsApplicable {
			masterTasks, err := s.GetTasksByRequirementID(newReq.RequirementID) // This can be outside Tx if it's just a read
			if err != nil {
				// Propagate error to rollback transaction
				return fmt.Errorf("error fetching master tasks for requirement %s (CSR_ID: %s) during campaign update: %w", newReq.RequirementID, campaignSelectedRequirementID, err)
			}

			if len(masterTasks) == 0 {
				log.Printf("No master tasks found for applicable requirement %s (CSR_ID: %s, ControlID: %s) in campaign %s. No new campaign task instances will be created for it if none exist.", newReq.RequirementID, campaignSelectedRequirementID, newReq.ControlIDReference, campaign.ID)
			}

			// Get existing CampaignTaskInstance master_task_ids for this specific campaign_selected_requirement_id
			// to avoid creating duplicates if they already exist.
			existingCTIMasterTaskIDs := make(map[string]bool)
			queryExistingCTIs := `
				SELECT master_task_id 
				FROM campaign_task_instances 
				WHERE campaign_id = $1 AND campaign_selected_requirement_id = $2 AND master_task_id IS NOT NULL
			`
			rows, err := tx.Query(queryExistingCTIs, campaign.ID, campaignSelectedRequirementID)
			if err != nil {
				log.Printf("Error fetching existing CTIs for campaign %s, CSR_ID %s: %v", campaign.ID, campaignSelectedRequirementID, err)
				return fmt.Errorf("failed to fetch existing CTIs for CSR_ID %s: %w", campaignSelectedRequirementID, err) // Critical error, rollback
			}

			for rows.Next() {
				var mtID sql.NullString // Use sql.NullString for master_task_id as it's nullable
				if err := rows.Scan(&mtID); err != nil {
					rows.Close()
					log.Printf("Error scanning existing CTI master_task_id for CSR_ID %s: %v", campaignSelectedRequirementID, err)
					return fmt.Errorf("failed to scan existing CTI master_task_id for CSR_ID %s: %w", campaignSelectedRequirementID, err) // Critical error
				}
				if mtID.Valid {
					existingCTIMasterTaskIDs[mtID.String] = true
				}
			}
			rows.Close() // Important to close rows after iterating

			for _, masterTask := range masterTasks {
				// If a CTI for this masterTask (linked to this specific campaign_selected_requirement) doesn't already exist, create it.
				if _, exists := existingCTIMasterTaskIDs[masterTask.ID]; !exists {
					cti := models.CampaignTaskInstance{
						CampaignID:                    campaign.ID,
						MasterTaskID:                  &masterTask.ID,
						CampaignSelectedRequirementID: &campaignSelectedRequirementID,
						Title:                         masterTask.Title,
						Description:                   &masterTask.Description,
						Category:                      &masterTask.Category,
						Status:                        "Open", // Default for newly added tasks
						CheckType:                     masterTask.CheckType,
						Target:                        masterTask.Target,
						Parameters:                    masterTask.Parameters,
					}
					if masterTask.Description == "" {
						cti.Description = nil
					}
					if masterTask.Category == "" {
						cti.Category = nil
					}
					_, err := s.CreateCampaignTaskInstance(tx, &cti)
					if err != nil {
						// Propagate error to rollback transaction
						return fmt.Errorf("error creating new CTI for master task %s (CSR_ID: %s) during campaign update: %w", masterTask.ID, campaignSelectedRequirementID, err)
					}
					log.Printf("Successfully created new CTI for master task %s (CSR_ID: %s, ControlID: %s) in campaign %s", masterTask.ID, campaignSelectedRequirementID, newReq.ControlIDReference, campaign.ID)
				}
			}
		}
	}

	return tx.Commit()
}

// DeleteCampaign - Implement
func (s *DBStore) DeleteCampaign(campaignID string) error {
	// Note: ON DELETE CASCADE should handle related campaign_selected_requirements and campaign_task_instances
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
		return fmt.Errorf("campaign %s not found for deletion", campaignID) // Or return nil if "not found" is not an error
	}
	return nil
}

// --- CampaignSelectedRequirement Methods ---
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

// Helper function to get campaign selected requirements within a transaction
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

// --- CampaignTaskInstance Methods ---
// CreateCampaignTaskInstance creates a new campaign task instance.
// It accepts an optional transaction. If tx is nil, it starts a new one.
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
			owner_user_id, assignee_user_id, status, due_date, created_at, updated_at, 
			check_type, target, parameters
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	if tx != nil {
		_, err = tx.Exec(query, cti.ID, cti.CampaignID, cti.MasterTaskID, cti.CampaignSelectedRequirementID, cti.Title, cti.Description, cti.Category, cti.OwnerUserID, cti.AssigneeUserID, cti.Status, cti.DueDate, cti.CreatedAt, cti.UpdatedAt, cti.CheckType, cti.Target, paramsJSON)
	} else {
		_, err = s.DB.Exec(query, cti.ID, cti.CampaignID, cti.MasterTaskID, cti.CampaignSelectedRequirementID, cti.Title, cti.Description, cti.Category, cti.OwnerUserID, cti.AssigneeUserID, cti.Status, cti.DueDate, cti.CreatedAt, cti.UpdatedAt, cti.CheckType, cti.Target, paramsJSON)
	}

	if err != nil {
		return "", fmt.Errorf("failed to insert campaign task instance: %w", err)
	}
	return cti.ID, nil
}

func (s *DBStore) GetCampaignTaskInstances(campaignID string, userID string, userField string) ([]models.CampaignTaskInstance, error) {
	baseQuery := `
		SELECT 
			cti.id, cti.campaign_id, cti.master_task_id, cti.campaign_selected_requirement_id, 
			cti.title, cti.description, cti.category, cti.owner_user_id, cti.assignee_user_id, 
			cti.status, cti.due_date, cti.created_at, cti.updated_at, 
			cti.check_type, cti.target, cti.parameters,
			owner.name as owner_user_name, assignee.name as assignee_user_name,
			req.control_id_reference as requirement_control_id_reference
		FROM campaign_task_instances cti
		LEFT JOIN users owner ON cti.owner_user_id = owner.id
		LEFT JOIN users assignee ON cti.assignee_user_id = assignee.id
		LEFT JOIN campaign_selected_requirements csr ON cti.campaign_selected_requirement_id = csr.id
		LEFT JOIN requirements req ON csr.requirement_id = req.id
		WHERE cti.campaign_id = $1
	`
	args := []interface{}{campaignID}
	var fullQuery string

	if userID != "" {
		if userField == "owner" {
			fullQuery = baseQuery + " AND cti.owner_user_id = $2 ORDER BY cti.created_at DESC"
			args = append(args, userID)
		} else if userField == "assignee" {
			fullQuery = baseQuery + " AND cti.assignee_user_id = $2 ORDER BY cti.created_at DESC"
			args = append(args, userID)
		} else {
			fullQuery = baseQuery + " ORDER BY cti.created_at DESC"
		}
	} else {
		fullQuery = baseQuery + " ORDER BY cti.created_at DESC"
	}

	rows, err := s.DB.Query(fullQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query campaign task instances for campaign %s: %w", campaignID, err)
	}
	defer rows.Close()

	var instances []models.CampaignTaskInstance
	for rows.Next() {
		var i models.CampaignTaskInstance
		var paramsJSON []byte
		if err := rows.Scan(
			&i.ID, &i.CampaignID, &i.MasterTaskID, &i.CampaignSelectedRequirementID,
			&i.Title, &i.Description, &i.Category, &i.OwnerUserID, &i.AssigneeUserID,
			&i.Status, &i.DueDate, &i.CreatedAt, &i.UpdatedAt,
			&i.CheckType, &i.Target, &paramsJSON,
			&i.OwnerUserName, &i.AssigneeUserName, &i.RequirementControlIDReference,
		); err != nil {
			return nil, fmt.Errorf("failed to scan campaign task instance row: %w", err)
		}
		if len(paramsJSON) > 0 && string(paramsJSON) != "null" {
			if err := json.Unmarshal(paramsJSON, &i.Parameters); err != nil {
				log.Printf("Warning: failed to unmarshal parameters for CTI %s: %v", i.ID, err)
				i.Parameters = make(map[string]interface{})
			}
		} else {
			i.Parameters = make(map[string]interface{})
		}
		instances = append(instances, i)
	}
	return instances, rows.Err()
}

func (s *DBStore) GetCampaignTaskInstanceByID(ctiID string) (*models.CampaignTaskInstance, error) {
	query := `
		SELECT 
			cti.id, cti.campaign_id, c.name as campaign_name, cti.master_task_id, cti.campaign_selected_requirement_id, 
			cti.title, cti.description, cti.category, cti.owner_user_id, cti.assignee_user_id, 
			cti.status, cti.due_date, cti.created_at, cti.updated_at, 
			cti.check_type, cti.target, cti.parameters,
			owner.name as owner_user_name, assignee.name as assignee_user_name,
			req.control_id_reference as requirement_control_id_reference
		FROM campaign_task_instances cti
		LEFT JOIN campaigns c ON cti.campaign_id = c.id
		LEFT JOIN users owner ON cti.owner_user_id = owner.id
		LEFT JOIN users assignee ON cti.assignee_user_id = assignee.id
		LEFT JOIN campaign_selected_requirements csr ON cti.campaign_selected_requirement_id = csr.id
		LEFT JOIN requirements req ON csr.requirement_id = req.id
		WHERE cti.id = $1
	`
	row := s.DB.QueryRow(query, ctiID)
	var cti models.CampaignTaskInstance
	var paramsJSON []byte
	err := row.Scan(
		&cti.ID, &cti.CampaignID, &cti.CampaignName, &cti.MasterTaskID, &cti.CampaignSelectedRequirementID,
		&cti.Title, &cti.Description, &cti.Category, &cti.OwnerUserID, &cti.AssigneeUserID,
		&cti.Status, &cti.DueDate, &cti.CreatedAt, &cti.UpdatedAt,
		&cti.CheckType, &cti.Target, &paramsJSON,
		&cti.OwnerUserName, &cti.AssigneeUserName, &cti.RequirementControlIDReference,
	)
	if err != nil {
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
	return &cti, nil
}

func (s *DBStore) UpdateCampaignTaskInstance(cti *models.CampaignTaskInstance) error {
	cti.UpdatedAt = time.Now()
	paramsJSON, err := json.Marshal(cti.Parameters)
	if err != nil {
		return fmt.Errorf("failed to marshal CTI parameters for update: %w", err)
	}

	// Build query dynamically based on which fields are non-nil/non-zero in 'cti'
	// This is a simplified version that updates all provided fields.
	// A more robust PATCH-like update would only update fields present in the request.
	query := `
		UPDATE campaign_task_instances
		SET title = $2, description = $3, category = $4, owner_user_id = $5, 
		    assignee_user_id = $6, status = $7, due_date = $8, updated_at = $9,
		    check_type = $10, target = $11, parameters = $12
		WHERE id = $1
	`
	_, err = s.DB.Exec(query, cti.ID, cti.Title, cti.Description, cti.Category,
		cti.OwnerUserID, cti.AssigneeUserID, cti.Status, cti.DueDate, cti.UpdatedAt,
		cti.CheckType, cti.Target, paramsJSON)

	if err != nil {
		return fmt.Errorf("failed to update campaign task instance %s: %w", cti.ID, err)
	}
	return nil
}

// GetCampaignTaskInstancesForUser retrieves all campaign task instances for a given user ID,
// filtered by their role (owner or assignee). It also joins with campaigns to get campaign names.
// It can also filter by campaign status.
func (s *DBStore) GetCampaignTaskInstancesForUser(userID string, userField string, campaignStatus string) ([]models.CampaignTaskInstance, error) {
	if userID == "" || (userField != "owner" && userField != "assignee") {
		return nil, fmt.Errorf("userID and a valid userField ('owner' or 'assignee') are required")
	}
	var args []interface{}
	query := `
		SELECT 
			cti.id, cti.campaign_id, c.name as campaign_name, cti.master_task_id, cti.campaign_selected_requirement_id, 
			cti.title, cti.description, cti.category, cti.owner_user_id, cti.assignee_user_id, 
			cti.status, cti.due_date, cti.created_at, cti.updated_at, 
			cti.check_type, cti.target, cti.parameters,
			owner.name as owner_user_name, assignee.name as assignee_user_name,
			req.control_id_reference as requirement_control_id_reference
		FROM campaign_task_instances cti
		LEFT JOIN campaigns c ON cti.campaign_id = c.id
		LEFT JOIN users owner ON cti.owner_user_id = owner.id
		LEFT JOIN users assignee ON cti.assignee_user_id = assignee.id
		LEFT JOIN campaign_selected_requirements csr ON cti.campaign_selected_requirement_id = csr.id
		LEFT JOIN requirements req ON csr.requirement_id = req.id
    	`
	conditions := []string{}
	paramIndex := 1

	if userField == "owner" {
		conditions = append(conditions, fmt.Sprintf("cti.owner_user_id = $%d", paramIndex))
	} else { // assignee
		conditions = append(conditions, fmt.Sprintf("cti.assignee_user_id = $%d", paramIndex))
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
		var paramsJSON []byte
		// Add campaign_name to scan targets
		err = rows.Scan( // Assign to err to check it
			&i.ID, &i.CampaignID, &i.CampaignName, &i.MasterTaskID, &i.CampaignSelectedRequirementID,
			&i.Title, &i.Description, &i.Category, &i.OwnerUserID, &i.AssigneeUserID,
			&i.Status, &i.DueDate, &i.CreatedAt, &i.UpdatedAt,
			&i.CheckType, &i.Target, &paramsJSON,
			&i.OwnerUserName, &i.AssigneeUserName, &i.RequirementControlIDReference,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan campaign task instance row for user: %w", err)
		} // Ensure all fields are scanned

		if len(paramsJSON) > 0 && string(paramsJSON) != "null" {
			if err := json.Unmarshal(paramsJSON, &i.Parameters); err != nil {
				log.Printf("Warning: failed to unmarshal parameters for CTI %s: %v", i.ID, err)
				i.Parameters = make(map[string]interface{})
			}
		} else {
			i.Parameters = make(map[string]interface{})
		}
		instances = append(instances, i)
	}
	return instances, rows.Err()
}

// DeleteCampaignTaskInstance - Implement if needed

// --- Modified GetTaskComments, GetTaskEvidence, GetTaskExecutionResults ---
// These need to be adapted to query based on campaign_task_instance_id if provided,
// or fall back to task_id (master task) if that's the desired logic.
// Example for GetTaskComments:
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
	} else if taskID != "" { // Fallback or for comments on master tasks
		query = baseQuery + " WHERE tc.task_id = $1 AND tc.campaign_task_instance_id IS NULL ORDER BY tc.created_at ASC"
		args = append(args, taskID)
	} else {
		return nil, fmt.Errorf("either taskID or campaignTaskInstanceID must be provided")
	}
	// ... rest of the scanning logic ...
	rows, err := s.DB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query task comments: %w", err)
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var c models.Comment
		// Adjust scan to include new campaign_task_instance_id and handle nullable task_id
		if err := rows.Scan(&c.ID, &c.TaskID, &c.CampaignTaskInstanceID, &c.UserID, &c.UserName, &c.Text, &c.CreatedAt); err != nil {
			log.Printf("Error scanning comment: %v. Row data might be unexpected.", err) // More detailed log
			// Consider how to handle scan errors: skip row, return partial, or fail all
			// For now, let's log and continue, which might result in some comments being missed if scan fails
			continue
		}
		comments = append(comments, c)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration for task comments: %w", err)
	}
	return comments, nil
}

// Apply similar logic to GetTaskEvidence and GetTaskExecutionResults
