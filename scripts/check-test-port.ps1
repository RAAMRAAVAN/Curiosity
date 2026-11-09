$ErrorActionPreference = 'Stop'

$listeners = @(
    Get-NetTCPConnection -State Listen -LocalPort 3100 -ErrorAction SilentlyContinue |
        Sort-Object -Property OwningProcess -Unique
)

if ($listeners.Count -gt 0) {
    foreach ($listener in $listeners) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
        $processName = if ($process) { $process.Name } else { 'unknown process' }
        Write-Output "Port 3100 is listening on $($listener.LocalAddress), PID $($listener.OwningProcess) ($processName)."
    }
    exit 1
}

Write-Output 'Port 3100 is available.'
exit 0
