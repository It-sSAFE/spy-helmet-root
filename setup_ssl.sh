#!/bin/bash

# Configuration
NGINX_CONF_PATH="./spy-helmet-frontend/spy-helmet-frontend/nginx.conf"

# 1. Determine Domain and Email
# Check command line arguments first
DOMAIN=$1
EMAIL=$2

# If not provided via args, try to load from .env
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    if [ -f .env ]; then
        # Export .env variables temporarily
        export $(grep -v '^#' .env | xargs)
        # Check if DOMAIN_NAME and CONTACT_EMAIL are set in .env
        [ -z "$DOMAIN" ] && DOMAIN=$DOMAIN_NAME
        [ -z "$EMAIL" ] && EMAIL=$CONTACT_EMAIL
    fi
fi

# If still not found, prompt the user
if [ -z "$DOMAIN" ]; then
    echo ""
    read -p "Enter your domain name (e.g., example.com): " DOMAIN
fi

if [ -z "$EMAIL" ]; then
    echo ""
    read -p "Enter your email for Let's Encrypt (e.g., user@example.com): " EMAIL
fi

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Error: Domain and Email are required."
    echo "Usage: ./setup_ssl.sh [domain] [email]"
    exit 1
fi

echo "----------------------------------------------------------------"
echo "Setting up SSL for:"
echo "  Domain: $DOMAIN"
echo "  Email:  $EMAIL"
echo "----------------------------------------------------------------"

# Check for Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE="docker compose"
else
    echo "Error: Docker Compose not found. Please install Docker and Docker Compose."
    exit 1
fi

echo ""
echo "--- 1. Configuring Nginx for HTTP Challenge ---"
# Write HTTP-only config
cat > "$NGINX_CONF_PATH" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Allow Certbot to validate the domain
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Serve the app via HTTP initially
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

echo "--- 2. Starting Services (Frontend, Backend, DB) ---"
$COMPOSE -f docker-compose.prod.yaml up -d --build

echo "--- 3. Waiting for services to initialize... ---"
sleep 10

echo "--- 4. Requesting SSL Certificate ---"
$COMPOSE -f docker-compose.prod.yaml run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ --email "$EMAIL" -d "$DOMAIN" --ssl-req -v --agree-tos --no-eff-email --force-renewal

if [ $? -ne 0 ]; then
    echo "Error: Certbot failed. Please check your domain DNS settings and ensure port 80 is open."
    echo "Logs:"
    $COMPOSE -f docker-compose.prod.yaml logs certbot
    exit 1
fi

echo "--- 5. Configuring Nginx for HTTPS ---"
# Write HTTPS config
cat > "$NGINX_CONF_PATH" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN;

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

echo ""
echo "--- SETUP COMPLETE ---"
echo "Your application should now be running securely at https://$DOMAIN"
