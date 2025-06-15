package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/integrations/plugins/databasequerier"
	"github.com/vdparikh/compliance-automation/backend/integrations/plugins/filechecker"
	"github.com/vdparikh/compliance-automation/backend/integrations/plugins/httpchecker"
	"github.com/vdparikh/compliance-automation/backend/integrations/plugins/portscanner"
	"github.com/vdparikh/compliance-automation/backend/integrations/plugins/scriptrunner"
	"github.com/vdparikh/compliance-automation/backend/queue"
	"github.com/vdparikh/compliance-automation/backend/services"
	"github.com/vdparikh/compliance-automation/backend/store"
)

func main() {
	// Create a context that will be canceled on SIGINT or SIGTERM
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Set up signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("Received shutdown signal")
		cancel()
	}()

	// Get database connection string from environment
	dbConnStr := os.Getenv("DATABASE_URL")
	if dbConnStr == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Initialize database connection
	db, err := sql.Open("postgres", dbConnStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Initialize store
	store, err := store.NewDBStore(dbConnStr)
	if err != nil {
		log.Fatal(err)
	}

	// Initialize queue
	queueConfig := map[string]interface{}{
		"connection_string": dbConnStr,
	}
	q, err := queue.NewPostgresQueue(queueConfig)
	if err != nil {
		log.Fatal(err)
	}

	// Initialize the plugin registry service
	pluginRegistry := services.NewPluginRegistryService(store)

	httpPlugin := httpchecker.New()
	if err := pluginRegistry.RegisterPlugin(httpPlugin); err != nil {
		log.Fatalf("Failed to register HTTP checker plugin: %v", err)
	}

	scriptPlugin := scriptrunner.New()
	if err := pluginRegistry.RegisterPlugin(scriptPlugin); err != nil {
		log.Fatalf("Failed to register script runner plugin: %v", err)
	}

	dbQueryPlugin := databasequerier.New()
	if err := pluginRegistry.RegisterPlugin(dbQueryPlugin); err != nil {
		log.Fatalf("Failed to register Database Querier plugin: %v", err)
	}

	portScanPlugin := portscanner.New()
	if err := pluginRegistry.RegisterPlugin(portScanPlugin); err != nil {
		log.Fatalf("Failed to register Port Scanner plugin: %v", err)
	}

	fileExistsPlugin := filechecker.New()
	if err := pluginRegistry.RegisterPlugin(fileExistsPlugin); err != nil {
		log.Fatalf("Failed to register File Checker plugin: %v", err)
	}

	// // Example: Print registered check types (optional)
	// checkTypes := pluginRegistry.GetCheckTypeConfigurations()
	// fmt.Printf("Registered check types: %+v\n", checkTypes)

	// Create and start the task execution service (queue processor)
	taskExecutionSvc := integrations.NewTaskExecutionService(db, q, store, pluginRegistry)
	taskExecutionSvc.Start(ctx)
}
