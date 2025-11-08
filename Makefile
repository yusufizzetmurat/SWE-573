.PHONY: start stop down build migrate demo test-backend test-frontend test-e2e shell

start:
	docker compose up --build -d

stop:
	docker compose stop

down:
	docker compose down -v

build:
	docker compose build

migrate:
	docker compose run --rm backend python manage.py migrate

demo:
	docker compose run --rm backend python manage.py shell < backend/setup_demo.py

test-backend:
	docker compose run --rm backend python manage.py test --verbosity=1 --keepdb

test-frontend:
	cd frontend && npm run test

test-e2e:
	cd frontend && npm run test:e2e

shell:
	docker compose run --rm backend python manage.py shell
