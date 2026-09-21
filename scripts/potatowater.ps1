# PotatoWater operator tool
# Controls the local StudyBuddyBoard (Next.js :3000) next to Auburn VSA (XAMPP :80)
# and the Windows Cloudflared service that publishes both hostnames.
#
# WARNING: Stopping the Cloudflared / Potato tunnel also takes down www.auburnvsa.com.
# Default stop/restart only touch Next.js on port 3000.
#
# Usage:
#   .\scripts\potatowater.ps1 status
#   .\scripts\potatowater.ps1 start
#   .\scripts\potatowater.ps1 stop
#   .\scripts\potatowater.ps1 stop -Tunnel
#   .\scripts\potatowater.ps1 restart
#   .\scripts\potatowater.ps1 restart -Tunnel
#
# npm (from repo root):
#   npm run pw:status
#   npm run pw:start
#   npm run pw:stop
#   npm run pw:restart
#   npm run pw:stop:tunnel
#   npm run pw:restart:tunnel

param(
    [Parameter(Position = 0)]
    [string]$Command = "status",
    [Parameter(Position = 1)]
    [string]$Target = "",
    [switch]$Tunnel,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $RepoRoot "package.json"))) {
    $RepoRoot = (Get-Location).Path
}

$StateDir = Join-Path $RepoRoot ".potatowater"
$StateFile = Join-Path $StateDir "state.json"
$LogFile = Join-Path $StateDir "next.log"
$ErrFile = Join-Path $StateDir "next.err.log"

$PublicStudyBuddy = "https://studybuddyboard.potatowater.com"
$PublicVsa = "https://www.auburnvsa.com"
$LocalStudyBuddy = "http://localhost:3000"
$LocalVsa = "http://localhost"
$NextPort = 3000
$ApachePort = 80
$XamppHttpd = "C:\xampp\apache\bin\httpd.exe"
$RepoLeaf = Split-Path $RepoRoot -Leaf

