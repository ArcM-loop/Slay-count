#!/bin/bash

# ==============================================================================
# SLAYCOUNT BACKEND DEPLOYMENT SCRIPT (BASH/CLOUD SHELL)
# ==============================================================================
# Skrip ini mengotomatiskan proses build Docker via Cloud Build dan mendeploy ke
# Google Cloud Run dengan koneksi terintegrasi ke Google Cloud SQL.

# 1. Konfigurasi Awal
PROJECT_ID="accountomation" # ID Proyek Google Cloud Anda
SERVICE_NAME="slaycount"
REGION="asia-southeast2" # Sesuai dengan region Cloud SQL Anda
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"
INSTANCE_CONNECTION="accountomation:asia-southeast1:accountomation-instance"

echo "======================================================="
echo "🚀 Memulai Deployment SlayCount Backend ke Cloud Run..."
echo "======================================================="

# Pastikan gcloud terhubung ke project yang benar
echo "🎯 Mengatur proyek active GCP ke: $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# 2. Build Container Image via Google Cloud Build (Serverless Build)
echo "📦 Melakukan build image di Cloud Build & menyimpannya ke Artifact Registry..."
gcloud builds submit --tag $IMAGE_NAME .

if [ $? -ne 0 ]; then
    echo "❌ Gagal membangun image di Cloud Build. Harap periksa error di atas."
    exit 1
fi

echo "✅ Image berhasil di-build dan disimpan di: $IMAGE_NAME"

# 3. Ekstrak Environment Variables dari file .env lokal (jika ada)
ENV_VARS=""
if [ -f .env ]; then
    echo "📄 Membaca konfigurasi environment dari file .env..."
    # Membaca .env, mengabaikan komentar, baris kosong, dan mengonversi format ke KEY=VALUE
    ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | tr '\n' ',' | sed 's/,$//')
fi

# 4. Deploy ke Google Cloud Run
echo "⚡ Mendeploy container image ke Google Cloud Run..."
echo "🔗 Menyambungkan secara aman ke Cloud SQL Instance: $INSTANCE_CONNECTION..."

gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --add-cloudsql-instances $INSTANCE_CONNECTION \
    --set-env-vars "$ENV_VARS" \
    --timeout=300 \
    --memory=512Mi

if [ $? -eq 0 ]; then
    echo "======================================================="
    echo "🎉 SUCCESS: SlayCount Backend telah aktif di Cloud Run!"
    echo "======================================================="
else
    echo "❌ Deployment ke Cloud Run gagal."
    exit 1
fi
