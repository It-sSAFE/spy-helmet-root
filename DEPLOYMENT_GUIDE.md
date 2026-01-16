# Deployment Guide: Spy Helmet Project

This guide explains how to deploy your **FastAPI Backend on Render** and your **React Frontend on Vercel**.

---

## 🚀 Phase 1: Database Setup (PostgreSQL)

Since you are deploying to the cloud, you need a cloud-hosted database.

1.  **Create a Database on Render**:
    *   Go to your [Render Dashboard](https://dashboard.render.com/).
    *   Click **New +** -> **PostgreSQL**.
    *   Name it `helmet-db`.
    *   Select the **Free Plan**.
    *   Once created, copy the **Internal DB URL** (for connecting other Render services) and **External DB URL** (for connecting from your local machine if needed).

---

## 🛠️ Phase 2: Deploy Backend (Render)

1.  **Push Code to GitHub**:
    *   Ensure your project is in a GitHub repository.
    *   Make sure `requirement.txt` contains `tensorflow-cpu` (we already fixed this).

2.  **Create Web Service**:
    *   On Render, click **New +** -> **Web Service**.
    *   Connect your GitHub repo.
    *   **Root Directory**: `spy-helmet-backend/spy-helmet-backend` (Important! This is where your Dockerfile is).
    *   **Runtime**: Select **Docker**.

3.  **Environment Variables**:
    *   Add the following variables in the Render settings:
        *   `DATABASE_URL`: *(Paste the Internal DB URL from Phase 1)*
        *   `CUDA_VISIBLE_DEVICES`: `-1`
        *   `TF_CPP_MIN_LOG_LEVEL`: `3`
        *   `TF_ENABLE_ONEDNN_OPTS`: `0`

4.  **Deploy**:
    *   Click **Create Web Service**.
    *   Render will build the Docker image and start the server. This may take 5-10 minutes.
    *   A URL will be generated (e.g., `https://spy-helmet-backend.onrender.com`). **Copy this URL.**

---

## 🎨 Phase 3: Deploy Frontend (Vercel)

1.  **Import to Vercel**:
    *   Go to [Vercel Dashboard](https://vercel.com/dashboard).
    *   Click **Add New...** -> **Project**.
    *   Import the same GitHub repository.

2.  **Configure Project**:
    *   **Framework Preset**: Vite.
    *   **Root Directory**: Click "Edit" and select `spy-helmet-frontend/spy-helmet-frontend`.

3.  **Environment Variables**:
    *   Expand the **Environment Variables** section.
    *   Add:
        *   **Name**: `VITE_API_BASE_URL`
        *   **Value**: *(Paste your Render Backend URL from Phase 2, e.g., `https://spy-helmet-backend.onrender.com`)*. **IMPORTANT**: Do not add a trailing slash `/`.

4.  **Deploy**:
    *   Click **Deploy**.
    *   Vercel will build your site and give you a public URL (e.g., `https://spy-helmet.vercel.app`).

---

## ✅ Phase 4: Final Connection Check

1.  Open your **Vercel URL**.
2.  Try to **Login** or **Register**.
3.  The frontend will send requests to your Render backend.
4.  The backend will check the Render PostgreSQL database.
5.  If successful, you will be redirected to the dashboard.

### 🐛 Troubleshooting

*   **Backend Startup Fails?** Check Render logs. If it says "Out of Memory", you might need to upgrade to a paid tier or ensure `tensorflow` is strictly `tensorflow-cpu`.
*   **Cors Errors?** Use the `view_file` tool to check `main.py`. We allowed `allow_origins=["*"]`, so it should work fine.