function Write-Ok([string]$Message) { Write-Host "[UP]   $Message" -ForegroundColor Green }
function Write-Down([string]$Message) { Write-Host "[DOWN] $Message" -ForegroundColor Red }
function Write-WarnLine([string]$Message) { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Info([string]$Message) { Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Note([string]$Message) { Write-Host "       $Message" }

function Show-Usage {
    Write-Host @"
PotatoWater operator -- StudyBuddyBoard + Cloudflare tunnel

  .\scripts\potatowater.ps1 status
  .\scripts\potatowater.ps1 start
  .\scripts\potatowater.ps1 stop
  .\scripts\potatowater.ps1 stop -Tunnel
  .\scripts\potatowater.ps1 restart
  .\scripts\potatowater.ps1 restart -Tunnel

npm (repo root):
  npm run pw:status
  npm run pw:start
  npm run pw:stop
  npm run pw:restart
  npm run pw:stop:tunnel
  npm run pw:restart:tunnel

What each command affects:
  status   Next :3000, Cloudflared (Potato tunnel), Apache :80, public URLs
  start    Start whatever is down: Next (background), Cloudflared service, XAMPP Apache
  stop     Stop Next on :3000 ONLY (Auburn VSA / tunnel stay up)
  restart  Stop Next, then start it again (tunnel stays up)

  -Tunnel / stop:tunnel also stop or restart the Cloudflared Windows service.
  WARNING: that drops BOTH $PublicStudyBuddy AND $PublicVsa.

This tool never starts a second Next on 3001. If :3000 is busy with
something else, start aborts and prints the owning process.
"@
}

function Ensure-StateDir {
    if (-not (Test-Path $StateDir)) {
        New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
    }
}

function Read-State {
    if (-not (Test-Path $StateFile)) { return $null }
    try {
        return Get-Content -Path $StateFile -Raw -ErrorAction Stop | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Write-State($obj) {
    Ensure-StateDir
    ($obj | ConvertTo-Json -Depth 4) | Set-Content -Path $StateFile -Encoding UTF8
}

function Test-TcpOpen([int]$Port, [int]$TimeoutMs = 400) {
    $addresses = @("127.0.0.1", "::1")
    foreach ($addr in $addresses) {
        $client = $null
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $iar = $client.BeginConnect($addr, $Port, $null, $null)
            $ok = $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
            if ($ok -and $client.Connected) {
                try { $client.EndConnect($iar) } catch {}
                return $true
            }
        } catch {
        } finally {
            if ($client) { try { $client.Close() } catch {} }
        }
    }
    return $false
}

function Get-ListenPids([int]$Port) {
    $found = New-Object "System.Collections.Generic.List[int]"
    $output = & netstat.exe -ano -p TCP 2>$null
    if (-not $output) { return @() }
    $rx = [regex]("[:\]]" + $Port + "\s+\S+\s+LISTENING\s+(\d+)")
    foreach ($line in $output) {
        $m = $rx.Match([string]$line)
        if ($m.Success) {
            $pidVal = [int]$m.Groups[1].Value
            if ($pidVal -gt 0 -and -not $found.Contains($pidVal)) {
                $found.Add($pidVal)
            }
        }
    }
    return @($found)
}

function Get-ProcessCim([int]$ProcessId) {
    if ($ProcessId -le 0) { return $null }
    return Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction SilentlyContinue
}

function Get-ProcessSummary([int]$ProcessId) {
    $cim = Get-ProcessCim $ProcessId
    if (-not $cim) { return "pid $ProcessId (gone)" }
    $cmd = [string]$cim.CommandLine
    if ($cmd.Length -gt 140) { $cmd = $cmd.Substring(0, 137) + "..." }
    if ([string]::IsNullOrWhiteSpace($cmd)) { $cmd = $cim.Name }
    return "pid $ProcessId $($cim.Name)  $cmd"
}

function Test-CommandLooksLikeNext([string]$CommandLine) {
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $false }
    $lower = $CommandLine.ToLowerInvariant()
    $repoLower = $RepoRoot.ToLowerInvariant()
    $leafLower = $RepoLeaf.ToLowerInvariant()
    $inThisRepo = $lower.Contains($repoLower) -or $lower.Contains("\$leafLower\") -or $lower.Contains("/$leafLower/")
    $isNext = ($lower -match "\bnext\b") -or $lower.Contains("start-server.js") -or $lower.Contains("next\dist\bin\next")
    return ($inThisRepo -and $isNext) -or ($isNext -and $lower.Contains("npm"))
}

function Get-NextTreeRoot([int]$StartPid) {
    $protected = @(
        "explorer", "services", "svchost", "wininit", "winlogon", "csrss", "lsass",
        "system", "idle", "cursor", "code", "windowsterminal", "conhost", "sihost"
    )
    $best = $StartPid
    $current = $StartPid
    for ($i = 0; $i -lt 10; $i++) {
        $proc = Get-ProcessCim $current
        if (-not $proc) { break }
        $parentId = [int]$proc.ParentProcessId
        if ($parentId -le 0) { break }
        $parent = Get-ProcessCim $parentId
        if (-not $parent) { break }
        $baseName = ([string]$parent.Name) -replace "\.exe$", ""
        if ($protected -contains $baseName.ToLowerInvariant()) { break }

        $cmd = [string]$parent.CommandLine
        $name = [string]$parent.Name
        $mentionsNext = Test-CommandLooksLikeNext $cmd
        $isLauncher = $mentionsNext -or (
            $name -match "(?i)^(cmd|npm|node|powershell|pwsh)\.exe$" -and
            ($cmd -match "(?i)(next|npm\s+run\s+dev)")
        )
        if (-not $isLauncher) { break }
        $best = $parentId
        $current = $parentId
    }
    return $best
}

function Get-NextStatus {
    $pids = @(Get-ListenPids $NextPort)
    $listening = (Test-TcpOpen $NextPort) -or ($pids.Count -gt 0)
    $result = [pscustomobject]@{
        Listening     = $listening
        ListenPids    = $pids
        IsThisRepo    = $false
        Foreign       = $false
        TreeRootPid   = $null
        Detail        = "nothing listening on :$NextPort"
    }
    if ($pids.Count -eq 0 -and -not $listening) { return $result }

    $thisRepo = $false
    $anyNode = $false
    $details = @()
    foreach ($pidVal in $pids) {
        $cim = Get-ProcessCim $pidVal
        $details += Get-ProcessSummary $pidVal
        if ($cim) {
            $cmd = [string]$cim.CommandLine
            if (Test-CommandLooksLikeNext $cmd) { $thisRepo = $true }
            if ([string]$cim.Name -match "(?i)node") { $anyNode = $true }
        }
    }
    $result.Detail = ($details -join " | ")
    $result.IsThisRepo = $thisRepo -or $anyNode
    $result.Foreign = $listening -and -not $thisRepo -and -not $anyNode
    if ($pids.Count -gt 0) {
        $result.TreeRootPid = Get-NextTreeRoot $pids[0]
    }

    $state = Read-State
    if ($state -and $state.PSObject.Properties["nextStarterPid"] -and $state.nextStarterPid) {
        $starter = Get-ProcessCim ([int]$state.nextStarterPid)
        if ($starter) {
            $result.TreeRootPid = [int]$state.nextStarterPid
        }
    }
    return $result
}

function Get-TunnelService {
    foreach ($name in @("Potato", "Cloudflared", "cloudflared")) {
        $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
        if ($svc) { return $svc }
    }
    return Get-Service -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match "(?i)cloudflared|potato" -or $_.DisplayName -match "(?i)cloudflared|potato" } |
        Select-Object -First 1
}

function Get-ApacheStatus {
    $pids = @(Get-ListenPids $ApachePort)
    $httpd = @(Get-Process -Name httpd -ErrorAction SilentlyContinue)
    $listening = (Test-TcpOpen $ApachePort) -or ($pids.Count -gt 0)
    $detail = "nothing listening on :$ApachePort"
    if ($httpd.Count -gt 0) {
        $detail = "XAMPP httpd pids " + (($httpd | ForEach-Object { $_.Id }) -join ", ")
    } elseif ($pids.Count -gt 0) {
        $detail = ($pids | ForEach-Object { Get-ProcessSummary $_ }) -join " | "
    }
    return [pscustomobject]@{
        Listening = $listening
        Pids      = $pids
        Httpd     = $httpd
        Detail    = $detail
        HttpdPath = $XamppHttpd
        HasBinary = Test-Path $XamppHttpd
    }
}

function Stop-PidTree([int]$ProcessId, [string]$Label) {
    if ($ProcessId -le 0) { return }
    $alive = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $alive) { return }
    Write-Info "Stopping $Label (pid $ProcessId + children)"
    & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null
}

function Wait-Port([int]$Port, [int]$Seconds, [bool]$ShouldBeOpen) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        $open = Test-TcpOpen $Port
        if ($ShouldBeOpen -and $open) { return $true }
        if (-not $ShouldBeOpen -and -not $open) { return $true }
        Start-Sleep -Milliseconds 400
    } while ((Get-Date) -lt $deadline)
    return $false
}

