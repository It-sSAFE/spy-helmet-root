# 🚀 Hosting Guide: Docker Compose on VPS

This guide explains how to host your entire stack (Frontend, Backend, Database) on a single Linux VPS (Virtual Private Server) using Docker Compose. This ensures your production environment matches your local development environment exactly.

## ✅ Prerequisites

1.  **A Cloud VPS**:
    *   **Providers**: DigitalOcean (Droplet), AWS (EC2), Hetzner, Vultr, or Linode.
    *   **OS**: Ubuntu 22.04 LTS (Recommended).
    *   **Specs**: Minimum 2 CPUs, 4GB RAM (since you are running TensorFlow and 3 containers).
2.  **Domain Name** (Optional but recommended): e.g., `spy-helmet.com`.

---

## 🛠️ Step 1: Server Setup

Connect to your server via SSH:
```bash
ssh root@your_server_ip
```

### 1. Install Docker & Docker Compose
Run the following commands to install the latest Docker engine:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 📦 Step 2: Deploy Code

### 1. Clone Your Repository
Navigate to the home directory and clone your code (replace URL with your repo):

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/spy_helmet_root.git
cd spy_helmet_root
```

### 2. Configure Environment Variables
Create the `.env` file for production:

```bash
nano .env
```

Paste the following (Change passwords for security!):
```env
# Database Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strong_production_password
POSTGRES_DB=helmetDB

# Backend Settings
DATABASE_URL=postgresql://postgres:strong_production_password@db:5432/helmetDB
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

### 3. Update Frontend Production URL
By default, your frontend tries to connect to `localhost`. For production, it must know your domain or IP.
Open the `docker-compose.yaml` and add an environment variable for the frontend **build** arg, or simpler: modify the code slightly before building.

**Easier Method (Runtime Env)**:
Since you are serving the frontend via Vite Preview in Docker, just create a `.env` file inside the frontend directory:

```bash
nano spy-helmet-frontend/spy-helmet-frontend/.env
```

Add:
```env
VITE_API_BASE_URL=http://your_server_ip:8000
# OR if you have a domain
# VITE_API_BASE_URL=https://api.yourdomain.com
```

---

## 🚀 Step 3: Launch Application

Run the application in detached mode:

```bash
sudo docker compose up -d --build
```

### Check Status
```bash
sudo docker compose ps
```
You should see 3 services (`backend`, `frontend`, `db`) with status `Up`.

---

## 🌐 Step 4: Access Your App

*   **Frontend**: `http://your_server_ip:5173`
*   **Backend API**: `http://your_server_ip:8000`

---

## 🔒 Advanced: Production Polishing (Recommended)

Running on port `:5173` and `:8000` is fine for testing, but for a real product, you want standard HTTP (80) or HTTPS (443).

### Using Nginx as a Reverse Proxy
1.  **Install Nginx**: `sudo apt install nginx -y`
2.  **Create Config**: `sudo nano /etc/nginx/sites-available/spyhelmet`

```nginx
server {
    listen 80;
    server_name your_domain.com;  # OR your_server_ip

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Backend API
    location /api/ {
        rewrite ^/api/(.*) /$1 break; # Strips /api prefix
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
    
    # Or map specific endpoints if you don't want /api prefix logic
    location /auth { proxy_pass http://localhost:8000; }
    location /predict { proxy_pass http://localhost:8000; }
    location /live_predict { proxy_pass http://localhost:8000; }
    location /submit_reading { proxy_pass http://localhost:8000; }
}
```
3.  **Enable & Restart**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/spyhelmet /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default
    sudo systemctl restart nginx
    ```

Now you can access via `http://your_server_ip/`!
