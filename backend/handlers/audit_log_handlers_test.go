package handlers

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/vdparikh/compliance-automation/backend/auth"
	"github.com/vdparikh/compliance-automation/backend/models"
	"github.com/vdparikh/compliance-automation/backend/store"
)

// MockStore is a generic mock for the store.Store interface
type MockStore struct {
	mock.Mock
}

// Implement all methods of store.Store interface
func (m *MockStore) CreateTask(task *models.Task) (string, error) {
	args := m.Called(task)
	return args.String(0), args.Error(1)
}
func (m *MockStore) GetTasks(userID, userField string) ([]models.Task, error) {
	args := m.Called(userID, userField)
	return args.Get(0).([]models.Task), args.Error(1)
}
func (m *MockStore) GetTaskByID(taskID string) (*models.Task, error) {
	args := m.Called(taskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Task), args.Error(1)
}
func (m *MockStore) UpdateTask(task *models.Task) error {
	args := m.Called(task)
	return args.Error(0)
}
func (m *MockStore) GetTasksByRequirementID(requirementID string) ([]models.Task, error) {
	panic("not implemented")
}
func (m *MockStore) CreateRequirement(req *models.Requirement) error { panic("not implemented") }
func (m *MockStore) GetRequirements() ([]models.Requirement, error) { panic("not implemented") }
func (m *MockStore) GetRequirementByID(id string) (*models.Requirement, error) {
	panic("not implemented")
}
func (m *MockStore) UpdateRequirement(req *models.Requirement) error { panic("not implemented") }
func (m *MockStore) CreateUser(user *models.User) error            { panic("not implemented") }
func (m *MockStore) GetUsers() ([]models.User, error)              { panic("not implemented") }
func (m *MockStore) GetUserByEmail(email string) (*models.User, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}
func (m *MockStore) GetUserByID(userID uuid.UUID) (*models.User, error) {
	args := m.Called(userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}
func (m *MockStore) UpdateUserPassword(userID string, newHashedPassword string) error {
	panic("not implemented")
}
func (m *MockStore) CreateComplianceStandard(standard *models.ComplianceStandard) error {
	panic("not implemented")
}
func (m *MockStore) GetComplianceStandards() ([]models.ComplianceStandard, error) {
	panic("not implemented")
}
func (m *MockStore) UpdateStandard(standard *models.ComplianceStandard) error {
	panic("not implemented")
}
func (m *MockStore) CreateTaskComment(comment *models.Comment) error { panic("not implemented") }
func (m *MockStore) GetTaskComments(taskID string, campaignTaskInstanceID string) ([]models.Comment, error) {
	panic("not implemented")
}
func (m *MockStore) GetTaskEvidence(taskID string) ([]models.Evidence, error) {
	panic("not implemented")
}
func (m *MockStore) CreateCampaign(campaign *models.Campaign, selectedReqs []models.CampaignSelectedRequirement) (string, error) {
	panic("not implemented")
}
func (m *MockStore) GetCampaigns(campaignStatus string) ([]models.Campaign, error) {
	panic("not implemented")
}
func (m *MockStore) GetCampaignByID(campaignID string) (*models.Campaign, error) {
	panic("not implemented")
}
func (m *MockStore) UpdateCampaign(campaign *models.Campaign, newSelectedReqs []models.CampaignSelectedRequirement) error {
	panic("not implemented")
}
func (m *MockStore) DeleteCampaign(campaignID string) error { panic("not implemented") }
func (m *MockStore) GetCampaignSelectedRequirements(campaignID string) ([]models.CampaignSelectedRequirement, error) {
	panic("not implemented")
}
func (m *MockStore) CreateCampaignTaskInstance(tx *sql.Tx, cti *models.CampaignTaskInstance) (string, error) {
	panic("not implemented")
}
func (m *MockStore) GetCampaignTaskInstances(campaignID string, userID string, userField string) ([]models.CampaignTaskInstance, error) {
	panic("not implemented")
}
func (m *MockStore) GetCampaignTaskInstanceByID(ctiID string) (*models.CampaignTaskInstance, error) {
	panic("not implemented")
}
func (m *MockStore) UpdateCampaignTaskInstance(cti *models.CampaignTaskInstance) error {
	panic("not implemented")
}
func (m *MockStore) GetCampaignTaskInstancesForUser(userID string, userField string, campaignStatus string) ([]models.CampaignTaskInstance, error) {
	panic("not implemented")
}
func (m *MockStore) GetTaskInstancesByMasterTaskID(masterTaskID string) ([]models.CampaignTaskInstance, error) {
	panic("not implemented")
}
func (m *MockStore) CreateTeam(team *models.Team) (string, error) { panic("not implemented") }
func (m *MockStore) GetTeamByID(teamID string) (*models.Team, error) { panic("not implemented") }
func (m *MockStore) GetTeams() ([]models.Team, error)                { panic("not implemented") }
func (m *MockStore) UpdateTeam(team *models.Team) error              { panic("not implemented") }
func (m *MockStore) DeleteTeam(teamID string) error                  { panic("not implemented") }
func (m *MockStore) AddUserToTeam(teamID string, userID string, roleInTeam string) error {
	panic("not implemented")
}
func (m *MockStore) RemoveUserFromTeam(teamID string, userID string) error {
	panic("not implemented")
}
func (m *MockStore) GetTeamMembers(teamID string) ([]models.User, error) {
	panic("not implemented")
}
func (m *MockStore) GetUserActivityFeed(userID string, limit, offset int) ([]models.Comment, error) {
	panic("not implemented")
}
func (m *MockStore) CopyEvidenceToTaskInstance(targetInstanceID string, sourceEvidenceIDs []string, uploaderUserID string) error {
	panic("not implemented")
}
func (m *MockStore) CreateEvidence(evidence *models.Evidence) (string, error) {
	panic("not implemented")
}
func (m *MockStore) GetEvidenceByID(evidenceID string) (*models.Evidence, error) {
	panic("not implemented")
}
func (m *MockStore) UpdateEvidenceReview(evidenceID string, reviewerID string, reviewDetails store.ReviewEvidenceUpdateRequest) (*models.Evidence, error) {
	panic("not implemented")
}
func (m *MockStore) DeleteEvidence(evidenceID string) error { panic("not implemented") }
func (m *MockStore) CreateDocument(doc *models.Document) (string, error) {
	panic("not implemented")
}
func (m *MockStore) GetDocuments() ([]models.Document, error) { panic("not implemented") }
func (m *MockStore) GetDocumentByID(id string) (*models.Document, error) {
	panic("not implemented")
}
func (m *MockStore) UpdateDocument(doc *models.Document) error    { panic("not implemented") }
func (m *MockStore) DeleteDocument(id string) error               { panic("not implemented") }
func (m *MockStore) CreateConnectedSystem(system *models.ConnectedSystem) error {
	panic("not implemented")
}
func (m *MockStore) GetConnectedSystemByID(id string) (*models.ConnectedSystem, error) {
	panic("not implemented")
}
func (m *MockStore) GetAllConnectedSystems() ([]models.ConnectedSystem, error) {
	panic("not implemented")
}
func (m *MockStore) UpdateConnectedSystem(system *models.ConnectedSystem) error {
	panic("not implemented")
}
func (m *MockStore) DeleteConnectedSystem(id string) error { panic("not implemented") }
func (m *MockStore) UpdateConnectedSystemStatus(id string, lastCheckedAt time.Time, status string) error {
	panic("not implemented")
}
func (m *MockStore) CreateCampaignTaskInstanceResult(result *models.CampaignTaskInstanceResult) error {
	panic("not implemented")
}
func (m *MockStore) GetCampaignTaskInstanceResults(instanceID string) ([]models.CampaignTaskInstanceResult, error) {
	panic("not implemented")
}
func (m *MockStore) InsertAuditLog(log *models.AuditLog) error {
	args := m.Called(log)
	return args.Error(0)
}
func (m *MockStore) GetAuditLogs(filters map[string]interface{}, page, limit int) ([]models.AuditLog, int, error) {
	args := m.Called(filters, page, limit)
	return args.Get(0).([]models.AuditLog), args.Int(1), args.Error(2)
}

func setupRouterForAuditLogHandler(mockStore *MockStore) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New() // Use gin.New() instead of gin.Default() for cleaner test output
	auditLogHandler := NewAuditLogHandler(mockStore)
	router.GET("/api/audit-logs", auditLogHandler.GetAuditLogsHandler)
	return router
}

