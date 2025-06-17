package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/handlers"
	"github.com/vdparikh/compliance-automation/backend/middleware"
	"github.com/vdparikh/compliance-automation/backend/queue"
	"github.com/vdparikh/compliance-automation/backend/store"
)

const (
	defaultDBUser     = "postgres"
	defaultDBHost     = "localhost"
	defaultDBPort     = "5432"
	defaultDBName     = "compliance"
	defaultServerPort = ":8080"
)

func main() {

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		panic("No $DATABASE_URL set in environment")
	}

	// dbUser := os.Getenv("DB_USER")
	// if dbUser == "" {
	// 	dbUser = defaultDBUser
	// }
	// dbPassword := os.Getenv("DB_PASSWORD")
	// if dbPassword == "" {
	// 	log.Fatal("DB_PASSWORD environment variable not set")
	// }
	// dbName := "compliance"
	// dbHost := "localhost"
	// dbPort := "5432"
	// dbNameEnv := os.Getenv("DB_NAME")
	// if dbNameEnv != "" {
	// 	dbName = dbNameEnv
	// } else {
	// 	dbName = defaultDBName
	// }

	// dbHostEnv := os.Getenv("DB_HOST")
	// if dbHostEnv != "" {
	// 	dbHost = dbHostEnv
	// } else {
	// 	dbHost = defaultDBHost
	// }

	// dbPortEnv := os.Getenv("DB_PORT")
	// if dbPortEnv != "" {
	// 	dbPort = dbPortEnv
	// } else {
	// 	dbPort = defaultDBPort
	// }

	// postgres://postgres:mysecretpassword@localhost:5432/compliance?sslmode=disable
	// dataSourceName := "postgres://" + dbUser + ":" + dbPassword + "@" + dbHost + ":" + dbPort + "/" + dbName + "?sslmode=disable"

	dbStore, err := store.NewDBStore(dbURL)
	if err != nil {
		log.Fatalf("Could not connect to the database: %v", err)
	}
	defer dbStore.DB.Close()

	// Initialize the queue
	queueConfig := map[string]interface{}{
		"connection_string": dbURL,
	}
	q, err := queue.NewQueue(queueConfig)
	if err != nil {
		log.Fatalf("Failed to initialize queue: %v", err)
	}

	router := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	router.Use(cors.New(config))

	taskHandler := handlers.NewTaskHandler(dbStore)
	requirementHandler := handlers.NewRequirementHandler(dbStore)
	standardHandler := handlers.NewStandardHandler(dbStore)
	userHandler := handlers.NewUserHandler(dbStore)
	campaignHandler := handlers.NewCampaignHandler(dbStore, q)
	authAPI := handlers.NewAuthAPI(dbStore)
	systemIntegrationHandler := handlers.NewSystemIntegrationHandler(dbStore)
	documentHandler := handlers.NewDocumentHandler(dbStore)
	teamHandler := handlers.NewTeamHandler(dbStore)
	auditLogHandler := handlers.NewAuditLogHandler(dbStore)                 // Instantiate AuditLogHandler
	integrationHandler := handlers.NewIntegrationHandler(dbStore)           // Instantiate IntegrationHandler
	systemDefinitionHandler := handlers.NewSystemDefinitionHandler(dbStore) // Instantiate SystemDefinitionHandler

	apiV1 := router.Group("/api")

	authRoutes := apiV1.Group("/auth")
	{
		authRoutes.POST("/login", authAPI.Login)
		authRoutes.POST("/register", authAPI.Register)

	}

	api := apiV1.Group("")
	api.Use(middleware.AuthMiddleware())
	{

		api.POST("/users", userHandler.CreateUserHandler)
		api.GET("/users", userHandler.GetUsersHandler)

		api.GET("/auth/me", authAPI.GetCurrentUser)

		// Endpoint for fetching dynamic check type configurations for the frontend
		api.GET("/integration-check-types", integrationHandler.GetIntegrationCheckTypesHandler)
		api.GET("/system-type-definitions", systemDefinitionHandler.GetSystemTypeDefinitionsHandler) // New endpoint
		api.POST("/auth/change-password", authAPI.ChangePasswordHandler)

		api.POST("/tasks", taskHandler.CreateTaskHandler)
		api.GET("/tasks", taskHandler.GetTasksHandler)
		api.GET("/tasks/:id", taskHandler.GetTaskHandler)
		api.PUT("/tasks/:id", taskHandler.UpdateTaskHandler)

		api.POST("/requirements", requirementHandler.CreateRequirementHandler)
		api.GET("/requirements", requirementHandler.GetRequirementsHandler)
		api.GET("/requirements/:id", requirementHandler.GetRequirementByIDHandler)
		api.PUT("/requirements/:id", requirementHandler.UpdateRequirementHandler)

		api.POST("/standards", standardHandler.CreateStandardHandler)
		api.GET("/standards", standardHandler.GetStandardsHandler)
		api.PUT("/standards/:id", standardHandler.UpdateStandardHandler)

		api.POST("/campaigns", campaignHandler.CreateCampaignHandler)
		api.GET("/campaigns", campaignHandler.GetCampaignsHandler)
		api.GET("/campaigns/:id", campaignHandler.GetCampaignByIDHandler)
		api.PUT("/campaigns/:id", campaignHandler.UpdateCampaignHandler)
		api.DELETE("/campaigns/:id", campaignHandler.DeleteCampaignHandler)
		api.GET("/campaigns/:id/requirements", campaignHandler.GetCampaignSelectedRequirementsHandler)
		api.GET("/campaigns/:id/task-instances", campaignHandler.GetCampaignTaskInstancesHandler)

		api.GET("/user-campaign-tasks", campaignHandler.GetUserCampaignTaskInstancesHandler)
		api.GET("/campaign-tasks-by-status", campaignHandler.GetCampaignTaskInstancesByStatusHandler)
		api.GET("/master-tasks/:masterTaskId/instances", campaignHandler.GetTaskInstancesByMasterTaskIDHandler)

		api.PUT("/campaign-task-instances/:id", campaignHandler.UpdateCampaignTaskInstanceHandler)
		api.GET("/campaign-task-instances/:id", campaignHandler.GetCampaignTaskInstanceByIDHandler)
		api.GET("/campaign-task-instances/:id/execution-status", campaignHandler.GetTaskExecutionStatusHandler)
		api.POST("/campaign-task-instances/:id/comments", campaignHandler.AddCampaignTaskInstanceCommentHandler)
		api.GET("/campaign-task-instances/:id/comments", campaignHandler.GetCampaignTaskInstanceCommentsHandler)
		api.POST("/campaign-task-instances/:id/evidence", campaignHandler.UploadCampaignTaskInstanceEvidenceHandler)
		api.GET("/campaign-task-instances/:id/evidence", campaignHandler.GetCampaignTaskInstanceEvidenceHandler)
		api.POST("/campaign-task-instances/:id/copy-evidence", campaignHandler.CopyEvidenceHandler)
		api.POST("/campaign-task-instances/:id/execute", campaignHandler.ExecuteCampaignTaskInstanceHandler)
		api.GET("/campaign-task-instances/:id/results", campaignHandler.GetCampaignTaskInstanceResultsHandler)

		api.PUT("/evidence/:evidenceId/review", handlers.HandleReviewEvidence(dbStore))

		systemRoutes := api.Group("/systems")
		systemRoutes.POST("", systemIntegrationHandler.CreateConnectedSystemHandler)
		systemRoutes.GET("", systemIntegrationHandler.GetAllConnectedSystemsHandler)
		systemRoutes.GET("/:id", systemIntegrationHandler.GetConnectedSystemHandler)
		systemRoutes.PUT("/:id", systemIntegrationHandler.UpdateConnectedSystemHandler)
		systemRoutes.DELETE("/:id", systemIntegrationHandler.DeleteConnectedSystemHandler)

		// Document Routes
		documents := api.Group("/documents")
		documents.POST("", documentHandler.CreateDocumentHandler)
		documents.GET("", documentHandler.GetDocumentsHandler)
		documents.GET("/:id", documentHandler.GetDocumentByIDHandler)
		documents.PUT("/:id", documentHandler.UpdateDocumentHandler)
		documents.DELETE("/:id", documentHandler.DeleteDocumentHandler)

		// Team Routes
		teams := api.Group("/teams")
		teams.POST("", teamHandler.CreateTeamHandler)
		teams.GET("", teamHandler.GetTeamsHandler)
		teams.GET("/:id", teamHandler.GetTeamByIDHandler)
		teams.PUT("/:id", teamHandler.UpdateTeamHandler)
		teams.DELETE("/:id", teamHandler.DeleteTeamHandler)
		teams.POST("/:id/members", teamHandler.AddUserToTeamHandler)
		teams.DELETE("/:id/members/:userId", teamHandler.RemoveUserFromTeamHandler)
		teams.GET("/:id/members", teamHandler.GetTeamMembersHandler)

		api.GET("/user-feed", handlers.GetUserFeedHandler(dbStore))

		// Audit Log Route
		api.GET("/audit-logs", auditLogHandler.GetAuditLogsHandler)
	}

	uploadsDir := "./uploads"
	absUploadsDir, err := filepath.Abs(uploadsDir)
	if err != nil {
		log.Fatalf("Could not get absolute path for uploads directory: %v", err)
	}
	router.StaticFS("/uploads", http.Dir(absUploadsDir))

	log.Printf("Starting server on %s...", defaultServerPort)
	if err = router.Run(defaultServerPort); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
