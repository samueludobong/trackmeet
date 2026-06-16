# Splits lib/feed/localStyles.ts into thematic files under lib/feed/localStyles/
# and replaces the original with a barrel re-export. Idempotent for re-run.

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$src  = Join-Path $root 'lib\feed\localStyles.ts'
$outDir = Join-Path $root 'lib\feed\localStyles'

if (-not (Test-Path $src)) { throw "Source not found: $src" }
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

$lines = Get-Content $src
# Find header lines (imports / top comments) — everything before the first export.
$firstExportIdx = ($lines | Select-String -Pattern '^export const \w+ = StyleSheet\.create' | Select-Object -First 1).LineNumber - 1
$header = $lines[0..($firstExportIdx - 1)] -join "`n"

# Locate every export boundary.
$matches = $lines | Select-String -Pattern '^export const (\w+) = StyleSheet\.create'
$boundaries = @()
for ($i = 0; $i -lt $matches.Count; $i++) {
    $start = $matches[$i].LineNumber - 1
    $end = if ($i -lt $matches.Count - 1) { $matches[$i+1].LineNumber - 2 } else { $lines.Count - 1 }
    $boundaries += [PSCustomObject]@{
        Name  = $matches[$i].Matches[0].Groups[1].Value
        Start = $start
        End   = $end
    }
}

# Map each export to a thematic file.
function Get-Theme($name) {
    switch -Regex ($name) {
        '^spCard$'                    { return 'songPreview' }
        '^lbStyles$'                  { return 'lightbox' }
        '^ds$'                        { return 'discover' }
        '^(msgStyles|ms|chatStyles)$' { return 'messages' }
        '^(pplStyles|pdStyles|cpStyles)$' { return 'playlists' }
        '^(lmStyles|mlStyles|mmStyles|mbStyles|llStyles|mcStyles|sumStyles|reactStyles|gdStyles|jpStyles|csStyles)$' { return 'meets' }
        '^(profileStyles|psStyles|epOverlayStyles|bcOverlayStyles|bsOverlayStyles|linksSheetStyles|settingsOverlayStyles)$' { return 'profile' }
        default { return 'misc' }
    }
}

$grouped = @{}
foreach ($b in $boundaries) {
    $theme = Get-Theme $b.Name
    if (-not $grouped.ContainsKey($theme)) { $grouped[$theme] = @() }
    $grouped[$theme] += $b
}

# Write each thematic file.
foreach ($theme in $grouped.Keys) {
    $body = New-Object System.Text.StringBuilder
    [void]$body.AppendLine($header)
    [void]$body.AppendLine()
    foreach ($b in $grouped[$theme]) {
        $chunk = $lines[$b.Start..$b.End] -join "`n"
        [void]$body.AppendLine($chunk)
        [void]$body.AppendLine()
    }
    $path = Join-Path $outDir ("$theme.ts")
    Set-Content -Path $path -Value $body.ToString().TrimEnd() -Encoding UTF8
    Write-Host "Wrote $path ($($grouped[$theme].Count) exports)"
}

# Write barrel.
$barrel = New-Object System.Text.StringBuilder
[void]$barrel.AppendLine('// Barrel: thematic per-domain stylesheet modules.')
[void]$barrel.AppendLine('// The originals lived in a single 2300-line file; split for maintainability.')
foreach ($theme in ($grouped.Keys | Sort-Object)) {
    [void]$barrel.AppendLine("export * from './localStyles/$theme';")
}
Set-Content -Path $src -Value $barrel.ToString().TrimEnd() -Encoding UTF8
Write-Host "Rewrote barrel: $src"
