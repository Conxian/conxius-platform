#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Scans the production boundary for forbidden patterns: [STUB] markers,
    localhost URLs, simulated Operational status, .stub.json references, and
    verifier/settlement success-contamination classes.
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

$VERIFIER_RULES = @(
    @{ Id = "unconditional-verifier-success"; Pattern = '\b(?:verified|isVerified)\s*[:=]\s*true\b' }
    @{ Id = "proof-length-predicate"; Pattern = '\b(?:proof|rawProof)\s*\.length\s*(?:===|!==|>=|<=|>|<)' }
    @{ Id = "production-simulator-construction"; Pattern = '\b(?:class\s+Default\w*(?:Verifier|Monitor|Releaser|Backend)|new\s+Default\w*(?:Verifier|Monitor|Releaser|Backend)|new\s+\w*(?:Simulator|Simulation|Fixture|Mock|Fake|Dummy)\w*\s*\(|\b(?:const|let|var)\s+\w*(?:Verifier|Monitor|Releaser|Backend)\w*\s*=\s*(?:new\s+)?(?:Default\w*(?:Verifier|Monitor|Releaser|Backend)|\w*(?:Simulator|Simulation|Fixture|Mock|Fake|Dummy)\w*)|\b(?:const|let|var)\s+Default\w*(?:Verifier|Monitor|Releaser|Backend)\w*\s*=\s*\w+)' }
    @{ Id = "production-fixture-import"; Pattern = '(?:from\s*|import\s*)["''][^"'']*(?:src/tests|tests/fixtures)[^"'']*["'']' }
    @{ Id = "synthetic-decryption-key"; Pattern = '(?:key-\$\{|(?:decryptionKey|decryption_key)\s*[:=]\s*[`"''](?:key-|synthetic|fake|dummy))' }
    @{ Id = "production-bridge-construction"; Pattern = 'new\s+BitVMBridge\s*\((?!\s*new\s+UnavailableBitVMVerifier\s*\(\s*\)\s*\))' }
    @{ Id = "production-bridge-construction"; Pattern = 'new\s+BitVM3Orchestrator\s*\((?!\s*new\s+UnavailableBitVM3Verifier\s*\(\s*\)\s*\))' }
    @{ Id = "production-bridge-construction"; Pattern = 'new\s+ZKCPBridge\s*\((?!\s*new\s+UnavailableZKVerifier\s*\(\s*\)\s*,\s*new\s+UnavailableOnChainMonitor\s*\(\s*\)\s*,\s*new\s+UnavailableDecryptionKeyReleaser\s*\(\s*\)\s*,?\s*\))' }
)

$SETTLEMENT_RULES = @(
    @{ Id = "settlement-success-default"; Pattern = '\b(?:success\s*:\s*true|status\s*:\s*["''](?:idle|success|ok)["''])' }
)

function ScanFile([string]$relPath) {
    $absPath = Join-Path $REPO_ROOT $relPath
    $findings = @()

    try {
        $content = Get-Content $absPath -Raw -Encoding UTF8 -ErrorAction Stop
    } catch {
        return $findings
    }

    $rules = @($RULES)
    if ($relPath -match '^services/admin-dashboard/src/lib/support/(bitvm|bitvm3|zkcp)\.ts$') {
        $rules += $VERIFIER_RULES
    }
    if ($relPath -match '^services/admin-dashboard/src/app/api/v1/settlement-engine/route\.ts$') {
        $rules += $SETTLEMENT_RULES
    }

    foreach ($rule in $rules) {
        $matches = [regex]::Matches($content, $rule.Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        foreach ($match in $matches) {
            $lineNum = ($content.Substring(0, $match.Index) -split "`n").Count
            $snippet = [regex]::Replace($match.Value.Trim(), '\s+', ' ')
            if ($snippet.Length -gt 200) { $snippet = $snippet.Substring(0, 200) }
            $findings += [PSCustomObject]@{
                Path = $relPath
                Rule = $rule.Id
                Line = $lineNum
                Snippet = $snippet
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