function Show-TunnelWarning {
    Write-Host ""
    Write-Host "************************************************************" -ForegroundColor Yellow
    Write-Host " WARNING: Stopping the Potato / Cloudflared tunnel also" -ForegroundColor Yellow
    Write-Host " takes down Auburn VSA at  $PublicVsa" -ForegroundColor Yellow
    Write-Host " and StudyBuddyBoard at    $PublicStudyBuddy" -ForegroundColor Yellow
    Write-Host " Default stop does NOT do this -- only -Tunnel does." -ForegroundColor Yellow
    Write-Host "************************************************************" -ForegroundColor Yellow
    Write-Host ""
}

function Invoke-Status {
    Write-Host ""
    Write-Host "PotatoWater operator" -ForegroundColor White
    Write-Host "StudyBuddyBoard  $PublicStudyBuddy  ->  localhost:$NextPort"
    Write-Host "Auburn VSA       $PublicVsa            ->  localhost:$ApachePort"
    Write-Host ""

    $next = Get-NextStatus
    if ($next.Listening -and -not $next.Foreign) {
        Write-Ok "Next.js (StudyBuddyBoard)  listening :$NextPort"
        Write-Note $next.Detail
    } elseif ($next.Foreign) {
        Write-WarnLine "Port $NextPort is in use by something that does not look like this repo's Next.js"
        Write-Note $next.Detail
        Write-Note "start will refuse to launch a second Next (including :3001)."
    } else {
        Write-Down "Next.js (StudyBuddyBoard)  not listening on :$NextPort"
        Write-Note "Public $PublicStudyBuddy is down until Next is started."
    }

    $svc = Get-TunnelService
    if ($svc) {
        $running = $svc.Status -eq "Running"
        $startType = ""
        try {
            $wmi = Get-CimInstance Win32_Service -Filter "Name='$($svc.Name)'" -ErrorAction Stop
            if ($wmi -and $wmi.StartMode) { $startType = [string]$wmi.StartMode }
        } catch { }
        $extra = $svc.Name
        if ($startType) { $extra = "$($svc.Name), start=$startType" }
        if ($running) {
            Write-Ok "Cloudflared (Potato tunnel)  $($svc.Status)  ($extra)"
        } else {
            Write-Down "Cloudflared (Potato tunnel)  $($svc.Status)  ($extra)"
        }
        Write-Note "Windows service name is '$($svc.Name)' (DisplayName: $($svc.DisplayName))."
        Write-Note "Stopping this service drops $PublicVsa AND $PublicStudyBuddy."
    } else {
        Write-Down "Cloudflared / Potato Windows service not found"
        Write-Note "Looked for service names: Potato, Cloudflared"
    }

    $apache = Get-ApacheStatus
    if ($apache.Listening) {
        Write-Ok "Apache / port $ApachePort  $($apache.Detail)"
    } else {
        Write-Down "Apache / port $ApachePort  not listening"
        Write-Note "Public $PublicVsa is down until Apache is up (tunnel can still be running)."
    }

    Write-Host ""
    Write-Host "Public URLs"
    Write-Note "$PublicStudyBuddy   (needs Next :$NextPort + Cloudflared)"
    Write-Note "$PublicVsa              (needs Apache :$ApachePort + Cloudflared)"
    Write-Host "Local ports"
    Write-Note "$LocalStudyBuddy"
    Write-Note "$LocalVsa  (XAMPP Apache)"
    Write-Host ""
    Write-Host "Default stop/restart = Next.js only. Auburn VSA keeps running." -ForegroundColor DarkGray
    Write-Host "Tunnel stop:  npm run pw:stop:tunnel   or   .\scripts\potatowater.ps1 stop -Tunnel" -ForegroundColor DarkGray
    Write-Host ""

    return 0
}