func TestGetAuditLogsHandler(t *testing.T) {
	mockStore := new(MockStore)
	router := setupRouterForAuditLogHandler(mockStore)

	adminClaims := &auth.Claims{UserID: "admin-user-id", Email: "admin@example.com", Role: models.UserRoleAdmin}
	auditorClaims := &auth.Claims{UserID: "auditor-user-id", Email: "auditor@example.com", Role: models.UserRoleAuditor}
	userClaims := &auth.Claims{UserID: "user-id", Email: "user@example.com", Role: models.UserRoleUser} // Assuming UserRoleUser exists

	// Sample audit logs
	sampleTime := time.Now().UTC()
	sampleLogs := []models.AuditLog{
		{ID: "log1", Timestamp: sampleTime, UserID: &adminClaims.UserID, Action: "create_user", EntityType: "user", EntityID: "new-user-1", User: &models.UserBasicInfo{ID: &adminClaims.UserID, Name: &adminClaims.Email, Email: adminClaims.Email}},
		{ID: "log2", Timestamp: sampleTime.Add(-1 * time.Hour), UserID: &auditorClaims.UserID, Action: "update_task", EntityType: "task", EntityID: "task-abc", User: &models.UserBasicInfo{ID: &auditorClaims.UserID, Name: &auditorClaims.Email, Email: auditorClaims.Email}},
	}

	t.Run("successful retrieval by admin", func(t *testing.T) {
		mockStore.On("GetAuditLogs", mock.AnythingOfType("map[string]interface{}"), 1, 20).Return(sampleLogs, len(sampleLogs), nil).Once()

		req, _ := http.NewRequest(http.MethodGet, "/api/audit-logs?page=1&limit=20", nil)
		w := httptest.NewRecorder()

		// Mock context with admin claims
		router.Use(func(c *gin.Context) {
			c.Set(string(auth.ContextKeyClaims), adminClaims)
		})
		router.ServeHTTP(w, req)
		router.Handlers = router.Handlers[:len(router.Handlers)-1] // Clean up middleware for next test

		assert.Equal(t, http.StatusOK, w.Code)
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.NotNil(t, response["data"])
		assert.NotNil(t, response["pagination"])
		mockStore.AssertExpectations(t)
	})

	t.Run("successful retrieval by auditor", func(t *testing.T) {
		mockStore.On("GetAuditLogs", mock.AnythingOfType("map[string]interface{}"), 1, 10).Return(sampleLogs[:1], len(sampleLogs), nil).Once()

		req, _ := http.NewRequest(http.MethodGet, "/api/audit-logs?limit=10", nil)
		w := httptest.NewRecorder()
		router.Use(func(c *gin.Context) {
			c.Set(string(auth.ContextKeyClaims), auditorClaims)
		})
		router.ServeHTTP(w, req)
		router.Handlers = router.Handlers[:len(router.Handlers)-1]

		assert.Equal(t, http.StatusOK, w.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("forbidden for non-admin/auditor role", func(t *testing.T) {
		// No store call expected
		req, _ := http.NewRequest(http.MethodGet, "/api/audit-logs", nil)
		w := httptest.NewRecorder()
		router.Use(func(c *gin.Context) {
			c.Set(string(auth.ContextKeyClaims), userClaims)
		})
		router.ServeHTTP(w, req)
		router.Handlers = router.Handlers[:len(router.Handlers)-1]

		assert.Equal(t, http.StatusForbidden, w.Code)
		// mockStore.AssertNotCalled(t, "GetAuditLogs") // Ensure store method wasn't called
	})

	t.Run("filter parsing", func(t *testing.T) {
		expectedFilters := map[string]interface{}{
			"al.user_id":     "user-test-id",
			"al.entity_type": "task",
			// Date filters would be time.Time objects
		}
		mockStore.On("GetAuditLogs", mock.MatchedBy(func(filters map[string]interface{}) bool {
			return filters["al.user_id"] == expectedFilters["al.user_id"] &&
			       filters["al.entity_type"] == expectedFilters["al.entity_type"]
		}), 1, 20).Return([]models.AuditLog{}, 0, nil).Once()

		req, _ := http.NewRequest(http.MethodGet, "/api/audit-logs?user_id=user-test-id&entity_type=task", nil)
		w := httptest.NewRecorder()
		router.Use(func(c *gin.Context) {
			c.Set(string(auth.ContextKeyClaims), adminClaims)
		})
		router.ServeHTTP(w, req)
		router.Handlers = router.Handlers[:len(router.Handlers)-1]

		assert.Equal(t, http.StatusOK, w.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("export as CSV", func(t *testing.T) {
		mockStore.On("GetAuditLogs", mock.AnythingOfType("map[string]interface{}"), 1, 0).Return(sampleLogs, len(sampleLogs), nil).Once()

		req, _ := http.NewRequest(http.MethodGet, "/api/audit-logs?export=csv", nil)
		w := httptest.NewRecorder()
		router.Use(func(c *gin.Context) {
			c.Set(string(auth.ContextKeyClaims), adminClaims)
		})
		router.ServeHTTP(w, req)
		router.Handlers = router.Handlers[:len(router.Handlers)-1]

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "text/csv", w.Header().Get("Content-Type"))
		assert.True(t, strings.HasPrefix(w.Header().Get("Content-Disposition"), "attachment; filename=\"audit_logs_"))
		assert.True(t, strings.HasSuffix(w.Header().Get("Content-Disposition"), ".csv\""))

		// Verify CSV content
		reader := csv.NewReader(w.Body)
		records, err := reader.ReadAll()
		assert.NoError(t, err)
		assert.Len(t, records, len(sampleLogs)+1) // +1 for header
		assert.Equal(t, []string{"Timestamp", "UserID", "UserName", "UserEmail", "Action", "EntityType", "EntityID", "Changes", "LogCreatedAt"}, records[0])
		assert.Equal(t, sampleLogs[0].Action, records[1][4]) // Check some data
		mockStore.AssertExpectations(t)
	})

	t.Run("export as JSON", func(t *testing.T) {
		mockStore.On("GetAuditLogs", mock.AnythingOfType("map[string]interface{}"), 1, 0).Return(sampleLogs, len(sampleLogs), nil).Once()

		req, _ := http.NewRequest(http.MethodGet, "/api/audit-logs?export=json", nil)
		w := httptest.NewRecorder()
		router.Use(func(c *gin.Context) {
			c.Set(string(auth.ContextKeyClaims), adminClaims)
		})
		router.ServeHTTP(w, req)
		router.Handlers = router.Handlers[:len(router.Handlers)-1]

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
		assert.True(t, strings.HasPrefix(w.Header().Get("Content-Disposition"), "attachment; filename=\"audit_logs_"))
		assert.True(t, strings.HasSuffix(w.Header().Get("Content-Disposition"), ".json\""))

		var exportedLogs []models.AuditLog
		err := json.Unmarshal(w.Body.Bytes(), &exportedLogs)
		assert.NoError(t, err)
		assert.Len(t, exportedLogs, len(sampleLogs))
		mockStore.AssertExpectations(t)
	})

	t.Run("invalid date format", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/audit-logs?start_date=invalid-date", nil)
		w := httptest.NewRecorder()
		router.Use(func(c *gin.Context) {
			c.Set(string(auth.ContextKeyClaims), adminClaims)
		})
		router.ServeHTTP(w, req)
		router.Handlers = router.Handlers[:len(router.Handlers)-1]

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	// Assuming models.UserRoleUser etc are defined. If not, use string literals like "user".
	// e.g., claims.Role: "user"
}
