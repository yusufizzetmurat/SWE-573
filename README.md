# The Hive - TimeBank Community Platform

A community-driven TimeBank platform where people exchange services using time as currency. Built with Django, React, and Django Channels for real-time communication.

## Features

- **TimeBank System**: Exchange services using hours as currency
- **Service Marketplace**: Post and discover services (Offers & Wants)
- **Real-time Chat**: WebSocket-powered messaging for service coordination
- **Reputation System**: Build trust through peer reviews
- **Handshake Workflow**: Structured service delivery process
- **Location-based Search**: Find services near you with interactive maps
- **Badge System**: Earn achievements for community participation

## Tech Stack

### Backend
- **Django 4.2** - Web framework
- **Django REST Framework** - API
- **Django Channels** - WebSocket support
- **PostgreSQL 15** - Database
- **Redis 7** - Caching & WebSocket layer
- **Daphne** - ASGI server

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Radix UI** - Component primitives
- **Leaflet** - Interactive maps
- **Axios** - HTTP client

## Quick Start (Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd the-hive
```

### 2. Configure Environment

```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# (Optional) Load demo data
docker-compose exec backend python setup_demo.py
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Admin Panel**: http://localhost:8000/admin
- **API Documentation**: http://localhost:8000/api/docs

## Production Deployment

### 1. Environment Configuration

Create a `.env` file with production values:

```bash
# Database
DB_NAME=the_hive_db
DB_USER=postgres
DB_PASSWORD=<strong-password>

# Django
SECRET_KEY=<generate-secret-key>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Frontend
VITE_API_URL=https://yourdomain.com/api
```

Generate SECRET_KEY:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 2. Deploy with Docker Compose

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Create superuser
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### 3. Configure Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files
    location /static {
        alias /path/to/staticfiles;
    }
}
```

### 4. SSL with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   React     │─────>│    Django    │─────>│  PostgreSQL  │
│   Frontend  │      │   (Daphne)   │      │   Database   │
│   (Vite)    │<─────│   Backend    │<─────│              │
└─────────────┘      └──────────────┘      └──────────────┘
      │                     │
      │                     │
      │              ┌──────────────┐
      └─────────────>│    Redis     │
        WebSocket    │   (Cache &   │
                     │   Channels)  │
                     └──────────────┘
```

## Key Workflows

### Service Exchange Flow
1. **Discover**: Browse or search for services
2. **Express Interest**: Start a conversation
3. **Negotiate**: Chat to agree on details
4. **Initiate**: Provider sets exact time, location, duration
5. **Approve**: Receiver confirms and TimeBank is escrowed
6. **Complete**: Both parties confirm service delivery
7. **Review**: Receiver rates provider

### TimeBank Rules
- **Offer Posts**: Receiver (interest expresser) pays provider (post owner)
- **Want Posts**: Receiver (post owner) pays provider (interest expresser)
- Initial balance: 5 hours
- Payment is escrowed on handshake approval
- Transferred on mutual confirmation

## Database Management

### Backup
```bash
docker-compose exec db pg_dump -U postgres the_hive_db > backup.sql
```

### Restore
```bash
docker-compose exec -T db psql -U postgres the_hive_db < backup.sql
```

### Migrations
```bash
# Create migrations
docker-compose exec backend python manage.py makemigrations

# Apply migrations
docker-compose exec backend python manage.py migrate

# Rollback
docker-compose exec backend python manage.py migrate app_name migration_name
```

## Monitoring

### Health Checks
- Backend: `http://localhost:8000/api/health/`
- Database: `docker-compose exec db pg_isready`
- Redis: `docker-compose exec redis redis-cli ping`

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
docker-compose logs -f redis
```

### Performance Metrics
```bash
# Container stats
docker stats

# Django debug toolbar (development only)
# Available in browser when DEBUG=True
```

## Troubleshooting

### Database Connection Issues
```bash
# Check database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Reset database
docker-compose down -v
docker-compose up -d
```

### WebSocket Connection Issues
```bash
# Check Redis is running
docker-compose exec redis redis-cli ping

# Check channels layer
docker-compose exec backend python manage.py shell
>>> from channels.layers import get_channel_layer
>>> channel_layer = get_channel_layer()
>>> channel_layer
```

### Frontend Build Issues
```bash
# Clear node modules
rm -rf frontend/node_modules
docker-compose build frontend --no-cache
docker-compose up -d frontend
```

## Security Considerations

- ✅ HTTPS required in production
- ✅ Strong SECRET_KEY (50+ random characters)
- ✅ Secure database password
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ Input validation and sanitization
- ✅ SQL injection protection (Django ORM)
- ✅ XSS protection (React escaping)
- ✅ CSRF tokens
- ✅ Secure headers

## License

MIT License - See LICENSE file for details

## Support

For issues and feature requests, please create an issue in the repository.
