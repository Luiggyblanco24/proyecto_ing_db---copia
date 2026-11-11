param(
  [string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('sutens-chatbot-pg-' + [guid]::NewGuid().ToString('N'))
$dataDirectory = Join-Path $testRoot 'data'
$logFile = Join-Path $testRoot 'postgres.log'
$pgCtl = Join-Path $PostgresBin 'pg_ctl.exe'
$initDb = Join-Path $PostgresBin 'initdb.exe'
$previousTestUrl = $env:CHATBOT_TEST_ADMIN_URL
$serverStarted = $false
$safeToRemove = $false
$exitCode = 0

try {
  foreach ($binary in @($pgCtl, $initDb)) {
    if (-not (Test-Path -LiteralPath $binary)) {
      throw "No se encontró el ejecutable requerido: $binary"
    }
  }

  New-Item -ItemType Directory -Path $testRoot | Out-Null
  & $initDb -D $dataDirectory -U sutens_test --auth-local=trust --auth-host=trust --encoding=UTF8 --no-locale
  if ($LASTEXITCODE -ne 0) {
    throw "initdb terminó con código $LASTEXITCODE"
  }

  $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  $port = $listener.LocalEndpoint.Port
  $listener.Stop()

  & $pgCtl -D $dataDirectory -l $logFile -o "-h 127.0.0.1 -p $port" -w start
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo iniciar el clúster PostgreSQL temporal (código $LASTEXITCODE)"
  }
  $serverStarted = $true

  $env:CHATBOT_TEST_ADMIN_URL = "postgresql://sutens_test@127.0.0.1:$port/postgres"
  Set-Location $repoRoot
  & node --test tests/chatbot-reports.integration.test.js
  $exitCode = $LASTEXITCODE
} catch {
  Write-Error $_
  $exitCode = 1
} finally {
  if ($serverStarted) {
    & $pgCtl -D $dataDirectory -m fast -w stop
    if ($LASTEXITCODE -eq 0) {
      $safeToRemove = $true
    } else {
      Write-Warning "No se pudo detener limpiamente el clúster temporal: $testRoot"
      if ($exitCode -eq 0) { $exitCode = 1 }
    }
  } else {
    $safeToRemove = $true
  }

  if ($null -eq $previousTestUrl) {
    Remove-Item Env:\CHATBOT_TEST_ADMIN_URL -ErrorAction SilentlyContinue
  } else {
    $env:CHATBOT_TEST_ADMIN_URL = $previousTestUrl
  }

  if ($safeToRemove -and (Test-Path -LiteralPath $testRoot)) {
    Remove-Item -LiteralPath $testRoot -Recurse -Force
  }
}

if ($exitCode -ne 0) {
  exit $exitCode
}
