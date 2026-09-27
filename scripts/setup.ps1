$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
node "$PSScriptRoot/setup.mjs"
exit $LASTEXITCODE
