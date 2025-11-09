.PHONY: help build up down restart logs clean demo migrate superuser shell test lint

# Default target
help:
	@echo "Available commands:"
	@echo "  make build       - Build all Docker containers"
	@echo "  make up          - Start all services in background"
	@echo "  make down        - Stop all services"
	@echo "  make restart     - Restart all services"
	@echo "  make logs        - View logs from all services"
	@echo "  make demo        - Set up demo data (users, services, etc.)"
	@echo "  make migrate     - Run database migrations"
	@echo "  make superuser   - Create a Django superuser"
	@echo "  make shell       - Open Django shell"
	@echo "  make clean       - Remove containers, volumes, and clean up"
	@echo "  make lint        - Check for linter errors"
	@echo ""
	@echo "Production commands:"
	@echo "  make prod-build  - Build production containers"
	@echo "  make prod-up     - Start production services"
	@echo "  make prod-down   - Stop production services"
	@echo "  make prod-logs   - View production logs"

# Development commands
build:
	docker-compose build

up:
	docker-compose up -d
	@echo "Services started! Frontend: http://localhost:5173"

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

demo: up
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "Running migrations..."
	docker-compose exec backend python manage.py migrate
	@echo "Setting up demo data..."
	docker-compose exec backend bash -c "cd /code && DJANGO_SETTINGS_MODULE=hive_project.settings python setup_demo.py"
	@echo ""
	@echo "✅ Demo setup complete!"
	@echo ""
	@echo "Demo Accounts:"
	@echo "  Admin:"
	@echo "    Email: admin@thehive.local"
	@echo "    Password: admin123"
	@echo ""
	@echo "  Demo Users:"
	@echo "    1. elif@demo.com / demo123"
	@echo "    2. cem@demo.com / demo123"
	@echo "    3. marcus@demo.com / demo123"
	@echo ""
	@echo "🚀 Open: http://localhost:5173"

migrate:
	docker-compose exec backend python manage.py migrate

superuser:
	docker-compose exec backend python manage.py createsuperuser

shell:
	docker-compose exec backend python manage.py shell

clean:
	docker-compose down -v
	@echo "Cleaned up containers and volumes"

lint:
	@echo "Checking backend linting..."
	docker-compose exec backend python manage.py check
	@echo "✅ Backend check complete"

# Production commands
prod-build:
	docker-compose -f docker-compose.prod.yml build

prod-up:
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production services started!"

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

prod-migrate:
	docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

prod-static:
	docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Database commands
db-backup:
	@mkdir -p backups
	docker-compose exec -T db pg_dump -U postgres the_hive_db | gzip > backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "Backup created in backups/"

db-restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make db-restore FILE=backups/backup_XXXXXXXX_XXXXXX.sql.gz"; \
		exit 1; \
	fi
	gunzip < $(FILE) | docker-compose exec -T db psql -U postgres the_hive_db
	@echo "Database restored from $(FILE)"

# Quick commands
fresh: clean up demo
	@echo "Fresh environment ready!"

reset:
	docker-compose down -v
	docker-compose up -d
	@sleep 5
	docker-compose exec backend python manage.py migrate
	@echo "Environment reset complete!"

