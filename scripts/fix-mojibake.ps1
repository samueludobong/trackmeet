# Repair files that were double-encoded UTF-8 -> CP1252 -> UTF-8.
# Strategy: re-encode the corrupted UTF-8 string as Latin-1 (each char -> 1 byte
# in 0x00..0xFF), then decode the resulting bytes as UTF-8.
#
# We avoid embedding any literal high-bit characters in this script (since the
# editor/Write path that created the corruption could re-corrupt them on save).
# Marker detection: any char in 0x80..0xFF appearing in a file we expect to be
# clean ASCII + intentional Unicode is treated as suspect, but we only RUN the
# round-trip when the file *contains* the typical "Latin-1-as-UTF-8-encoded" markers:
# the C2/C3-prefix glyphs and the "..." prefix glyphs.

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
# The bad pass that produced the corruption used Windows-1252 (CP1252), not
# pure ISO-8859-1. CP1252 maps bytes 0x80..0x9F to printable Unicode chars
# (€, ™, ', etc.), so a file with the right single quote (U+2019, UTF-8 bytes
# E2 80 99) mojibakes to the chars `â`, `€`, `™` — and `€` is U+20AC, > 0xFF.
$cp1252 = [System.Text.Encoding]::GetEncoding(1252)

# Detect markers via the leading-byte chars that always show up in mojibake'd
# 2/3/4-byte UTF-8 sequences (C2/C3 -> Â/Ã, E2 -> â, F0 -> ð).
$cA_circ  = [char]0x00C2
$cA_tilde = [char]0x00C3
$cA_low   = [char]0x00E2
$co_circ  = [char]0x00F0

function HasMojibakeMarkers([string]$s) {
    return ($s.Contains($cA_circ) -or
            $s.Contains($cA_tilde) -or
            $s.Contains($cA_low) -or
            $s.Contains($co_circ))
}

# Codepoints > 0xFF that are NOT inside CP1252's printable range (0x80-0x9F) are
# real Unicode (emoji, math symbols, etc.) that we must preserve. The CP1252
# printable-high set is U+20AC, U+201A, U+0192, U+201E, U+2026, U+2020, U+2021,
# U+02C6, U+2030, U+0160, U+2039, U+0152, U+017D, U+2018, U+2019, U+201C,
# U+201D, U+2022, U+2013, U+2014, U+02DC, U+2122, U+0161, U+203A, U+0153,
# U+017E, U+0178.
$cp1252HighSet = New-Object System.Collections.Generic.HashSet[int]
foreach ($cp in 0x20AC,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0x02C6,0x2030,
                 0x0160,0x2039,0x0152,0x017D,0x2018,0x2019,0x201C,0x201D,0x2022,
                 0x2013,0x2014,0x02DC,0x2122,0x0161,0x203A,0x0153,0x017E,0x0178) {
    [void]$cp1252HighSet.Add($cp)
}

$candidates = Get-ChildItem $root -Recurse -File -Include *.ts,*.tsx,*.js,*.mjs,*.json,*.md |
    Where-Object {
        $p = $_.FullName -replace '\\','/'
        ($p -notmatch '/(node_modules|\.expo|\.git|dist|build|ios|android)/')
    }

$fixed = 0
$skippedMixed = 0
foreach ($f in $candidates) {
    $text = [System.IO.File]::ReadAllText($f.FullName, $utf8NoBom)
    if (-not (HasMojibakeMarkers $text)) { continue }

    # Codepoints in the CP1252 printable-high set ARE mojibake (they came from
    # bytes 0x80..0x9F being read as CP1252). Any *other* codepoint > 0xFF is
    # real Unicode (emoji etc.) that we'd lose — bail and require manual review.
    $hasNonMojibakeHigh = $false
    foreach ($c in $text.ToCharArray()) {
        $cp = [int]$c
        if ($cp -gt 0xFF -and -not $cp1252HighSet.Contains($cp)) {
            $hasNonMojibakeHigh = $true; break
        }
    }
    if ($hasNonMojibakeHigh) {
        Write-Warning "Skipped (real Unicode mixed in): $($f.FullName)"
        $skippedMixed++
        continue
    }

    $bytes = $cp1252.GetBytes($text)
    $repaired = $utf8NoBom.GetString($bytes)

    [System.IO.File]::WriteAllText($f.FullName, $repaired, $utf8NoBom)
    $fixed++
}

Write-Host "Repaired $fixed files. Skipped (mixed encoding): $skippedMixed."
