#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verifies the BOS production boundary: docs/PRODUCTION_BOUNDARY.md exists,
    no .stub.json files tracked, no dev-only services wired in docker-compose.yml.
#>

$ErrorActionPreference = "Stop"

$REPO_ROOT = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

function Main {
    $failures = @()

    $boundaryDoc = Join-Path $REPO_ROOT "docs" "PRODUCTION_BOUNDARY.md"
    if (-not (Test-Path $boundaryDoc)) {
        $failures += "Missing docs/PRODUCTION_BOUNDARY.md"
    } else {
        Write-Host "  [OK] docs/PRODUCTION_BOUNDARY.md exists"
    }

    $trackedFiles = git -C $REPO_ROOT ls-files -z 2>$null | ForEach-Object { $_ -split "`0" }

    $stubFiles = $trackedFiles | Where-Object { $_ -like "*.stub.json" }
    if ($stubFiles) {
        $failures += "Found .stub.json files tracked (allowed only in conxian-business):`n$($stubFiles -join "`n")"
    } else {
        Write-Host "  [OK] No .stub.json files tracked"
    }

    $composePath = Join-Path $REPO_ROOT "docker-compose.yml"
    if (-not (Test-Path $composePath)) {
        $failures += "Missing docker-compose.yml"
    } else {
        $composeContent = Get-Content $composePath -Raw -ErrorAction Stop
        if ($composeContent -match "admin-pulse-bos") {
            $failures += "services/admin-pulse-bos is dev-only and must not be wired into docker-compose.yml"
        } else {
            Write-Host "  [OK] No dev-only services wired in docker-compose.yml"
        }
    }

    if ($failures.Count -gt 0) {
        Write-Host "BOS production boundary verification failed:" -ForegroundColor Red
        $failures | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
        exit 1
    }

    Write-Host "BOS production boundary verification passed" -ForegroundColor Green
    exit 0
}

Main
