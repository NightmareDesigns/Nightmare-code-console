# Nightmare Code Console — Qwen 2.5 3B offline bootstrap (Windows)
# This script installs Ollama (if missing), pulls qwen2.5-coder:3b,
# and writes a .env.local pointing the app to the local model.
# Run from the repo root (or next to the Windows EXE build).

param(
  [string]$EnvPath = ".env.local"
)

function Write-Status {
  param([string]$msg)
  Write-Host "[*] $msg"
}

function Write-ErrorLine {
  param([string]$msg)
  Write-Host "[!] $msg" -ForegroundColor Red
}

function Ensure-Ollama {
  Write-Status "Checking for Ollama..."
  $ollama = Get-Command ollama -ErrorAction SilentlyContinue
  if ($ollama) {
    Write-Status "Ollama found at $($ollama.Source)"
    return $true
  }
  Write-Status "Ollama not found — attempting install via winget"
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    Write-ErrorLine "winget is not available. Install Ollama manually from https://ollama.com/download"
    return $false
  }
  winget install Ollama.Ollama -h --accept-package-agreements --accept-source-agreements
  $ollama = Get-Command ollama -ErrorAction SilentlyContinue
  if (-not $ollama) {
    Write-ErrorLine "Ollama install did not succeed. Install manually, then rerun this script."
    return $false
  }
  Write-Status "Ollama installed."
  return $true
}

function Pull-Qwen {
  Write-Status "Pulling model qwen2.5-coder:3b (this may take a while)..."
  $pull = Start-Process -FilePath "ollama" -ArgumentList @("pull","qwen2.5-coder:3b") -NoNewWindow -Wait -PassThru
  if ($pull.ExitCode -ne 0) {
    Write-ErrorLine "ollama pull failed (exit $($pull.ExitCode)). Check your network and try again."
    return $false
  }
  Write-Status "Model qwen2.5-coder:3b is ready."
  return $true
}

function Write-EnvFile {
  param([string]$path)
  $content = @(
    "AI_PREFER_LOCAL=true"
    "AI_LOCAL_URL=http://127.0.0.1:11434/v1/chat/completions"
    "AI_LOCAL_MODEL=qwen2.5-coder:3b"
    "AI_MOCK_MODE=false"
    "AI_PROVIDER=local"
  )
  Write-Status "Writing $path ..."
  Set-Content -Path $path -Value ($content -join "`n") -Encoding UTF8
}

# Main
if (-not (Ensure-Ollama)) { exit 1 }
if (-not (Pull-Qwen)) { exit 1 }
Write-EnvFile -path $EnvPath
Write-Status "Done. Start Nightmare Code Console; it will use the local Qwen model."
