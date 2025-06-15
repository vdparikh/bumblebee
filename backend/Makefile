# Database migration targets
.PHONY: migrate-up migrate-down migrate-create

migrate-up:
	@echo "Applying database migrations..."
	@migrate -path ./store/migrations -database "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable" up

migrate-down:
	@echo "Reverting last migration..."
	@migrate -path ./store/migrations -database "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable" down 1

migrate-create:
	@if [ -z "$(name)" ]; then \
		echo "Error: Migration name is required. Usage: make migrate-create name=your_migration_name"; \
		exit 1; \
	fi
	@echo "Creating new migration: $(name)..."
	@migrate create -ext sql -dir ./store/migrations -seq $(name) 