function Start-ApacheIfDown {
    $apache = Get-ApacheStatus
    if ($apache.Listening) {
        Write-Ok "Apache already listening on :$ApachePort"
        return $true
    }
    if (-not $apache.HasBinary) {
        Write-WarnLine "XAMPP httpd not found at $XamppHttpd -- skipped (Auburn VSA start)"
        return $false
    }
    Write-Info "Starting XAMPP Apache ($XamppHttpd)"
    try {
        Start-Process -FilePath $XamppHttpd -WorkingDirectory "C:\xampp" -WindowStyle Hidden | Out-Null
    } catch {
        Write-WarnLine "Could not start Apache: $($_.Exception.Message)"
        return $false
    }
    if (Wait-Port $ApachePort 12 $true) {
        Write-Ok "Apache is listening on :$ApachePort"
        return $true
    }
    Write-WarnLine "Apache start was issued but :$ApachePort is not listening yet"
    return $false
}

function Start-TunnelIfDown {
    $svc = Get-TunnelService
    if (-not $svc) {
        Write-WarnLine "Cloudflared / Potato service not installed -- skipped"
        return $false
    }
    if ($svc.Status -eq "Running") {
        Write-Ok "Cloudflared service '$($svc.Name)' already running"
        return $true
    }
    Write-Info "Starting Cloudflared service '$($svc.Name)'"
    try {
        Start-Service -Name $svc.Name -ErrorAction Stop
        $svc.Refresh()
        if ($svc.Status -eq "Running") {
            Write-Ok "Cloudflared service '$($svc.Name)' is running"
            return $true
        }
        Write-WarnLine "Service '$($svc.Name)' is $($svc.Status) after start"
        return $false
    } catch {
        Write-WarnLine "Could not start '$($svc.Name)': $($_.Exception.Message)"
        Write-Note "Start the service from an Administrator terminal if Windows asks for elevation."
        Write-Note "Auburn VSA at $PublicVsa stays down until this service is running."
        return $false
    }
}

