# The Hive

A community-oriented service exchange platform developed as a course project for SWE573 Software Development Practice at Bogazici University.

## Overview

This is a web application that enables non-commercial service exchange within a community using a TimeBank system. The platform uses time as the unit of exchange - one hour of any service equals one TimeBank hour. Users can post services they offer or request services they need, negotiate details through real-time chat, and complete exchanges that transfer TimeBank hours between accounts.

The application is built with Django (backend), React with TypeScript (frontend), PostgreSQL (database), and Redis (real-time features). All components are containerized with Docker for consistent deployment across environments.

## Core Features

- **TimeBank Economy** - Transaction system where users exchange services using time credits (1 hour = 1 TimeBank hour)
- **Service Management** - Users can create service offers and service requests with details like duration, location type, and semantic tags
- **Real-time Communication** - WebSocket-based chat system for service negotiation between users
- **Service Handshake Protocol** - Structured workflow for service agreement, time provisioning (escrow), and completion confirmation
- **Reputation System** - Post-service feedback mechanism with categorical ratings (Punctual, Helpful, Kind)
- **Interactive Map** - Geographic visualization of available services using Leaflet
- **Wikidata Integration** - Semantic tagging system integrated with Wikidata API for service categorization
- **Admin Panel** - Moderation interface for handling reports and managing community content

## Getting Started

### Prerequisites

- Docker (20.10 or higher)
- Docker Compose (v2 recommended)

### Local Development Setup

Clone the repository and run the demo setup:

```bash
git clone https://github.com/yusufizzetmurat/SWE-573.git
cd SWE-573
make demo
```

This command will:
1. Build Docker containers for all services
2. Start PostgreSQL, Redis, backend, and frontend
3. Run database migrations
4. Create demo user accounts and sample services

The process takes approximately 2-3 minutes on first run.

**Demo accounts (all passwords: `demo123`):**
- `elif@demo.com` - Elif Yılmaz (5 TimeBank hours)
- `marcus@demo.com` - Marcus Weber (3 TimeBank hours)
- `cem@demo.com` - Cem Demir (2 TimeBank hours)
- `ayse@demo.com` - Ayşe Kaya (4 TimeBank hours)

Access the application at: http://localhost:5173

### Development Commands

```bash
make build         # Build containers without demo data
make logs          # View real-time logs from all services
make delete        # Stop and remove all containers and volumes
make migrate       # Run Django database migrations
make superuser     # Create an admin account interactively
make shell         # Open Django management shell
make db-backup     # Create timestamped database backup
```

Run `make help` for complete list of available commands.

### Using Docker Compose Directly

If you prefer not to use Make commands:

```bash
# Build containers
docker compose build

# Start all services
docker compose up -d

# Run migrations
docker compose exec backend python manage.py migrate

# Create demo data
docker compose exec backend bash -c "cd /code && DJANGO_SETTINGS_MODULE=hive_project.settings python setup_demo.py"

# View logs
docker compose logs -f

# Stop services
docker compose down

# Complete cleanup (removes volumes)
docker compose down -v
```

## Environment Configuration

The application uses environment variables for configuration. Default values work for local development, but can be customized by creating a `.env` file:

```bash
cp env.example .env
```

Key configuration variables:
- `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL credentials
- `SECRET_KEY` - Django secret key (generate with: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- `DEBUG` - Debug mode (True for development, False for production)
- `ALLOWED_HOSTS` - Comma-separated list of allowed hostnames
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `VITE_API_URL` - API endpoint URL for frontend

## System Workflow

### Service Exchange Process

1. A user creates a service post (type: "Offer" or "Want") with details including duration, location, and semantic tags
2. Another user expresses interest, initiating a WebSocket chat session
3. Users negotiate details (exact time, location specifics) through real-time chat
4. The service provider initiates a handshake request with finalized details
5. The receiver approves the handshake, triggering TimeBank hour provisioning (escrow)
6. Users complete the service in real life
7. Both parties confirm completion in the system
8. TimeBank hours transfer from receiver to provider, and the receiver can optionally leave categorical feedback

### TimeBank Logic

The system determines provider and receiver roles based on post type:

- **Offer posts**: Post creator = Provider, interested party = Receiver
- **Want posts**: Post creator = Receiver, interested party = Provider

Hours flow from Receiver to Provider. The provisioning (escrow) occurs at handshake approval, and the transfer executes after mutual confirmation of service completion.

## Production Deployment

### Production Build

```bash
make prod-build    # Build production-optimized containers
make prod-demo     # Start production environment with demo data
```

Production deployment requires a properly configured `.env` file:

```env
# Database
DB_NAME=the_hive_db
DB_USER=postgres
DB_PASSWORD=<use-a-strong-password>

