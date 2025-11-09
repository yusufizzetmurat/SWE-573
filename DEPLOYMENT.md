    # Deployment Guide - The Hive

    ## Pre-Deployment Checklist

    - [ ] Domain name configured and pointing to your server
    - [ ] SSL certificate ready (Let's Encrypt or commercial)
    - [ ] Server requirements: 2GB RAM minimum, 4GB recommended
    - [ ] Docker and Docker Compose installed on server
    - [ ] Firewall configured (ports 80, 443, 22)
    - [ ] Backup strategy in place

    ## Quick Deploy (Production)

    ### 1. Server Setup

    ```bash
    # Update system
    sudo apt update && sudo apt upgrade -y

    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER

    # Install Docker Compose
    sudo apt install docker-compose-plugin -y

    # Install Nginx
    sudo apt install nginx certbot python3-certbot-nginx -y
    ```

    ### 2. Application Setup

    ```bash
    # Clone repository
    git clone <your-repo-url> /var/www/the-hive
    cd /var/www/the-hive

    # Create environment file
    cp env.example .env
    nano .env
    ```

    #### Required Environment Variables

    ```env
    # Database
    DB_NAME=the_hive_db
    DB_USER=postgres
    DB_PASSWORD=<STRONG_PASSWORD_HERE>
    DB_HOST=db

    # Django
    SECRET_KEY=<GENERATE_SECRET_KEY>
    DEBUG=False
    ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
    CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

    # Frontend
    VITE_API_URL=https://yourdomain.com/api

    # Redis
    REDIS_HOST=redis
    REDIS_PORT=6379
    ```

    **Generate SECRET_KEY:**
    ```bash
    python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
    ```

    ### 3. Build and Deploy

    ```bash
    # Build and start services
    docker-compose -f docker-compose.prod.yml up -d --build

    # Wait for services to be healthy
    docker-compose -f docker-compose.prod.yml ps

    # Run migrations
    docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

    # Create superuser
    docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

    # Collect static files
    docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
    ```

    ### 4. Configure Nginx

    Create `/etc/nginx/sites-available/the-hive`:

    ```nginx
    upstream backend {
        server localhost:8000;
    }

    upstream frontend {
        server localhost:5173;
    }

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        client_max_body_size 10M;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS headers (if needed)
            add_header 'Access-Control-Allow-Origin' 'https://yourdomain.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        }

        # WebSocket
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket timeout
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
        }

        # Admin
        location /admin {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /static/ {
            alias /var/www/the-hive/staticfiles/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Media files
        location /media/ {
            alias /var/www/the-hive/media/;
            expires 30d;
            add_header Cache-Control "public";
        }
    }
    ```

    Enable the site:
    ```bash
    sudo ln -s /etc/nginx/sites-available/the-hive /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

    ### 5. SSL Certificate

    ```bash
    # Obtain SSL certificate
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

    # Verify auto-renewal
    sudo certbot renew --dry-run
    ```

    ### 6. Firewall Configuration

    ```bash
    # Allow necessary ports
    sudo ufw allow 22/tcp  # SSH
    sudo ufw allow 80/tcp  # HTTP
    sudo ufw allow 443/tcp # HTTPS
    sudo ufw enable
    ```

    ## Post-Deployment

    ### Verify Deployment

    ```bash
    # Check all services are running
    docker-compose -f docker-compose.prod.yml ps

    # Check health endpoints
    curl http://localhost:8000/api/health/
    curl http://localhost:5173

    # Check logs
    docker-compose -f docker-compose.prod.yml logs -f
    ```

    ### Initial Data

    ```bash
    # Load demo data (optional, for testing)
    docker-compose -f docker-compose.prod.yml exec backend python setup_demo.py
    ```

    ## Monitoring

    ### System Health

    ```bash
    # View resource usage
    docker stats

    # Check disk space
    df -h

    # View logs
    docker-compose -f docker-compose.prod.yml logs --tail=100 backend
    docker-compose -f docker-compose.prod.yml logs --tail=100 frontend
    ```

    ### Database Backup

    Create backup script `/usr/local/bin/backup-hive-db.sh`:

    ```bash
    #!/bin/bash
    BACKUP_DIR="/var/backups/the-hive"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    mkdir -p $BACKUP_DIR

    cd /var/www/the-hive
    docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres the_hive_db | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

    # Keep only last 7 days
    find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
    ```

    Make executable and add to crontab:
    ```bash
    sudo chmod +x /usr/local/bin/backup-hive-db.sh
    sudo crontab -e
    # Add: 0 2 * * * /usr/local/bin/backup-hive-db.sh
    ```

    ## Updates and Maintenance

    ### Application Updates

    ```bash
    cd /var/www/the-hive

    # Pull latest code
    git pull origin main

    # Rebuild and restart
    docker-compose -f docker-compose.prod.yml up -d --build

    # Run new migrations
    docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

    # Collect static files
    docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
    ```

    ### Database Restore

    ```bash
    # Stop services
    docker-compose -f docker-compose.prod.yml stop backend

    # Restore from backup
    gunzip < /var/backups/the-hive/backup_XXXXXXXX_XXXXXX.sql.gz | \
    docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres the_hive_db

    # Restart services
    docker-compose -f docker-compose.prod.yml start backend
    ```

    ## Troubleshooting

    ### Backend Not Starting

    ```bash
    # Check logs
    docker-compose -f docker-compose.prod.yml logs backend

    # Check database connection
    docker-compose -f docker-compose.prod.yml exec backend python manage.py check

    # Reset if needed
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
    ```

    ### WebSocket Connection Issues

    ```bash
    # Check Redis
    docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

    # Check Nginx WebSocket config
    sudo nginx -t

    # Check CORS and WebSocket headers in browser console
    ```

    ### Database Issues

    ```bash
    # Check database status
    docker-compose -f docker-compose.prod.yml exec db pg_isready

    # Check connections
    docker-compose -f docker-compose.prod.yml exec db psql -U postgres -c "SELECT * FROM pg_stat_activity;"

    # Reset connections
    docker-compose -f docker-compose.prod.yml restart db
    ```

    ## Performance Optimization

    ### Nginx Caching

    Add to Nginx config:
    ```nginx
    # Cache static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    ```

    ### Database Optimization

    ```bash
    # Analyze database
    docker-compose -f docker-compose.prod.yml exec db psql -U postgres the_hive_db -c "ANALYZE;"

    # Vacuum database
    docker-compose -f docker-compose.prod.yml exec db psql -U postgres the_hive_db -c "VACUUM ANALYZE;"
    ```

    ### Redis Optimization

    Edit `docker-compose.prod.yml`:
    ```yaml
    redis:
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ```

    ## Security Best Practices

    - ✅ Always use HTTPS in production
    - ✅ Keep SECRET_KEY secret and unique
    - ✅ Use strong database passwords
    - ✅ Regular security updates: `sudo apt update && sudo apt upgrade`
    - ✅ Monitor logs for suspicious activity
    - ✅ Use fail2ban for SSH protection
    - ✅ Limit database access to localhost only
    - ✅ Regular backups
    - ✅ Keep Docker images updated

    ## Support

    For issues during deployment:
    1. Check logs: `docker-compose logs -f`
    2. Verify environment variables in `.env`
    3. Ensure all services are healthy: `docker-compose ps`
    4. Check system resources: `docker stats`
    5. Review this guide's troubleshooting section