function Start-NextIfDown {
    $next = Get-NextStatus
    if ($next.Listening -and -not $next.Foreign) {
        Write-Ok "Next.js already listening on :$NextPort (will not start a second copy)"
        Write-Note $next.Detail
        return $true
    }
    if ($next.Foreign -or $next.Listening) {
        Write-Down "Port $NextPort is busy -- refusing to start Next (would hop to 3001)"
        Write-Note $next.Detail
        return $false
    }

    $npmCmd = Join-Path $env:ProgramFiles "nodejs\npm.cmd"
    if (-not (Test-Path $npmCmd)) {
        $npmCmd = "npm.cmd"
    }
    $pkg = Join-Path $RepoRoot "package.json"
    if (-not (Test-Path $pkg)) {
        Write-Down "package.json not found at $RepoRoot"
        return $false
    }

    Ensure-StateDir
    if (Test-Path $LogFile) { Remove-Item $LogFile -Force -ErrorAction SilentlyContinue }
    if (Test-Path $ErrFile) { Remove-Item $ErrFile -Force -ErrorAction SilentlyContinue }

    Write-Info "Starting Next.js in background (npm run dev) at $RepoRoot"
    try {
        $proc = Start-Process -FilePath $env:ComSpec -ArgumentList @("/c", "npm run dev") -WorkingDirectory $RepoRoot -WindowStyle Hidden -RedirectStandardOutput $LogFile -RedirectStandardError $ErrFile -PassThru
    } catch {
        Write-Down "Failed to spawn npm run dev: $($_.Exception.Message)"
        return $false
    }

    Write-State ([pscustomobject]@{
        nextStarterPid = $proc.Id
        startedAt      = (Get-Date).ToString("o")
        logFile        = $LogFile
        errFile        = $ErrFile
        repoRoot       = $RepoRoot
        port           = $NextPort
    })
    Write-Note "Starter pid $($proc.Id)  logs: $LogFile"

    if (Wait-Port $NextPort 45 $true) {
        $after = Get-NextStatus
        Write-Ok "Next.js is listening on :$NextPort"
        Write-Note $after.Detail
        Write-Note "Local  $LocalStudyBuddy"
        Write-Note "Public $PublicStudyBuddy  (needs Cloudflared up)"
        return $true
    }

    Write-Down "Next.js did not open :$NextPort within 45s"
    if (Test-Path $ErrFile) {
        $tail = Get-Content $ErrFile -Tail 20 -ErrorAction SilentlyContinue
        if ($tail) {
            Write-Note "next.err.log (tail):"
            $tail | ForEach-Object { Write-Note $_ }
        }
    }
    if (Test-Path $LogFile) {
        $tail = Get-Content $LogFile -Tail 20 -ErrorAction SilentlyContinue
        if ($tail) {
            Write-Note "next.log (tail):"
            $tail | ForEach-Object { Write-Note $_ }
        }
    }
    return $false
}

function Stop-Next {
    $next = Get-NextStatus
    $state = Read-State
    $stopped = $false

    if ($state -and $state.PSObject.Properties["nextStarterPid"] -and $state.nextStarterPid) {
        $starterId = [int]$state.nextStarterPid
        if (Get-Process -Id $starterId -ErrorAction SilentlyContinue) {
            Stop-PidTree $starterId "saved Next starter"
            $stopped = $true
        }
    }

    $next = Get-NextStatus
    if ($next.Listening) {
        if ($next.Foreign) {
            Write-WarnLine "Port $NextPort is not this repo's Next.js -- leaving it alone"
            Write-Note $next.Detail
            return $false
        }
        foreach ($pidVal in @($next.ListenPids)) {
            $root = Get-NextTreeRoot $pidVal
            Stop-PidTree $root "Next.js on :$NextPort"
            $stopped = $true
        }
    }

    if (-not $stopped -and -not $next.Listening) {
        Write-Ok "Next.js already stopped (nothing on :$NextPort)"
        if (Test-Path $StateFile) { Remove-Item $StateFile -Force -ErrorAction SilentlyContinue }
        return $true
    }

    if (Wait-Port $NextPort 12 $false) {
        Write-Ok "Next.js stopped -- :$NextPort is free"
        if (Test-Path $StateFile) { Remove-Item $StateFile -Force -ErrorAction SilentlyContinue }
        Write-Note "Public $PublicStudyBuddy is down until you start Next again."
        Write-Note "Auburn VSA $PublicVsa is unchanged (tunnel/Apache not stopped)."
        return $true
    }

    Write-WarnLine "Tried to stop Next but :$NextPort still looks open"
    Write-Note (Get-NextStatus).Detail
    return $false
}

