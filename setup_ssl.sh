#!/bin/bash

# Configuration
NGINX_CONF_PATH="./spy-helmet-frontend/spy-helmet-frontend/nginx.conf"
DOMAIN="itssafe.site"
EMAIL="kmarayush27@gmail.com"

# Check for Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    echo "Error: Docker Compose not found. Please install Docker and Docker Compose."
    exit 1
fi

echo "--- 0. Cleaning up Port 80 conflicts ---"
# Stop any existing containers to free up ports
$COMPOSE -f docker-compose.prod.yaml down
# Kill any rogue system processes on port 80
sudo fuser -k 80/tcp || true

echo "--- 1. Resetting Nginx to HTTP-Only Mode ---"
cat > "$NGINX_CONF_PATH" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

echo "--- 2. Starting Services (HTTP) ---"
$COMPOSE -f docker-compose.prod.yaml up -d --build

echo "--- 3. Waiting for Nginx to launch... (10s) ---"
sleep 10

echo "--- 4. Requesting SSL Certificate ---"
# We run certbot in a temporary container that shares the /var/www/certbot volume with Nginx
$COMPOSE -f docker-compose.prod.yaml run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ --email "$EMAIL" -d "$DOMAIN" --agree-tos --no-eff-email --force-renewal

if [ $? -ne 0 ]; then
    echo "❌ Error: Certbot failed. Check DNS settings."
    exit 1
fi

echo "--- 5. Configuring Nginx for HTTPS ---"
cat > "$NGINX_CONF_PATH" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/nginx/ssl/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/$DOMAIN/privkey.pem;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

echo "--- 6. Reloading Nginx to Apply SSL ---"
$COMPOSE -f docker-compose.prod.yaml exec frontend nginx -s reload

echo "✅ SETUP COMPLETE! Visit https://$DOMAIN"
