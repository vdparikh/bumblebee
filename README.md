# Bumblebee

![alt text](image.png)

**Start Database**
```sh
# Pull and start postgres container
docker pull postgres
docker run --name mypostgres -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres

# Wait for PostgreSQL to start (optional, but good practice for scripts)
# sleep 5

# Create the 'compliance' database
# You can do this by connecting to the default 'postgres' database first
docker exec -it mypostgres psql -U postgres -c "CREATE DATABASE compliance;"

# Copy the schema file to the container
# Make sure 'db.sql' is in your current directory before running this command
docker cp db.sql mypostgres:/tmp/db.sql

# Connect to the 'compliance' database and execute the schema file
docker exec -it mypostgres psql -U postgres -d compliance -f /tmp/db.sql

# (Optional) Populate the database with sample data
# Make sure 'sample_data.sql' is in your current directory before running these commands
docker cp sample_data.sql mypostgres:/tmp/sample_data.sql
docker exec -it mypostgres psql -U postgres -d compliance -f /tmp/sample_data.sql
```


TODO
- Only add tasks to the user when the campaign goes into active state.
- Why is overdue tasks not showing?






-- Example: If you need to create the table from scratch (adjust columns as needed)
-- CREATE TABLE IF NOT EXISTS users (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     name VARCHAR(255) NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'auditor', 'user')),
--     hashed_password VARCHAR(255) NOT NULL,
--     created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
-- );
