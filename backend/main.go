package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/executor"
	"github.com/vdparikh/compliance-automation/backend/handlers"
	"github.com/vdparikh/compliance-automation/backend/middleware"
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
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = defaultDBUser
	}
	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		log.Fatal("DB_PASSWORD environment variable not set")
	}
	dbName := "compliance"
	dbHost := "localhost"
	dbPort := "5432"
	dbNameEnv := os.Getenv("DB_NAME")
	if dbNameEnv != "" {
		dbName = dbNameEnv
	} else {
		dbName = defaultDBName
	}

	dbHostEnv := os.Getenv("DB_HOST")
	if dbHostEnv != "" {
		dbHost = dbHostEnv
	} else {
		dbHost = defaultDBHost
	}

	dbPortEnv := os.Getenv("DB_PORT")
	if dbPortEnv != "" {
		dbPort = dbPortEnv
	} else {
		dbPort = defaultDBPort
	}

	dataSourceName := "postgres://" + dbUser + ":" + dbPassword + "@" + dbHost + ":" + dbPort + "/" + dbName + "?sslmode=disable"

	dbStore, err := store.NewDBStore(dataSourceName)
	if err != nil {
		log.Fatalf("Could not connect to the database: %v", err)
	}
	defer dbStore.DB.Close()

	executor.InitExecutors()

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
	campaignHandler := handlers.NewCampaignHandler(dbStore)
	authAPI := handlers.NewAuthAPI(dbStore)
	systemIntegrationHandler := handlers.NewSystemIntegrationHandler(dbStore)
	documentHandler := handlers.NewDocumentHandler(dbStore)

	apiV1 := router.Group("/api")

	authRoutes := apiV1.Group("/auth")
	{
		authRoutes.POST("/login", authAPI.Login)
		authRoutes.POST("/register", authAPI.Register)

	}

	api := apiV1.Group("")
	api.Use(middleware.AuthMiddleware())
	{
		api.GET("/auth/me", authAPI.GetCurrentUser)
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

		api.POST("/users", userHandler.CreateUserHandler)
		api.GET("/users", userHandler.GetUsersHandler)

		api.POST("/campaigns", campaignHandler.CreateCampaignHandler)
		api.GET("/campaigns", campaignHandler.GetCampaignsHandler)
		api.GET("/campaigns/:id", campaignHandler.GetCampaignByIDHandler)
		api.PUT("/campaigns/:id", campaignHandler.UpdateCampaignHandler)
		api.DELETE("/campaigns/:id", campaignHandler.DeleteCampaignHandler)
		api.GET("/campaigns/:id/requirements", campaignHandler.GetCampaignSelectedRequirementsHandler)
		api.GET("/campaigns/:id/task-instances", campaignHandler.GetCampaignTaskInstancesHandler)

		api.PUT("/campaign-task-instances/:id", campaignHandler.UpdateCampaignTaskInstanceHandler)
		api.GET("/campaign-task-instances/:id", campaignHandler.GetCampaignTaskInstanceByIDHandler)
		api.GET("/user-campaign-tasks", campaignHandler.GetUserCampaignTaskInstancesHandler)

		api.POST("/campaign-task-instances/:id/comments", campaignHandler.AddCampaignTaskInstanceCommentHandler)
		api.GET("/campaign-task-instances/:id/comments", campaignHandler.GetCampaignTaskInstanceCommentsHandler)
		api.POST("/campaign-task-instances/:id/evidence", campaignHandler.UploadCampaignTaskInstanceEvidenceHandler)
		api.GET("/campaign-task-instances/:id/evidence", campaignHandler.GetCampaignTaskInstanceEvidenceHandler)
		api.POST("/campaign-task-instances/:id/copy-evidence", campaignHandler.CopyEvidenceHandler)

		api.PUT("/evidence/:evidenceId/review", handlers.HandleReviewEvidence(dbStore))

		api.POST("/campaign-task-instances/:id/execute", campaignHandler.ExecuteCampaignTaskInstanceHandler)
		api.GET("/campaign-task-instances/:id/results", campaignHandler.GetCampaignTaskInstanceResultsHandler)

		api.GET("/user-feed", handlers.GetUserFeedHandler(dbStore))

		systemRoutes := api.Group("/systems")
		systemRoutes.POST("", systemIntegrationHandler.CreateConnectedSystemHandler)
		systemRoutes.GET("", systemIntegrationHandler.GetAllConnectedSystemsHandler)
		systemRoutes.GET("/:id", systemIntegrationHandler.GetConnectedSystemHandler)
		systemRoutes.PUT("/:id", systemIntegrationHandler.UpdateConnectedSystemHandler)
		systemRoutes.DELETE("/:id", systemIntegrationHandler.DeleteConnectedSystemHandler)

		documents := api.Group("/documents")

		documents.POST("", documentHandler.CreateDocumentHandler)
		documents.GET("", documentHandler.GetDocumentsHandler)
		documents.GET("/:id", documentHandler.GetDocumentByIDHandler)
		documents.PUT("/:id", documentHandler.UpdateDocumentHandler)
		documents.DELETE("/:id", documentHandler.DeleteDocumentHandler)

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
