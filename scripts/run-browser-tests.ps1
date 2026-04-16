$ErrorActionPreference = 'Stop'

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$edgeProfileDir = Join-Path $repoRoot '.tmp_edge_profile'
$edgeCandidates = @(
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$edgePath = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $edgePath) {
  throw 'Microsoft Edge wurde fuer den Browser-Testlauf nicht gefunden.'
}

if (-not (Test-Path $edgeProfileDir)) {
  New-Item -ItemType Directory -Path $edgeProfileDir | Out-Null
}

$testUrl = 'file:///' + ((Resolve-Path (Join-Path $repoRoot 'tests\browser\test-runner.html')).Path -replace '\\', '/')
$output = & $edgePath `
  --headless `
  --disable-gpu `
  --no-first-run `
  --no-default-browser-check `
  --allow-file-access-from-files `
  --user-data-dir="$edgeProfileDir" `
  --virtual-time-budget=10000 `
  --dump-dom `
  $testUrl 2>&1

$outputText = ($output | Out-String)
$outputText

if ($outputText -notmatch 'data-status="pass"') {
  exit 1
}