function Stop-Tunnel {
    Show-TunnelWarning
    $svc = Get-TunnelService
    if (-not $svc) {
        Write-WarnLine "Cloudflared / Potato service not found"
        return $false
    }
    if ($svc.Status -ne "Running") {
        Write-Ok "Cloudflared service '$($svc.Name)' already $($svc.Status)"
        return $true
    }
    Write-Info "Stopping Cloudflared service '$($svc.Name)'"
    try {
        Stop-Service -Name $svc.Name -Force -ErrorAction Stop
        $svc.Refresh()
        Write-Ok "Cloudflared service '$($svc.Name)' is $($svc.Status)"
        Write-WarnLine "$PublicVsa and $PublicStudyBuddy are now unreachable from the internet."
        return $true
    } catch {
        Write-Down "Could not stop '$($svc.Name)': $($_.Exception.Message)"
        Write-Note "Try an Administrator terminal if Windows denies the stop."
        return $false
    }
}

function Invoke-Start([bool]$WithTunnel) {
    Write-Host ""
    Write-Info "Starting PotatoWater stack (Next + keep Auburn VSA up)"
    $apacheOk = Start-ApacheIfDown
    $tunnelOk = $true
    if ($WithTunnel -or $true) {
        $tunnelOk = Start-TunnelIfDown
    }
    $nextOk = Start-NextIfDown
    Write-Host ""
    if ($nextOk -and $apacheOk -and $tunnelOk) {
        Write-Ok "All local pieces are up"
        return 0
    }
    Write-WarnLine "Start finished with something still down -- run status"
    return 1
}

function Invoke-Stop([bool]$WithTunnel) {
    Write-Host ""
    $nextOk = Stop-Next
    $tunnelOk = $true
    if ($WithTunnel) {
        $tunnelOk = Stop-Tunnel
    } else {
        Write-Note "Tunnel left running (Auburn VSA stays public)."
        Write-Note "To stop the tunnel too:  npm run pw:stop:tunnel"
    }
    if ($nextOk -and $tunnelOk) { return 0 }
    return 1
}

function Invoke-Restart([bool]$WithTunnel) {
    Write-Host ""
    Write-Info "Restarting StudyBuddyBoard Next.js"
    [void](Stop-Next)
    Start-Sleep -Seconds 1
    $tunnelOk = $true
    if ($WithTunnel) {
        Show-TunnelWarning
        $svc = Get-TunnelService
        if ($svc) {
            Write-Info "Restarting Cloudflared service '$($svc.Name)'"
            try {
                Restart-Service -Name $svc.Name -Force -ErrorAction Stop
                $svc.Refresh()
                Write-Ok "Cloudflared service '$($svc.Name)' is $($svc.Status)"
            } catch {
                Write-WarnLine "Could not restart '$($svc.Name)': $($_.Exception.Message)"
                $tunnelOk = $false
            }
        }
    }
    $nextOk = Start-NextIfDown
    $apacheOk = Start-ApacheIfDown
    if (-not $WithTunnel) {
        [void](Start-TunnelIfDown)
    }
    if ($nextOk -and $apacheOk -and $tunnelOk) { return 0 }
    return 1
}

$action = if ($Command) { $Command.ToLowerInvariant() } else { "status" }
$useTunnel = [bool]$Tunnel
if ($Target -match "(?i)tunnel") { $useTunnel = $true }
if ($action -match "(?i)^(help|-h|--help)$" -or $Help) {
    Show-Usage
    exit 0
}

$code = 0
switch ($action) {
    "status"  { $code = Invoke-Status }
    "start"   { $code = Invoke-Start $useTunnel }
    "stop"    { $code = Invoke-Stop $useTunnel }
    "restart" { $code = Invoke-Restart $useTunnel }
    default {
        Write-Down "Unknown command '$action'"
        Show-Usage
        $code = 2
    }
}

exit $code
