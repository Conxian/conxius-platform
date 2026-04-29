#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Scans the production boundary for forbidden patterns: [STUB] markers,
    localhost URLs, simulated Operational status, and .stub.json references.
#>

$ErrorActionPreference = "Stop"

$REPO_ROOT = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

function IsScannedProdBoundaryFile([string]$path) {
    if ($path -match "^services/admin-dashboard/src/tests/") { return $false }
    if ($path -match "^services/admin-dashboard/") {
        return ($path -match '\.(ts|tsx|js|jsx)$')
    }
    if ($path -eq "scripts/provision-secrets.sh") { return $true }
    return $false
}

$RULES = @(
    @{ Id = "stub-marker"; Pattern = '\[STUB\]' }
    @{ Id = "localhost-url"; Pattern = 'http://localhost' }
    @{ Id = "localhost-ip"; Pattern = '127\.0\.0\.1' }
    @{ Id = "simulated-operational-status"; Pattern = 'status\s*[:=]\s*"Operational"' }
    @{ Id = "stub-json-reference"; Pattern = '\.stub\.json' }
)

function ScanFile([string]$relPath) {
    $absPath = Join-Path $REPO_ROOT $relPath
    $findings = @()

    try {
        $lines = Get-Content $absPath -Encoding UTF8 -ErrorAction Stop
    } catch {
        return $findings
    }

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $lineNum = $i + 1
        foreach ($rule in $RULES) {
            if ($line -match $rule.Pattern) {
                $snippet = $line.Trim()
                if ($snippet.Length -gt 200) { $snippet = $snippet.Substring(0, 200) }
                $findings += [PSCustomObject]@{
                    Path = $relPath
                    Rule = $rule.Id
                    Line = $lineNum
                    Snippet = $snippet
                }
            }
        }
    }
    return $findings
}

function Main {
    $trackedFiles = git -C $REPO_ROOT ls-files -z 2>$null | ForEach-Object { $_ -split "`0" } | Where-Object { $_ -ne "" }
    $scannedFiles = $trackedFiles | Where-Object { IsScannedProdBoundaryFile $_ }

    $allFindings = @()
    foreach ($f in $scannedFiles) {
        $allFindings += ScanFile $f
    }

    if ($allFindings.Count -gt 0) {
        Write-Host "Contamination guard failed (production boundary contains forbidden patterns):" -ForegroundColor Red
        foreach ($finding in $allFindings) {
            Write-Host "- $($finding.Path):$($finding.Line) [$($finding.Rule)] $($finding.Snippet)" -ForegroundColor Red
        }
        exit 1
    }

    Write-Host "Contamination guard passed" -ForegroundColor Green
    Write-Host "Scanned $($scannedFiles.Count) files in production boundary"
    exit 0
}

Main
