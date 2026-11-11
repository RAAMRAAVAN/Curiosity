$ErrorActionPreference = "Stop"

function Read-EnvFile {
    param([string]$Path)

    $values = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $values
    }

    foreach ($rawLine in Get-Content -LiteralPath $Path) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith("#")) {
            continue
        }

        $separator = $line.IndexOf("=")
        if ($separator -lt 1) {
            continue
        }

        $key = $line.Substring(0, $separator).Trim()
        $value = $line.Substring($separator + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $values[$key] = $value
    }

    return $values
}

function Get-DatabaseUrl {
    param([string]$ProjectRoot)

    $settings = @{}
    foreach ($fileName in @(".env", ".env.local")) {
        $fileSettings = Read-EnvFile (Join-Path $ProjectRoot $fileName)
        foreach ($key in $fileSettings.Keys) {
            $settings[$key] = $fileSettings[$key]
        }
    }
    foreach ($item in Get-ChildItem Env:) {
        $settings[$item.Name] = $item.Value
    }

    $databaseUrl = $settings["DATABASE_URL"]
    if (-not $databaseUrl) {
        $mode = $settings["DB_MODE"]
        if (-not $mode) {
            $mode = "local"
        }
        $mode = $mode.ToLowerInvariant()

        if ($mode -eq "neon") {
            $databaseUrl = $settings["NEON_DATABASE_URL"]
            if (-not $databaseUrl) {
                $databaseUrl = $settings["LOCAL_DATABASE_URL"]
            }
        } elseif ($mode -eq "local") {
            $databaseUrl = $settings["LOCAL_DATABASE_URL"]
            if (-not $databaseUrl) {
                $databaseUrl = $settings["NEON_DATABASE_URL"]
            }
        } else {
            throw "Unsupported DB_MODE '$mode'. Use 'local' or 'neon'."
        }
    }

    if (-not $databaseUrl) {
        throw "No database URL is configured. Set DATABASE_URL or configure DB_MODE and its corresponding URL in .env.local."
    }

    $databaseUrl = $databaseUrl.Trim()
    if ($databaseUrl -match '^(postgresql://[^:]+:)([^@]+)(@.*)$' -and $Matches[2] -notmatch '%') {
        $databaseUrl = $Matches[1] + [uri]::EscapeDataString($Matches[2]) + $Matches[3]
    }
    if ($databaseUrl -notmatch '^postgres(ql)?://') {
        throw "The configured database URL is not a PostgreSQL URL."
    }

    return $databaseUrl
}

function Find-PgDump {
    $command = Get-Command "pg_dump.exe" -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $installRoot = Join-Path $env:ProgramFiles "PostgreSQL"
    if (Test-Path -LiteralPath $installRoot) {
        $candidates = Get-ChildItem -LiteralPath $installRoot -Directory |
            Sort-Object {
                if ($_.Name -match '^\d+') {
                    [int]$Matches[0]
                } else {
                    0
                }
            } -Descending
        foreach ($candidate in $candidates) {
            $path = Join-Path $candidate.FullName "bin\pg_dump.exe"
            if (Test-Path -LiteralPath $path) {
                return $path
            }
        }
    }

    throw "pg_dump.exe was not found. Add PostgreSQL's bin folder to PATH or install PostgreSQL."
}

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
try {
    $databaseUrl = Get-DatabaseUrl $projectRoot
    $pgDump = Find-PgDump
    $oneDriveRoot = $env:OneDrive
    if (-not $oneDriveRoot -or -not (Test-Path -LiteralPath $oneDriveRoot -PathType Container)) {
        throw "OneDrive's sync folder was not found. Sign in to OneDrive or set the OneDrive environment variable."
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$backupDirectory = Join-Path $oneDriveRoot "Curiosity-Database-Backups"
Write-Host "Hourly Curiosity database backup is running."
Write-Host "Backups will be saved to: $backupDirectory"
Write-Host "Close this window or press Ctrl+C to stop."

while ($true) {
    $startedAt = Get-Date
    $stamp = $startedAt.ToString("yyyy-MM-dd_HH-mm-ss")
    $fileName = "curiosity-database-$stamp.dump"
    $localDump = Join-Path $env:TEMP "$fileName.tmp"
    $stagingFile = Join-Path $backupDirectory "$fileName.uploading"
    $finalFile = Join-Path $backupDirectory $fileName

    try {
        if (-not (Test-Path -LiteralPath $backupDirectory)) {
            New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
        }

        $retentionCutoff = (Get-Date).AddDays(-30)
        $expiredBackups = Get-ChildItem -LiteralPath $backupDirectory -File -Filter "curiosity-database-*.dump" |
            Where-Object {
                $_.Name -match '^curiosity-database-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.dump$' -and
                $_.LastWriteTime -lt $retentionCutoff
            }
        foreach ($expiredBackup in $expiredBackups) {
            Remove-Item -LiteralPath $expiredBackup.FullName -Force
            Write-Host "Removed backup older than 30 days: $($expiredBackup.Name)"
        }

        Write-Host "[$($startedAt.ToString('yyyy-MM-dd HH:mm:ss'))] Creating database dump..."
        $previousErrorPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            & $pgDump "--dbname=$databaseUrl" "--format=custom" "--no-owner" "--no-privileges" "--file=$localDump"
            $dumpExitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousErrorPreference
        }
        if ($dumpExitCode -ne 0) {
            throw "pg_dump failed with exit code $dumpExitCode."
        }
        if (-not (Test-Path -LiteralPath $localDump) -or (Get-Item -LiteralPath $localDump).Length -eq 0) {
            throw "pg_dump did not create a non-empty backup file."
        }

        Copy-Item -LiteralPath $localDump -Destination $stagingFile
        Move-Item -LiteralPath $stagingFile -Destination $finalFile
        Remove-Item -LiteralPath $localDump -Force
        Write-Host "Backup uploaded to OneDrive: $finalFile" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Backup failed: $($_.Exception.Message)" -ForegroundColor Red
        if (Test-Path -LiteralPath $stagingFile) {
            Remove-Item -LiteralPath $stagingFile -Force
        }
        if (Test-Path -LiteralPath $localDump) {
            Remove-Item -LiteralPath $localDump -Force
        }
    }

    $nextRun = $startedAt.AddHours(1)
    while ((Get-Date) -lt $nextRun) {
        Start-Sleep -Seconds 30
    }
}
