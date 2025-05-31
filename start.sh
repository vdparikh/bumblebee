#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Stopping any existing services..."
docker-compose down -v --remove-orphans # -v to remove volumes if you want a clean db, remove if not

echo "Building and starting services..."
# Use --build to ensure images are rebuilt if Dockerfiles change
docker-compose up --build -d

echo ""
echo "Services started successfully!"
echo "------------------------------------"
echo "Frontend available at: http://localhost:3000"
echo "Backend API available at: http://localhost:8080/api"
echo "PostgreSQL DB available on host port: 5432 (if mapped and needed for direct access)"
echo "------------------------------------"
echo "To view logs: docker-compose logs -f"
echo "To stop services: docker-compose down"