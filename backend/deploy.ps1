# ==============================================================================
# SLAYCOUNT BACKEND DEPLOYMENT SCRIPT (POWERSHELL)
# ==============================================================================
# Skrip ini mengotomatiskan proses build Docker via Cloud Build dan mendeploy ke
# Google Cloud Run di sistem Windows.
#
# PENTING: Script ini menggunakan ROOT Dockerfile yang build frontend + backend
# dalam satu container. Jangan jalankan dari folder backend/ langsung.

$PROJECT_ID = "accountomation"
$SERVICE_NAME = "slaycount"
$REGION = "asia-southeast2"
$IMAGE_NAME = "gcr.io/accountomation/slaycount:latest"
$INSTANCE_CONNECTION = "accountomation:asia-southeast1:accountomation-instance"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "[LAUNCH] Memulai Deployment SlayCount Backend ke Cloud Run..." -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# Autodetect portable Google Cloud SDK
$GCLOUD_BIN = "gcloud"
$PORTABLE_GCLOUD = Join-Path $PSScriptRoot ".gcloud-sdk\google-cloud-sdk\bin\gcloud.cmd"
$PORTABLE_PYTHON = Join-Path $PSScriptRoot ".gcloud-sdk\google-cloud-sdk\platform\bundledpython\python.exe"

if (Test-Path $PORTABLE_GCLOUD) {
    Write-Host "[INFO] Menggunakan SDK Google Cloud Portabel yang ditemukan di: $PORTABLE_GCLOUD" -ForegroundColor Cyan
    $GCLOUD_BIN = $PORTABLE_GCLOUD
    if (Test-Path $PORTABLE_PYTHON) {
        $Env:CLOUDSDK_PYTHON = $PORTABLE_PYTHON
    }
} else {
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Error "[ERROR] Google Cloud SDK tidak ditemukan secara global maupun portabel."
        Write-Error "Harap jalankan skrip instalasi terlebih dahulu: powershell -ExecutionPolicy Bypass -File .\backend\install_gcloud.ps1"
        exit 1
    }
}

# 0. Set Active Account to user's personal Google Account to prevent PERMISSION_DENIED
Write-Host "[AUTH] Melakukan vibe check pada akun autentikasi..." -ForegroundColor Yellow
$accounts = & $GCLOUD_BIN config list account --format="value(core.account)"
if ($accounts -like "*firebase-adminsdk*") {
    Write-Host "[AUTH] Mendeteksi Service Account terbatas. Mencoba berganti ke akun personal..." -ForegroundColor Cyan
    & $GCLOUD_BIN config set account marchelihsandy213@gmail.com
}

# 1. Konfigurasi Proyek GCP
Write-Host "[SETUP] Mengatur proyek active GCP ke: $PROJECT_ID..." -ForegroundColor Yellow
& $GCLOUD_BIN config set project $PROJECT_ID

# 2. Build Container Image via Google Cloud Build
# KRITIS: Build dari ROOT project directory menggunakan root Dockerfile
# Root Dockerfile: build frontend Vite dulu -> copy dist ke backend -> satu image
$ROOT_DIR = (Get-Item (Join-Path $PSScriptRoot "..")).FullName
Write-Host "[BUILD] Build dari ROOT: $ROOT_DIR (menggunakan root Dockerfile)" -ForegroundColor Yellow
Write-Host "[BUILD] Tag image: $IMAGE_NAME" -ForegroundColor Yellow
& $GCLOUD_BIN builds submit --tag $IMAGE_NAME $ROOT_DIR

if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERROR] Gagal membangun image di Cloud Build. Harap periksa error di atas."
    exit 1
}

Write-Host "[SUCCESS] Image berhasil di-build dan disimpan di: $IMAGE_NAME" -ForegroundColor Green

# 3. Ekstrak Environment Variables dari file .env lokal (Kecuali PORT yang merupakan reserved env di Cloud Run)
$ENV_VARS = ""
$BackendEnvPath = Join-Path $PSScriptRoot ".env"
if (Test-Path $BackendEnvPath) {
    Write-Host "[ENV] Membaca konfigurasi environment dari file .env di: $BackendEnvPath..." -ForegroundColor Yellow
    $lines = Get-Content $BackendEnvPath | Where-Object { $_ -notmatch '^#' -and $_ -match '=' -and $_ -notmatch '^PORT=' }
    $ENV_VARS = ($lines -join ",")
}

# 4. Deploy ke Google Cloud Run
Write-Host "[DEPLOY] Mendeploy container image ke Google Cloud Run..." -ForegroundColor Yellow
Write-Host "[SQL] Menyambungkan secara aman ke Cloud SQL Instance: $INSTANCE_CONNECTION..." -ForegroundColor Yellow

& $GCLOUD_BIN run deploy $SERVICE_NAME `
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
    Write-Host "[SUCCESS] SlayCount Backend telah aktif di Cloud Run!" -ForegroundColor Green
    Write-Host "=======================================================" -ForegroundColor Green
} else {
    Write-Error "[ERROR] Deployment ke Cloud Run gagal."
    exit 1
}
