.PHONY: build-ui docker-build up down logs clean all

# Default Go package path for backend (can be overridden if needed)
BACKEND_DIR := ./backend
FRONTEND_DIR := ./frontend

DB_SQL_FILE := ./db.sql # Assuming db.sql is at the project root

build-ui:
	@echo "Building frontend UI..."
	@cd $(FRONTEND_DIR) && npm install && npm run build
	@echo "Frontend UI build complete. Output in $(FRONTEND_DIR)/build"

docker-build:
	@echo "Building Docker images for backend services..."
	@docker-compose build app integrations
	@echo "Docker images built."

# Target to build everything: UI and then Docker images
build-all: build-ui docker-build

up:
	@echo "Starting services with Docker Compose..."
	@docker-compose up -d
	@echo "Services started."

down:
	@echo "Stopping services..."
	@docker-compose down
	@echo "Services stopped."

logs:
	@echo "Tailing logs for all services..."
	@docker-compose logs -f

logs-app:
	@echo "Tailing logs for app service..."
	@docker-compose logs -f app

logs-integrations:
	@echo "Tailing logs for integrations service..."
	@docker-compose logs -f integrations

logs-db:
	@echo "Tailing logs for postgres service..."
	@docker-compose logs -f postgres

clean: down
	@echo "Cleaning up Docker volumes (postgres_data will be removed)..."
	@docker-compose down -v
	@echo "Cleanup done."

# Full fresh start: clean, build UI, build Docker images, start services
fresh-start: clean build-all up

# Default target
all: build-all up