# Django
SECRET_KEY=<generate-this>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Frontend
VITE_API_URL=https://yourdomain.com/api
```

### Reverse Proxy Configuration

A reverse proxy (Nginx) is required for production to handle SSL termination and request routing. Basic configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

SSL certificate setup with Let's Encrypt:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Production Commands

```bash
make prod-logs     # View production logs
make prod-delete   # Clean up production environment
make db-backup     # Backup database before making changes
make db-restore FILE=backups/backup_20250109_143022.sql.gz  # Restore from backup
```

### Alternative: Production with Docker Compose

```bash
# Build production containers
docker compose -f docker-compose.prod.yml build

# Start production services
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Collect static files
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Create demo data (optional)
docker compose -f docker-compose.prod.yml exec backend bash -c "cd /code && DJANGO_SETTINGS_MODULE=hive_project.settings python setup_demo.py"

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop and cleanup
docker compose -f docker-compose.prod.yml down -v
```

## Tech Stack

**Backend:**
- Django 5.2.8 with Django REST Framework 3.15.2
- Django Channels 4.2.0 (ASGI/WebSocket support)
- PostgreSQL 15
- Redis 7 (channel layer and caching)
- Daphne ASGI server

**Frontend:**
- React 18.3.1 with TypeScript 5.5.3
- Vite 5.4.2 (build tool)
- TailwindCSS 3.4.1
- Radix UI component library
- Leaflet 1.9.4 (interactive maps)
- Axios 1.7.2 (HTTP client)

**Infrastructure:**
- Docker with multi-stage builds
- Docker Compose for orchestration
- Nginx (production reverse proxy)

All services are containerized for deployment consistency across different environments.

## Architecture

```
React Frontend (Vite) <---> Django Backend (Daphne) <---> PostgreSQL
                                    |
                                    v
                                  Redis
                        (WebSocket + Cache)
```

The frontend communicates with the backend through:
- REST API (Django REST Framework) for standard CRUD operations
- WebSocket connections (Django Channels) for real-time chat
- Redis serves as the channel layer for WebSocket message routing and provides caching
- PostgreSQL stores all persistent data (users, services, transactions, messages)

## Troubleshooting

**Database connection errors:**
```bash
make delete    # Remove all containers and volumes
make demo      # Rebuild and restart with fresh data
```

**Frontend not accessible:**
Verify port 5173 is not in use by another application. Modify the port mapping in `docker-compose.yml` if needed.

**WebSocket chat not functioning:**
Check Redis service status:
```bash
docker compose exec redis redis-cli ping
```
Expected response: `PONG`

**Complete reset:**
```bash
make delete    # Stop and remove all containers, networks, and volumes
make demo      # Clean rebuild with demo data
```

## Security Considerations

Production deployment checklist:
- HTTPS is mandatory (required for secure WebSocket connections)
- Generate a cryptographically strong SECRET_KEY (minimum 50 characters)
- Use secure database credentials
- Set DEBUG=False
- Configure CORS_ALLOWED_ORIGINS with specific domains (avoid wildcard *)
- Regularly update dependencies to patch security vulnerabilities

Built-in security features:
- CSRF protection via Django middleware
- SQL injection prevention through Django ORM
- XSS protection via React's automatic escaping
- Input validation on all API endpoints
- Rate limiting on authentication endpoints
- JWT-based authentication with refresh token rotation
