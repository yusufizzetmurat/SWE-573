# The Hive

A community TimeBank platform where people exchange services using time as currency. Everyone starts with 5 hours and can earn more by helping others.

## What is this?

Think of it as a bartering system for the modern age. Need someone to help you learn Spanish? Offer to teach them guitar in return. Want to learn photography? Help someone with 3D printing. Every hour of service is worth one TimeBank hour, regardless of what the service is.

Built this with Django for the backend (with WebSockets for real-time chat), React for the frontend, and PostgreSQL for data. It's fully containerized so you can run it anywhere.

## Features

- **TimeBank System** - Hours are your currency. Spend them on services you need, earn them by helping others
- **Service Posts** - Post what you can offer or what you need help with
- **Real-time Chat** - Message people directly through WebSockets
- **Handshake Flow** - Structured process for agreeing on service details and confirming completion
- **Reputation System** - Service receivers rate providers after completion
- **Map View** - See services near you on an interactive map
- **Badges** - Earn achievements for being active in the community

## Getting Started

You'll need Docker installed. That's it.

### Quick demo setup

```bash
git clone <your-repo-url>
cd the-hive
make demo
```

This will build everything, start all services, run migrations, and create demo users. Takes about 2 minutes on first run.

**Demo accounts:**
- Admin: `admin@thehive.local` / `admin123`
- User 1: `elif@demo.com` / `demo123`
- User 2: `cem@demo.com` / `demo123`  
- User 3: `marcus@demo.com` / `demo123`

Open http://localhost:5173 and you're good to go.

### Other useful commands

```bash
make logs          # Watch what's happening
make delete        # Clean up everything when you're done
make migrate       # Run database migrations
make superuser     # Create your own admin account
make shell         # Open Django shell
make db-backup     # Backup your database
```

Run `make help` to see all available commands.

## Environment Configuration

The demo works out of the box, but if you want to customize things, copy `env.example` to `.env` and adjust the values:

```bash
cp env.example .env
```

Key settings you might want to change:
- Database credentials
- Secret key (generate with: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- Allowed hosts
- CORS origins

## How it works

### Service Exchange

1. Someone posts a service (either an "Offer" - something they can do, or a "Want" - something they need)
2. Another person expresses interest, which opens a chat
3. They discuss details in the chat
4. The provider initiates the handshake with exact location, time, and duration
5. The receiver approves and the TimeBank hours get escrowed (locked)
6. They meet and complete the service
7. Both confirm completion
8. Hours transfer and receiver can leave a review

### TimeBank Rules

The system automatically figures out who's the provider and receiver based on post type:

- **Offer posts**: Post owner is the provider, person who expressed interest is the receiver
- **Want posts**: Post owner is the receiver, person who expressed interest is the provider

The receiver always pays the provider. Hours are escrowed when the handshake is approved, transferred when both parties confirm completion.

## Production Deployment

### Build and deploy

```bash
make prod-build    # Build production containers
make prod-demo     # Start production with demo data
```

For production, you MUST set up a proper `.env` file:

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

### Nginx setup

You'll want a reverse proxy in front of this. Here's a basic nginx config:

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

Then get SSL with Let's Encrypt:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Production commands

```bash
make prod-logs     # View production logs
make prod-delete   # Clean up production environment
make db-backup     # Backup database before making changes
make db-restore FILE=backups/backup_20250109_143022.sql.gz  # Restore from backup
```

## Tech Stack

**Backend:**
- Django 4.2 + Django REST Framework
- Django Channels (WebSockets)
- PostgreSQL 15
- Redis 7
- Daphne ASGI server

**Frontend:**
- React 18 with TypeScript
- Vite for builds
- TailwindCSS for styling
- Radix UI components
- Leaflet for maps
- Axios for API calls

Everything runs in Docker containers so it's consistent across different environments.

## Architecture

```
React Frontend (Vite) <---> Django Backend (Daphne) <---> PostgreSQL
                                    |
                                    v
                                  Redis
                        (WebSocket + Cache)
```

Pretty straightforward. React talks to Django REST API for most things, WebSocket for real-time chat. Redis handles WebSocket routing and caching. PostgreSQL stores everything.

## Common Issues

**Can't connect to database?**
```bash
make delete
make demo
```

**Frontend won't load?**
Check if port 5173 is already in use. If so, change it in `docker-compose.yml`.

**WebSocket chat not working?**
Make sure Redis is running: `docker-compose exec redis redis-cli ping`

**Need to reset everything?**
```bash
make delete  # Nukes everything including database
make demo    # Fresh start
```

## Security Notes

For production:
- Use HTTPS (required for WebSockets to work properly)
- Generate a strong SECRET_KEY (50+ random characters)
- Use a secure database password
- Keep DEBUG=False
- Configure CORS properly (don't use * in production)
- Keep your dependencies updated

The app has CSRF protection, input validation, rate limiting, and uses Django ORM so SQL injection isn't a concern. React handles XSS protection automatically.