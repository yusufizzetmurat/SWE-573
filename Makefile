.PHONY: help build delete demo logs migrate superuser shell lint prod-build prod-delete prod-demo prod-logs db-backup db-restore test test-backend test-frontend test-e2e test-all

help:
	@echo "The Hive - Development & Production Commands"
	@echo ""
	@echo "Development:"
	@echo "  make build       - Build development containers"
	@echo "  make demo        - Build + setup demo data"
	@echo "  make delete      - Delete containers, volumes & databases"
	@echo "  make logs        - View development logs"
	@echo ""
	@echo "Production:"
	@echo "  make prod-build  - Build production containers"
	@echo "  make prod-demo   - Build + setup demo data"
	@echo "  make prod-delete - Delete containers, volumes & databases"
	@echo "  make prod-logs   - View production logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-backup   - Backup database to backups/"
	@echo "  make db-restore  - Restore database (use: FILE=backup.sql.gz)"
	@echo ""
	@echo "Testing:"
	@echo "  make test          - Run backend + frontend unit tests"
	@echo "  make test-backend  - Run backend Django tests"
	@echo "  make test-frontend - Run frontend Vitest tests"
	@echo "  make test-e2e      - Run Playwright E2E tests"
	@echo "  make test-all      - Run all tests including E2E"
	@echo ""
	@echo "Utilities:"
	@echo "  make migrate     - Run database migrations"
	@echo "  make superuser   - Create Django superuser"
	@echo "  make shell       - Open Django shell"
	@echo "  make lint        - Check for errors"

build:
	@echo "Building development containers..."
	docker compose build

demo: build
	@echo "Starting development environment..."
	docker compose up -d
	@sleep 5
	@echo "Running migrations..."
	docker compose exec backend python manage.py migrate
	@echo "Setting up demo data..."
	docker compose exec backend bash -c "cd /code && DJANGO_SETTINGS_MODULE=hive_project.settings python setup_demo.py"
	@echo ""
	@echo "Demo environment ready!"
	@echo ""
	@echo "Demo Accounts:"
	@echo "  Admin:   moderator@demo.com / demo123"
	@echo "  User 1:  elif@demo.com / demo123"
	@echo "  User 2:  cem@demo.com / demo123"
	@echo "  User 3:  marcus@demo.com / demo123"
	@echo ""
	@echo "Frontend: http://localhost:5173"
	@echo "Backend:  http://localhost:8000"

delete:
	@echo "Deleting development environment..."
	docker compose down -v

logs:
	docker compose logs -f

prod-build:
	@echo "Building production containers..."
	docker compose -f docker-compose.prod.yml build

prod-demo: prod-build
	@echo "Starting production environment..."
	docker compose -f docker-compose.prod.yml up -d
	@sleep 10
	@echo "Running migrations..."
	docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput
	@echo "Collecting static files..."
	docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
	@echo "Setting up demo data..."
	docker compose -f docker-compose.prod.yml exec backend python setup_demo.py
	@echo ""
	@echo "Production demo environment ready!"
	@echo ""
	@echo "Demo Accounts:"
	@echo "  Admin:   moderator@demo.com / demo123"
	@echo "  User 1:  elif@demo.com / demo123"
	@echo "  User 2:  cem@demo.com / demo123"
	@echo "  User 3:  marcus@demo.com / demo123"

prod-delete:
	@echo "Deleting production environment..."
	docker compose -f docker-compose.prod.yml down -v

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

db-backup:
	@mkdir -p backups
	@echo "Creating database backup..."
	docker compose exec -T db pg_dump -U postgres the_hive_db | gzip > backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "Backup created in backups/"

db-restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Error: Please specify a backup file"; \
		echo "Usage: make db-restore FILE=backups/backup_XXXXXXXX_XXXXXX.sql.gz"; \
		exit 1; \
	fi
	@echo "Restoring database from $(FILE)..."
	gunzip < $(FILE) | docker compose exec -T db psql -U postgres the_hive_db
	@echo "Database restored from $(FILE)"

migrate:
	docker compose exec backend python manage.py migrate

superuser:
	docker compose exec backend python manage.py createsuperuser

shell:
	docker compose exec backend python manage.py shell

lint:
	@echo "Checking backend..."
	docker compose exec backend python manage.py check

test: test-backend test-frontend

test-backend:
	@echo "Running backend tests..."
	docker compose exec -T backend python manage.py test api.tests -v 2

test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm run test:run

test-e2e:
	@echo "Running E2E tests..."
	@echo "Checking services..."
	@curl -sf http://localhost:5173 > /dev/null 2>&1 || (echo "Frontend not running. Run 'make demo' first" && exit 1)
	@curl -sf http://localhost:8000/api/health/ > /dev/null 2>&1 || (echo "Backend not running. Run 'make demo' first" && exit 1)
	@echo "Services ready"
	cd frontend && npm run test:e2e

test-all: test-backend test-frontend test-e2e
