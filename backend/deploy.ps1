# ==============================================================================
# SLAYCOUNT BACKEND DEPLOYMENT SCRIPT (POWERSHELL)
# ==============================================================================
# Skrip ini mengotomatiskan proses build Docker via Cloud Build dan mendeploy ke
# Google Cloud Run di sistem Windows.

$PROJECT_ID = "accountomation"
$SERVICE_NAME = "slaycount-backend"
$REGION = "asia-southeast1"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"
$INSTANCE_CONNECTION = "accountomation:asia-southeast1:accountomation-instance"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "🚀 Memulai Deployment SlayCount Backend ke Cloud Run..." -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Konfigurasi Proyek GCP
Write-Host "🎯 Mengatur proyek active GCP ke: $PROJECT_ID..." -ForegroundColor Yellow
& gcloud config set project $PROJECT_ID

# 2. Build Container Image via Google Cloud Build
Write-Host "📦 Melakukan build image di Cloud Build..." -ForegroundColor Yellow
& gcloud builds submit --tag $IMAGE_NAME .

if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Gagal membangun image di Cloud Build. Harap periksa error di atas."
    exit 1
}

Write-Host "✅ Image berhasil di-build dan disimpan di: $IMAGE_NAME" -ForegroundColor Green

# 3. Ekstrak Environment Variables dari file .env lokal
$ENV_VARS = ""
if (Test-Path .env) {
    Write-Host "📄 Membaca konfigurasi environment dari file .env..." -ForegroundColor Yellow
    $lines = Get-Content .env | Where-Object { $_ -notmatch '^#' -and $_ -match '=' }
    $ENV_VARS = ($lines -join ",")
}

# 4. Deploy ke Google Cloud Run
Write-Host "⚡ Mendeploy container image ke Google Cloud Run..." -ForegroundColor Yellow
Write-Host "🔗 Menyambungkan secara aman ke Cloud SQL Instance: $INSTANCE_CONNECTION..." -ForegroundColor Yellow

& gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --add-cloudsql-instances $INSTANCE_CONNECTION `
    --set-env-vars $ENV_VARS `
    --timeout=300 `
    --memory=512Mi

if ($LASTEXITCODE -eq 0) {
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host "🎉 SUCCESS: SlayCount Backend telah aktif di Cloud Run!" -ForegroundColor Green
    Write-Host "=======================================================" -ForegroundColor Green
} else {
    Write-Error "❌ Deployment ke Cloud Run gagal."
    exit 1
}
