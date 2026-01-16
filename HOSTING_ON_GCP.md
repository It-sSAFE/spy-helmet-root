# ☁️ Hosting on Google Cloud Platform (GCP)

This guide explains how to host your Spy Helmet project on Google Cloud using a **Compute Engine VM**. This approach mirrors the "VPS" setup but uses GCP's infrastructure, giving you full control over the environment.

## ✅ Prerequisites

1.  A **Google Cloud Platform Account**. [Sign up here](https://console.cloud.google.com/).
2.  A new **GCP Project** created in the console.

---

## 🛠️ Step 1: Create a Virtual Machine (VM)

1.  Go to the **Compute Engine** > **VM instances** page in the GCP Console.
2.  Click **Create Instance**.
3.  **Name**: `spy-helmet-server` (or similar).
4.  **Region**: Choose a region close to your users (e.g., `us-central1` or `asia-south1`).
5.  **Machine Configuration**:
    *   **Series**: `E2`
    *   **Machine type**: `e2-medium` (2 vCPU, 4 GB memory) recommended. The build process (especially for backend/TensorFlow) requires RAM.
6.  **Boot Disk**:
    *   Click "Change".
    *   **OS**: `Ubuntu`
    *   **Version**: `Ubuntu 22.04 LTS` (x86/64).
    *   **Size**: Increase to `20 GB` (Standard persistent disk) to accommodate Docker images.
7.  **Firewall**:
    *   ✅ Allow HTTP traffic.
    *   ✅ Allow HTTPS traffic.
8.  Click **Create**.

---

## 🌐 Step 2: Configure Firewall Rules

By default, GCP blocks ports like 8000 (Backend) and 5173 (Frontend). You need to open them, or use Nginx (recommended).

### Option A: Open Ports (Quickest)
1.  Go to **VPC network** > **Firewall**.
2.  Click **Create Firewall Rule**.
3.  **Name**: `allow-app-ports`.
4.  **Targets**: `All instances in the network`.
5.  **Source IPv4 ranges**: `0.0.0.0/0` (Allow from anywhere).
6.  **Protocols and ports**:
    *   Check `tcp` and enter: `8000, 5173`.
7.  Click **Create**.

### Option B: Use Nginx (Production)
*We will configure this in Step 4 to serve everything on port 80 (HTTP).*

---

## 🔑 Step 3: Connect to the Server

1.  In the VM Instances list, locate your new VM.
2.  Click the **SSH** button in the "Connect" column. A terminal window will open in your browser.

---

## 🏗️ Step 4: Install Dependencies

Execute the following commands in the SSH terminal to install Docker and Git.

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Add current user to docker group (avoids using sudo for every docker command)
sudo usermod -aG docker $USER

# 4. Apply group changes (you might need to close and reopen SSH after this, or run:)
newgrp docker
```

---

## 📦 Step 5: Deploy the Code

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/spy_helmet_root.git
cd spy_helmet_root
```
*Note: If it's a private repo, you will need to use a Personal Access Token (PAT) or set up SSH keys.*

### 2. Configure Environment Variables
Create the production `.env` file.
```bash
nano .env
```
Paste your production configuration (change passwords!):
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_gcp_password
POSTGRES_DB=helmetDB
DATABASE_URL=postgresql://postgres:secure_gcp_password@db:5432/helmetDB
```
Save: `Ctrl+O`, `Enter`, `Ctrl+X`.

### 3. Update Frontend API URL
Because we are building the image, the frontend needs to know where the backend lives.
Create the frontend-specific env file:
```bash
nano spy-helmet-frontend/spy-helmet-frontend/.env
```
Add:
```env
# If using Firewall Option A (Direct Ports):
VITE_API_BASE_URL=http://YOUR_VM_EXTERNAL_IP:8000

# If using Firewall Option B (Nginx/Port 80):
# VITE_API_BASE_URL=http://YOUR_VM_EXTERNAL_IP/api
```
*(Get `YOUR_VM_EXTERNAL_IP` from the GCP Console VM list).*

### 4. Build and Run
```bash
docker compose up -d --build
```
*This might take up to 5-10 minutes depending on the machine size.*

---

## 🔒 Step 6: Set up Nginx (Recommended)

Instead of asking users to type `:5173` or `:8000`, use Nginx to serve everything on standard port 80.

1.  **Install Nginx**:
    ```bash
    sudo apt install nginx -y
    ```

2.  **Create Configuration**:
    ```bash
    sudo nano /etc/nginx/sites-available/spyhelmet
    ```

3.  **Paste Configuration**:
    Replace `your_server_ip` with your actual External IP.
    ```nginx
    server {
        listen 80;
        server_name your_server_ip;

        # Frontend
        location / {
            proxy_pass http://localhost:5173;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
        }

        # Backend
        location /api/ {
            rewrite ^/api/(.*) /$1 break;
            proxy_pass http://localhost:8000;
            proxy_set_header Host $host;
        }
        
        # Direct Endpoint Mapping (Optional fallback)
        location /live_predict {
            proxy_pass http://localhost:8000;
        }
    }
    ```

4.  **Activate**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/spyhelmet /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default
    sudo systemctl restart nginx
    ```

Now check `http://YOUR_VM_EXTERNAL_IP` in your browser!

---

## 💡 Pro Tips for GCP

*   **Static IP**: By default, your VM's IP might change if you restart it. Go to **VPC Network** > **IP addresses** and click **Reserve external static IP address** to keep it permanent.
*   **Costs**: Don't forget to **Stop** the instance when you are not using it to save money! (Select VM -> Stop).
