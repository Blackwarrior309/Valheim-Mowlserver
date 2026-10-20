# Valheim-Server-Backup per FTP – liest nur, löscht und ändert nichts auf dem Server.
# Lädt Welt(en) inkl. älterer Spielstände, Admin-/Bann-Listen, BepInEx-Mods/Configs und Logs herunter
# nach  <Desktop>\Valheim-Backups\Backup_JJJJ-MM-TT_HH-MM  und packt alles zusätzlich in eine .zip.
# Start: Doppelklick auf "Backup starten.bat". Das Passwort wird nur abgefragt, nie gespeichert.
#   -Alles   auch die Spieldateien des Servers sichern (groß, normalerweise unnötig)
param([switch]$Alles)
$ErrorActionPreference = 'Stop'
$cfgFile = Join-Path $PSScriptRoot 'backup-einstellungen.json'
$cfg = $null; if (Test-Path $cfgFile) { try { $cfg = Get-Content $cfgFile -Raw | ConvertFrom-Json } catch { } }
function Frage($text, $vorgabe) { $t = $text; if ($vorgabe) { $t += " [$vorgabe]" }; $v = Read-Host $t; if ([string]::IsNullOrWhiteSpace($v)) { return $vorgabe } return $v.Trim() }

Write-Host ''; Write-Host '=== Valheim-Server-Backup (nur lesen) ===' -ForegroundColor Cyan
Write-Host 'Die FTP-Daten stehen im Nitrado-Webinterface unter "FTP-Zugang".'; Write-Host ''
$ftpHost = Frage 'FTP-Server (z. B. ms123.nitrado.net)' $(if ($cfg) { $cfg.host } else { '' })
$port    = Frage 'Port' $(if ($cfg -and $cfg.port) { $cfg.port } else { '21' })
$user    = Frage 'FTP-Benutzer' $(if ($cfg) { $cfg.user } else { '' })
$sslVor  = $(if ($cfg -and $cfg.ssl) { 'j' } else { 'n' })
$ssl     = (Frage 'Verschlüsselt verbinden (FTPS)? j/n' $sslVor) -match '^[jJyY]'
$sec     = Read-Host 'FTP-Passwort (wird nicht angezeigt und nicht gespeichert)' -AsSecureString
$bstr    = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$pass    = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr); [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
if (-not $ftpHost -or -not $user) { Write-Host 'Server und Benutzer werden gebraucht.' -ForegroundColor Red; exit 1 }
@{ host = $ftpHost; port = $port; user = $user; ssl = $ssl } | ConvertTo-Json | Set-Content $cfgFile -Encoding UTF8   # ohne Passwort

$cred = New-Object Net.NetworkCredential($user, $pass)
$base = "ftp://$($ftpHost):$port"
# Ordner mit Spieldateien des Servers (werden ohne -Alles übersprungen)
$spiel = @('valheim_server_Data', 'MonoBleedingEdge', 'linux64', 'steamapps', 'steamcmd', 'D3D12', 'doorstop_libs', '.steam', 'Steam', 'steamclient', 'UnityCrashHandler64')
$ziel = Join-Path ([Environment]::GetFolderPath('Desktop')) ('Valheim-Backups\Backup_' + (Get-Date -Format 'yyyy-MM-dd_HH-mm'))
New-Item -ItemType Directory -Force -Path $ziel | Out-Null

function Url($p) { return $base + (($p -split '/' | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/') }
function Anfrage($p, $methode) {
  $r = [Net.FtpWebRequest]::Create((Url $p)); $r.Method = $methode; $r.Credentials = $cred
  $r.UseBinary = $true; $r.UsePassive = $true; $r.KeepAlive = $true; $r.EnableSsl = $ssl; $r.Timeout = 60000; $r.ReadWriteTimeout = 300000
  return $r
}
function Liste($dir) {
  $res = (Anfrage ($dir.TrimEnd('/') + '/') ([Net.WebRequestMethods+Ftp]::ListDirectoryDetails)).GetResponse()
  $sr = New-Object IO.StreamReader($res.GetResponseStream()); $txt = $sr.ReadToEnd(); $sr.Close(); $res.Close()
  $out = @()
  foreach ($l in ($txt -split "`r?`n")) {
    if ($l -match '^([\-dl])\S*\s+\d+\s+\S+\s+\S+\s+(\d+)\s+\w{3}\s+\d+\s+[\d:]+\s+(.+)$') {
      $n = $matches[3]; if ($n -eq '.' -or $n -eq '..') { continue }
      if ($matches[1] -eq 'l') { $n = ($n -split ' -> ')[0] }
      $out += [pscustomobject]@{ Name = $n; Dir = ($matches[1] -eq 'd'); Size = [int64]$matches[2] }
    } elseif ($l -match '^\d\d-\d\d-\d\d\s+\S+\s+(<DIR>|\d+)\s+(.+)$') {   # Windows-Listing
      $out += [pscustomobject]@{ Name = $matches[2]; Dir = ($matches[1] -eq '<DIR>'); Size = $(if ($matches[1] -eq '<DIR>') { 0 } else { [int64]$matches[1] }) }
    }
  }
  return $out
}
$script:anzahl = 0; $script:bytes = 0; $script:fehler = @(); $script:welten = @()
function Hole($dir) {
  try { $items = Liste $dir } catch { $script:fehler += "$dir (Ordner nicht lesbar: $($_.Exception.Message))"; return }
  foreach ($it in $items) {
    $p = ($dir.TrimEnd('/') + '/' + $it.Name)
    if ($it.Dir) {
      if (-not $Alles -and $spiel -contains $it.Name) { Write-Host "  übersprungen (Spieldateien): $p" -ForegroundColor DarkGray; continue }
      Hole $p; continue
    }
    if (-not $Alles -and $dir -eq '/' -and $it.Name -match '\.(exe|dll|so|pdb)$') { continue }   # Programmdateien im Hauptordner
    $lokal = Join-Path $ziel ($p.TrimStart('/') -replace '/', '\')
    New-Item -ItemType Directory -Force -Path (Split-Path $lokal) | Out-Null
    try {
      $res = (Anfrage $p ([Net.WebRequestMethods+Ftp]::DownloadFile)).GetResponse(); $in = $res.GetResponseStream()
      $fs = [IO.File]::Create($lokal); $in.CopyTo($fs); $fs.Close(); $in.Close(); $res.Close()
      $script:anzahl++; $script:bytes += (Get-Item $lokal).Length
      if ($it.Name -match '\.(db|db2|fwl|fwl2)$') { $script:welten += $p }
      Write-Host ("  {0,10:N0} KB  {1}" -f ((Get-Item $lokal).Length / 1KB), $p)
    } catch { $script:fehler += "$p ($($_.Exception.Message))" }
  }
}

Write-Host ''; Write-Host "Lade nach: $ziel" -ForegroundColor Cyan
$start = Get-Date
try { Hole '/' } catch { Write-Host "Verbindung fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
$pass = $null
Write-Host ''
Write-Host ("Fertig: {0} Dateien, {1:N1} MB in {2:N0} s" -f $script:anzahl, ($script:bytes / 1MB), ((Get-Date) - $start).TotalSeconds) -ForegroundColor Green
if ($script:welten.Count) { Write-Host 'Weltdateien:'; $script:welten | ForEach-Object { Write-Host "  $_" } } else { Write-Host 'ACHTUNG: keine Weltdatei (.db/.fwl) gefunden!' -ForegroundColor Yellow }
if ($script:fehler.Count) { Write-Host "$($script:fehler.Count) Dateien/Ordner nicht geladen:" -ForegroundColor Yellow; $script:fehler | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" } }
try { Compress-Archive -Path (Join-Path $ziel '*') -DestinationPath ($ziel + '.zip') -CompressionLevel Optimal -Force; Write-Host "Zip: $ziel.zip" -ForegroundColor Green } catch { Write-Host "Zip nicht erstellt: $($_.Exception.Message)" -ForegroundColor Yellow }
Write-Host 'Tipp: am sichersten direkt nach einem Speichern des Servers oder bei gestopptem Server sichern.'
