package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/vdparikh/compliance-automation/backend/integrations"
	"github.com/vdparikh/compliance-automation/backend/queue"
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

	// Create and start the integration service
	integrationService := integrations.NewIntegrationService(db, q, store)
	integrationService.Start(ctx)
}
