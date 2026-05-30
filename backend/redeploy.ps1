$GCLOUD_BIN = "C:\Users\march\OneDrive\Desktop\Slay count\backend\.gcloud-sdk\google-cloud-sdk\bin\gcloud.cmd"
$BackendEnvPath = "C:\Users\march\OneDrive\Desktop\Slay count\backend\.env"
$lines = Get-Content $BackendEnvPath | Where-Object { $_ -notmatch '^#' -and $_ -match '=' -and $_ -notmatch '^PORT=' }
$ENV_VARS = ($lines -join ",")

Write-Host "[DEPLOY] Mendeploy image terbaru ke Cloud Run..." -ForegroundColor Cyan
& $GCLOUD_BIN run deploy slaycount `
    --image gcr.io/accountomation/slaycount:latest `
    --platform managed `
    --region asia-southeast2 `
    --allow-unauthenticated `
    --add-cloudsql-instances accountomation:asia-southeast1:accountomation-instance `
    --set-env-vars $ENV_VARS `
    --timeout=300 `
    --memory=512Mi

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Cloud Run updated!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Deploy gagal, exit code: $LASTEXITCODE" -ForegroundColor Red
}
