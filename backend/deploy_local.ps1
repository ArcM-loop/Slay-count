# ==============================================================================
# LOCAL DEPLOYMENT SCRIPT USING PORTABLE GOOGLE CLOUD SDK
# ==============================================================================

# Relative path to portable gcloud executable (installed by install_gcloud.ps1)
$gcloud = Join-Path $PSScriptRoot ".gcloud-sdk\google-cloud-sdk\bin\gcloud.cmd"

# Ensure CLOUDSDK_PYTHON is set correctly for portable execution
$ExtractPath = Join-Path $PSScriptRoot ".gcloud-sdk"
$BundledPython = Join-Path $ExtractPath "google-cloud-sdk\platform\bundledpython\python.exe"
$SystemPython = "C:\Users\march\AppData\Local\Programs\Python\Python314\python.exe"
if (Test-Path $BundledPython) {
    $Env:CLOUDSDK_PYTHON = $BundledPython
} elseif (Test-Path $SystemPython) {
    $Env:CLOUDSDK_PYTHON = $SystemPython
}

# Load environment variables from the .env file (backend/.env)
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "[ERROR] .env file not found at $envFile. Aborting deployment."
    exit 1
}

# Parse key=value pairs, ignore comments and empty lines, skip reserved vars like PORT
$envVars = @()
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $kv = $line -split "=", 2
    if ($kv.Length -eq 2) {
        $key = $kv[0].Trim()
        $val = $kv[1].Trim()
        if ($key -ne "PORT") {
            $envVars += "$key=$val"
        }
    }
}
$envVarsString = $envVars -join ","

# Configuration values (must match .env definitions)
$PROJECT_ID = "accountomation"
$SERVICE_NAME = "slaycount-backend"
$REGION = "asia-southeast1"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/${SERVICE_NAME}:latest"
$INSTANCE_CONNECTION = "accountomation:asia-southeast1:accountomation-instance"

# ------------------------------------------------------------
# 1. Authenticate using the service account JSON provided in the repo
# ------------------------------------------------------------
# $svcKeyPath = Join-Path $PSScriptRoot "service-account.json"
# if (-not (Test-Path $svcKeyPath)) {
#     Write-Error "[ERROR] Service account key not found at $svcKeyPath. Aborting."
#     exit 1
# }
# Write-Host "[AUTH] Activating service account..." -ForegroundColor Cyan
# & $gcloud auth activate-service-account --key-file=`"$svcKeyPath`"

# Set the active project
Write-Host "[CONFIG] Setting active project to $PROJECT_ID..." -ForegroundColor Cyan
& $gcloud config set project $PROJECT_ID

# ------------------------------------------------------------
# 2. Build Docker image using Cloud Build (server‑side)
# ------------------------------------------------------------
Write-Host "[BUILD] Submitting Cloud Build to build image $IMAGE_NAME..." -ForegroundColor Cyan
& $gcloud builds submit --tag $IMAGE_NAME .

# ------------------------------------------------------------
# 3. Deploy to Cloud Run, attaching Cloud SQL instance and env vars
# ------------------------------------------------------------
Write-Host "[DEPLOY] Deploying to Cloud Run (service $SERVICE_NAME)..." -ForegroundColor Cyan
& $gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --add-cloudsql-instances $INSTANCE_CONNECTION `
    --set-env-vars $envVarsString `
    --timeout=300 `
    --memory=512Mi

Write-Host "[DONE] Deployment script completed." -ForegroundColor Green
