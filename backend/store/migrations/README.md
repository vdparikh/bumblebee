# Database Migrations

This directory contains database migrations for the application. Migrations are used to manage database schema changes in a controlled and reversible way.

## Migration Files

Each migration consists of two files:
- `XXXXXX_description.up.sql`: Contains the changes to apply
- `XXXXXX_description.down.sql`: Contains the changes to revert

The `XXXXXX` prefix is a sequential number that determines the order of migrations.

## Current Migrations

1. `000001_init_schema`: Initial schema setup
2. `000002_add_connected_system_id`: Added connected_system_id to campaign_task_instances
3. `000004_add_task_requirements`: Added task_requirements table for many-to-many relationship
4. `000005_add_missing_tables`: Added users, audit_logs, and task_executions tables

## Running Migrations
```
export DB_USER=postgres
export DB_PASSWORD=mysecretpassword
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=compliance
```

### Using Make

```bash
# Apply all pending migrations
make migrate-up

# Revert the last migration
make migrate-down

# Create a new migration
make migrate-create name=description_of_changes
```

### Using golang-migrate CLI

If you prefer using the CLI directly:

```bash
# Install golang-migrate
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Apply all pending migrations
migrate -path ./migrations -database "postgresql://user:password@localhost:5432/dbname?sslmode=disable" up

# Revert the last migration
migrate -path ./migrations -database "postgresql://user:password@localhost:5432/dbname?sslmode=disable" down 1

# Create a new migration
migrate create -ext sql -dir ./migrations -seq description_of_changes
```

## Best Practices

1. Always create both up and down migrations
2. Make migrations idempotent (use IF NOT EXISTS, IF EXISTS)
3. Test migrations in both directions
4. Keep migrations small and focused
5. Use descriptive names for migration files
6. Add comments to explain complex changes
7. Include indexes for performance
8. Use transactions for multi-statement migrations

## Adding New Migrations

1. Create a new migration using the make command:
   ```bash
   make migrate-create name=your_migration_name
   ```

2. Edit the generated .up.sql and .down.sql files

3. Test the migration:
   ```bash
   make migrate-up
   make migrate-down
   ```

4. Commit the migration files to version control 