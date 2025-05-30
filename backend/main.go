package main

import (
	"log"
	"net/http"      // For http.Dir
	"os"            // For environment variables
	"path/filepath" // For clean paths

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/vdparikh/compliance-automation/backend/handlers"   // Adjust import path// Adjust path
	"github.com/vdparikh/compliance-automation/backend/middleware" // Adjust path
	"github.com/vdparikh/compliance-automation/backend/store"      // Adjust import path
	// Adjust path
)

func main() {
	// Database Configuration (consider using a config file or env vars for production)
	// Example: postgresql://user:password@host:port/database?sslmode=disable
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "postgres" // Default user, replace if different
	}
	dbPassword := os.Getenv("DB_PASSWORD") // Your 'mysecretpassword'
	if dbPassword == "" {
		log.Fatal("DB_PASSWORD environment variable not set")
	}
	dbName := "compliance"
	dbHost := "localhost" // Or your Docker container's IP if not localhost from Go app's perspective
	dbPort := "5432"

	// dataSourceName := "postgres://postgres:mysecretpassword@localhost:5432/compliance?sslmode=disable"
	dataSourceName := "postgres://" + dbUser + ":" + dbPassword + "@" + dbHost + ":" + dbPort + "/" + dbName + "?sslmode=disable"

	dbStore, err := store.NewDBStore(dataSourceName)
	if err != nil {
		log.Fatalf("Could not connect to the database: %v", err)
	}
	defer dbStore.DB.Close()

	router := gin.Default()

	// CORS middleware configuration to allow requests from your React frontend
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"} // Adjust if your React app runs on a different port
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	router.Use(cors.New(config))

	// Initialize handlers with the DB store
	// Note: You'll need to update your handler functions to accept the store.
	// For simplicity, I'm showing a direct way, but dependency injection patterns are common.
	// We will modify the handlers in the next step.
	taskHandler := handlers.NewTaskHandler(dbStore) // Example for a new Task handler structure
	requirementHandler := handlers.NewRequirementHandler(dbStore)
	standardHandler := handlers.NewStandardHandler(dbStore)
	userHandler := handlers.NewUserHandler(dbStore)
	campaignHandler := handlers.NewCampaignHandler(dbStore) // New Campaign Handler
	authAPI := handlers.NewAuthAPI(dbStore)

	apiV1 := router.Group("/api")

	// Authentication routes (public)
	authRoutes := apiV1.Group("/auth")
	{
		authRoutes.POST("/login", authAPI.Login)
		authRoutes.POST("/register", authAPI.Register) // Add register route

	}

	// Authenticated routes
	api := apiV1.Group("")               // Group for routes requiring authentication
	api.Use(middleware.AuthMiddleware()) // Apply AuthMiddleware to this group
	{
		api.GET("/auth/me", authAPI.GetCurrentUser)

		// Example of a route requiring 'admin' or 'auditor' role
		// managementRoutes := authedAPI.Group("/management") // Example group
		// managementRoutes.Use(middleware.RoleAuthMiddleware([]string{"admin", "auditor"}))
		// {
		// managementRoutes.POST("/campaigns", campaignAPI.CreateCampaign) // Example
		// }

		// Example of a route accessible by any authenticated user
		// authedAPI.GET("/campaigns", campaignAPI.GetCampaigns)

		api.POST("/tasks", taskHandler.CreateTaskHandler) // Was CreateCheckDefinitionHandler
		api.GET("/tasks", taskHandler.GetTasksHandler)    // Was GetCheckDefinitionsHandler
		api.GET("/tasks/:id", taskHandler.GetTaskHandler)
		api.PUT("/tasks/:id", taskHandler.UpdateTaskHandler) // For updating task status etc.

		api.POST("/requirements", requirementHandler.CreateRequirementHandler)
		api.GET("/requirements", requirementHandler.GetRequirementsHandler)
		api.GET("/requirements/:id", requirementHandler.GetRequirementByIDHandler) // New route
		api.PUT("/requirements/:id", requirementHandler.UpdateRequirementHandler)

		api.POST("/standards", standardHandler.CreateStandardHandler)
		api.GET("/standards", standardHandler.GetStandardsHandler)
		api.PUT("/standards/:id", standardHandler.UpdateStandardHandler)

		api.POST("/users", userHandler.CreateUserHandler)
		api.GET("/users", userHandler.GetUsersHandler)

		// Campaign Routes
		api.POST("/campaigns", campaignHandler.CreateCampaignHandler)
		api.GET("/campaigns", campaignHandler.GetCampaignsHandler)
		api.GET("/campaigns/:id", campaignHandler.GetCampaignByIDHandler)
		api.PUT("/campaigns/:id", campaignHandler.UpdateCampaignHandler)
		api.DELETE("/campaigns/:id", campaignHandler.DeleteCampaignHandler)
		api.GET("/campaigns/:id/requirements", campaignHandler.GetCampaignSelectedRequirementsHandler)
		api.GET("/campaigns/:id/task-instances", campaignHandler.GetCampaignTaskInstancesHandler)

		api.PUT("/campaign-task-instances/:id", campaignHandler.UpdateCampaignTaskInstanceHandler)  // For updating individual task instances
		api.GET("/campaign-task-instances/:id", campaignHandler.GetCampaignTaskInstanceByIDHandler) // New route
		api.GET("/user-campaign-tasks", campaignHandler.GetUserCampaignTaskInstancesHandler)        // New route for MyTasks page

		// Campaign Task Instance Comments & Evidence
		api.POST("/campaign-task-instances/:id/comments", campaignHandler.AddCampaignTaskInstanceCommentHandler)
		api.GET("/campaign-task-instances/:id/comments", campaignHandler.GetCampaignTaskInstanceCommentsHandler)
		api.POST("/campaign-task-instances/:id/evidence", campaignHandler.UploadCampaignTaskInstanceEvidenceHandler)
		api.GET("/campaign-task-instances/:id/evidence", campaignHandler.GetCampaignTaskInstanceEvidenceHandler)

		// New routes for executing campaign task instances and getting results
		api.POST("/campaign-task-instances/:id/execute", campaignHandler.ExecuteCampaignTaskInstanceHandler)
		api.GET("/campaign-task-instances/:id/results", campaignHandler.GetCampaignTaskInstanceResultsHandler)
	}

	// Serve static files from the "uploads" directory
	// This makes files under ./uploads/ accessible via /uploads/
	// For example, ./uploads/campaign_tasks/some_id/file.jpg will be at /uploads/campaign_tasks/some_id/file.jpg
	uploadsDir := "./uploads"
	absUploadsDir, err := filepath.Abs(uploadsDir)
	if err != nil {
		log.Fatalf("Could not get absolute path for uploads directory: %v", err)
	}
	router.StaticFS("/uploads", http.Dir(absUploadsDir))

	log.Println("Starting server on :8080...")
	if err = router.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
