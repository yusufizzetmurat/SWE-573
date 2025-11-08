# The Hive

The Hive is a small timebank marketplace where community members trade hours instead of money. This repo contains:

- **backend/** – Django REST API with PostgreSQL and Redis support.
- **frontend/** – React + Vite single-page app.
- Docker compose files for local dev and production.

## Quickstart

```bash
# start everything
make start

# run backend tests
make test-backend

# run frontend unit tests
make test-frontend

# run Playwright end-to-end tests
make test-e2e
```

By default the frontend runs on `http://localhost:5173` and the API on `http://localhost:8000/api`.

## Deploy

Use `docker-compose.prod.yml` with environment variables set in `.env` (populate from `env.example`). The production compose file builds the frontend, runs the Django API with Daphne, and adds Redis and Postgres services.

--

