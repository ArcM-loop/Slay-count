# ==============================================================================
# PORTABLE GOOGLE CLOUD SDK INSTALLATION & INITIALIZATION (ASCII ONLY)
# ==============================================================================

$Url = "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-windows-x86_64.zip"
$ZipPath = Join-Path $PSScriptRoot "gcloud-sdk.zip"
$ExtractPath = Join-Path $PSScriptRoot ".gcloud-sdk"
$GcloudCmd = Join-Path $ExtractPath "google-cloud-sdk\bin\gcloud.cmd"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Downloading and extracting portable Google Cloud SDK..." -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

if (-not (Test-Path $GcloudCmd)) {
    if (-not (Test-Path $ExtractPath)) { New-Item -ItemType Directory -Path $ExtractPath -Force | Out-Null }
    if (-not (Test-Path $ZipPath)) {
        Write-Host "Downloading Google Cloud SDK ZIP (~150MB)..." -ForegroundColor Yellow
        try { Start-BitsTransfer -Source $Url -Destination $ZipPath -ErrorAction Stop } catch { Invoke-WebRequest -Uri $Url -OutFile $ZipPath }
    }
    Write-Host "Extracting ZIP to .gcloud-sdk (this may take a minute)..." -ForegroundColor Yellow
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force
    Remove-Item $ZipPath -Force
    Write-Host "Extraction complete!" -ForegroundColor Green
}
else {
    Write-Host "Google Cloud SDK already present." -ForegroundColor Green
}

# -------------------------------------------------------
# Ensure a working Python interpreter for the SDK
# -------------------------------------------------------
# Prefer bundled Python if available, otherwise fallback to system Python
$BundledPython = Join-Path $ExtractPath "google-cloud-sdk\platform\bundledpython\python.exe"
$SystemPython = "C:\Users\march\AppData\Local\Programs\Python\Python314\python.exe"
if (Test-Path $BundledPython) {
    $Env:CLOUDSDK_PYTHON = $BundledPython
    Write-Host "Using bundled Python for gcloud: $BundledPython" -ForegroundColor Cyan
} elseif (Test-Path $SystemPython) {
    $Env:CLOUDSDK_PYTHON = $SystemPython
    Write-Host "Using system Python for gcloud: $SystemPython" -ForegroundColor Cyan
} else {
    Write-Error "No suitable Python interpreter found. Install Python 3.10‑3.14 and retry."
    exit 1
}

# Install required Python packages (e.g., six) into the selected interpreter
Write-Host "Installing missing Python dependencies (six)..." -ForegroundColor Yellow
& $Env:CLOUDSDK_PYTHON -m pip install --quiet --upgrade pip setuptools wheel > $null 2>&1
& $Env:CLOUDSDK_PYTHON -m pip install --quiet six > $null 2>&1

# Verify gcloud works
if (Test-Path $GcloudCmd) {
    Write-Host "Verifying gcloud installation..." -ForegroundColor Yellow
    & $GcloudCmd --version
    Write-Host "Google Cloud SDK ready for use!" -ForegroundColor Green
} else {
    Write-Error "gcloud.cmd not found after extraction."
    exit 1
}
