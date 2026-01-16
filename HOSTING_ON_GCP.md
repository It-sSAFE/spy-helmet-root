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
git clone https://github.com/It-sSAFE/spy-helmet-root.git
cd spy_helmet_root
```

### 2. Configure Environment Variables
Create the production `.env` file.
```bash
nano .env
```
Paste your production configuration:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=helmetDB
```
Save: `Ctrl+O`, `Enter`, `Ctrl+X`.

### 3. Build and Run Containerized App
We have prepared a production-ready compose file (`docker-compose.prod.yaml`) that:
1.  Builds the React Frontend into static files.
2.  Sets up an Nginx container to serve the site and proxy API requests.
3.  Starts the Backend and Database.

Run this command:
```bash
docker compose -f docker-compose.prod.yaml up -d --build
```
*This might take 5-10 minutes initially as it compiles the frontend and installs dependencies.*

---

## 🔒 Step 6: Verify Deployment

Your application should now be accessible on Port 80.

1.  Open your browser and visit: `http://YOUR_VM_EXTERNAL_IP`
2.  You should see the React Login/Dashboard page.
3.  The frontend is automatically configured to talk to the backend via `/api`.

**Troubleshooting:**
*   **Logs**: Check logs with `docker compose -f docker-compose.prod.yaml logs -f`.
*   **Database**: Ensure the `postgres_data` volume is created (it handles persistence automatically).
*   **Firewall**: Ensure your GCP Firewall allows TCP traffic on port **80**. If you can't access it, check "VPC Network > Firewall" and allow "http-server" tag or port 80 manually.

---

## 💡 Pro Tips for GCP

*   **Static IP**: By default, your VM's IP might change if you restart it. Go to **VPC Network** > **IP addresses** and click **Reserve external static IP address** to keep it permanent.
*   **Costs**: Don't forget to **Stop** the instance when you are not using it to save money! (Select VM -> Stop).
