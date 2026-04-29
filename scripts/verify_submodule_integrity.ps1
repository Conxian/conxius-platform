#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verifies that all Git submodule gitlinks have matching .gitmodules entries
    and that no .gitmodules entry lacks a corresponding gitlink.
#>

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    try {
        $root = git rev-parse --show-toplevel 2>$null
        if (-not $root) { throw "not in a git repo" }
        return (Resolve-Path $root).Path
    } catch {
        Write-Error "verify_submodule_integrity.ps1 requires Git and must be run from within a Git working tree."
        exit 1
    }
}

function Get-GitlinkPaths {
    param([string]$RepoRoot)
    $out = git -C $RepoRoot ls-files -s -z
    $gitlinks = @()
    $out -split "`0" | ForEach-Object {
        if ($_ -match "^160000\s+[a-f0-9]+\s+\d+\t(.+)$") {
            $gitlinks += $matches[1]
        }
    }
    return $gitlinks
}

function Get-GitmodulesMappings {
    param([string]$RepoRoot)
    $gitmodulesPath = Join-Path $RepoRoot ".gitmodules"
    if (-not (Test-Path $gitmodulesPath)) { return @() }

    $result = git -C $RepoRoot config --file ".gitmodules" --get-regexp "^submodule\..*\.(path|url)$" 2>$null
    if (-not $result) { return @() }

    $byName = @{}
    foreach ($line in $result) {
        if ($line -match "^submodule\.(?<name>.+?)\.(?<field>path|url)\s+(?<value>.+)$") {
            $name = $matches['name']
            $field = $matches['field']
            $value = $matches['value'].Trim()
            if (-not $byName.ContainsKey($name)) { $byName[$name] = @{} }
            $byName[$name][$field] = $value
        }
    }

    $mappings = @()
    foreach ($name in $byName.Keys) {
        $path = $byName[$name]['path']
        $url = $byName[$name]['url']
        if ($path) {
            $mappings += [PSCustomObject]@{ Name = $name; Path = $path; Url = $url }
        }
    }
    return $mappings
}

function Main {
    $repoRoot = Get-RepoRoot
    $gitlinks = Get-GitlinkPaths -RepoRoot $repoRoot
    $mappings = Get-GitmodulesMappings -RepoRoot $repoRoot
    $mappedPaths = $mappings | ForEach-Object { $_.Path }

    $failures = @()

    $mappings | Where-Object { -not $_.Url } | ForEach-Object {
        $failures += "Missing url for submodule: $($_.Path)"
    }

    $mappings | Group-Object Path | Where-Object { $_.Count -gt 1 } | ForEach-Object {
        $failures += "Duplicate .gitmodules path: $($_.Name)"
    }

    $gitlinks | Where-Object { $_ -notin $mappedPaths } | ForEach-Object {
        $failures += "Missing .gitmodules mapping for gitlink: $_"
    }

    $mappedPaths | Where-Object { $_ -notin $gitlinks } | ForEach-Object {
        $failures += "Found .gitmodules mapping that is not a gitlink: $_"
    }

    if ($failures.Count -gt 0) {
        Write-Host "Submodule integrity verification failed:" -ForegroundColor Red
        $failures | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
        exit 1
    }

    Write-Host "Submodule integrity verification passed" -ForegroundColor Green
    Write-Host "  Gitlinks: $($gitlinks -join ', ')"
    Write-Host "  .gitmodules mappings: $($mappedPaths -join ', ')"
    exit 0
}

Main
