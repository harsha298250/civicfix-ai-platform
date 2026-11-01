# ==============================================================================
# CivicFix AI Platform -- Clean Project Export Packaging Utility
# Creates an export zip of the codebase including hidden configuration folders
# (.git, .github, backend/.mvn) while strictly excluding transient artifacts:
# .env, backend/uploads, node_modules, dist, backend/target, and any *.zip files.
# ==============================================================================

[CmdletBinding()]
param(
    [string]$OutputFile = "civicfix_ai_platform.zip",
    [string]$SourceDir = "."
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$resolvedSource = (Resolve-Path $SourceDir).Path
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $resolvedSource $OutputFile))

Write-Host "=========================================================="
Write-Host "CivicFix AI Platform -- Clean Export Packaging Utility"
Write-Host "Source directory : $resolvedSource"
Write-Host "Target archive   : $resolvedOutput"
Write-Host "=========================================================="

# 1. Audit and print top-level items
$topLevelItems = Get-ChildItem -Path $resolvedSource -Force
$includedTopLevel = [System.Collections.Generic.List[string]]::new()
$excludedTopLevel = [System.Collections.Generic.List[string]]::new()

foreach ($item in $topLevelItems) {
    $name = $item.Name
    if ($name -eq "node_modules" -or $name -eq "dist" -or $name -eq ".env" -or $name.EndsWith(".zip", [System.StringComparison]::OrdinalIgnoreCase)) {
        $excludedTopLevel.Add($name)
    } else {
        $includedTopLevel.Add($name)
    }
}

Write-Host ""
Write-Host "[+] Included Top-Level Items:"
foreach ($item in ($includedTopLevel | Sort-Object)) {
    Write-Host "    + $item"
}

Write-Host ""
Write-Host "[-] Excluded Top-Level Items:"
foreach ($item in ($excludedTopLevel | Sort-Object)) {
    Write-Host "    - $item"
}

Write-Host ""
Write-Host "[-] Nested Path Exclusions:"
Write-Host "    - backend/target"
Write-Host "    - backend/uploads"
Write-Host "    - *.zip (any recursive zip archive)"
Write-Host "    - .env* (except .env.example)"

# 2. Package the zip archive using .NET ZipArchive
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $resolvedOutput) {
    Remove-Item -Path $resolvedOutput -Force
}

$zip = [System.IO.Compression.ZipFile]::Open($resolvedOutput, [System.IO.Compression.ZipArchiveMode]::Create)
$allFiles = Get-ChildItem -Path $resolvedSource -Recurse -Force -File
$packagedCount = 0

try {
    foreach ($file in $allFiles) {
        $fullPath = $file.FullName
        if ($fullPath -eq $resolvedOutput) { continue }

        $relPath = $fullPath.Substring($resolvedSource.Length).TrimStart('\', '/').Replace('\', '/')

        # Exclusion rules
        if ($relPath -eq ".env" -or ($relPath.StartsWith(".env.") -and $relPath -ne ".env.example")) { continue }
        if ($relPath.EndsWith(".zip", [System.StringComparison]::OrdinalIgnoreCase)) { continue }
        if ($relPath.StartsWith("node_modules/") -or $relPath -eq "node_modules") { continue }
        if ($relPath.StartsWith("dist/") -or $relPath -eq "dist") { continue }
        if ($relPath.StartsWith("backend/target/") -or $relPath.StartsWith("target/")) { continue }
        if ($relPath.StartsWith("backend/uploads/") -or $relPath.StartsWith("uploads/")) { continue }

        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $relPath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        $packagedCount++
    }
} finally {
    $zip.Dispose()
}

$zipSizeMb = (Get-Item $resolvedOutput).Length / 1MB
Write-Host ""
Write-Host "=========================================================="
Write-Host "Export completed successfully!"
Write-Host "Total files packaged : $packagedCount"
Write-Host ("Archive file size   : {0:N2} MB" -f $zipSizeMb)
Write-Host "Target archive path  : $resolvedOutput"
Write-Host "=========================================================="
