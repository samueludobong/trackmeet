# Splits lib/spotify.ts into domain modules under lib/spotify/.
# Re-exports everything from lib/spotify.ts so the 30+ import sites are untouched.

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$src  = Join-Path $root 'lib\spotify.ts'
$outDir = Join-Path $root 'lib\spotify'

if (-not (Test-Path $src)) { throw "Source not found: $src" }
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

$lines = Get-Content $src

# Map each named top-level symbol to a target domain.
# Symbols not listed default to 'misc' so we can flag stragglers.
$domain = @{
    # _shared
    '_tokPfx'                  = '_shared'
    '_readSpotifyErr'          = '_shared'
    '_writeResultFrom'         = '_shared'
    'SpotifyWriteResult'       = '_shared'

    # auth
    'SPOTIFY_CLIENT_ID'        = 'auth'
    'SPOTIFY_SCOPES'           = 'auth'
    'redirectUri'              = 'auth'
    'generateCodeVerifier'     = 'auth'
    'generateCodeChallenge'    = 'auth'
    'connectSpotify'           = 'auth'
    'disconnectSpotify'        = 'auth'
    'RefreshResult'            = 'auth'
    'refreshSpotifyToken'      = 'auth'
    'reconnectSpotify'         = 'auth'
    '_activeViewerToken'       = 'auth'
    'setActiveSpotifyToken'    = 'auth'
    'getActiveSpotifyToken'    = 'auth'
    '_publicToken'             = 'auth'
    '_publicTokenExp'          = 'auth'
    'getPublicSpotifyToken'    = 'auth'
    'getValidSpotifyToken'     = 'auth'

    # player
    'getCurrentlyPlaying'      = 'player'
    'skipPrevious'             = 'player'
    'skipNext'                 = 'player'
    'setPlayback'              = 'player'
    'seekPlayback'             = 'player'
    'getPlaybackVolume'        = 'player'
    'setVolume'                = 'player'
    'getSpotifyDevices'        = 'player'
    'pickTargetDevice'         = 'player'
    'playTrackAt'              = 'player'
    'playTracks'               = 'player'
    'playTrack'                = 'player'

    # tracks
    'saveTrackToLiked'         = 'tracks'
    'saveTrackToLikedDetailed' = 'tracks'
    'SpotifyTrackResult'       = 'tracks'
    'getRecommendedTracks'     = 'tracks'
    'getUserTopTracks'         = 'tracks'
    'searchSpotifyTracks'      = 'tracks'
    'isTrackSaved'             = 'tracks'
    'removeTrackFromLiked'     = 'tracks'
    'fetchSpotifyTrackById'    = 'tracks'

    # playlists
    'SpotifyPlaylist'              = 'playlists'
    'getUserPlaylists'             = 'playlists'
    'PlaylistTracksResult'         = 'playlists'
    'getPlaylistTracks'            = 'playlists'
    'addTrackToSpotifyPlaylist'    = 'playlists'
    'removeTrackFromSpotifyPlaylist' = 'playlists'
    'CreateSpotifyPlaylistResult'  = 'playlists'
    'createSpotifyPlaylist'        = 'playlists'
    'playlistsContainingTrack'     = 'playlists'

    # artists
    'SpotifyArtistInfo'        = 'artists'
    'SpotifyAlbum'             = 'artists'
    'SpotifyAlbumTrack'        = 'artists'
    'searchSpotifyArtist'      = 'artists'
    'getArtistAlbums'          = 'artists'
    'getAlbumTracks'           = 'artists'
    'searchSpotifyArtists'     = 'artists'
    'searchSpotifyAlbums'      = 'artists'
    'fetchSpotifyArtistById'   = 'artists'

    # canvas
    '_varint'                   = 'canvas'
    '_readVarint'               = 'canvas'
    '_readProto'                = 'canvas'
    'fetchSpotifyCanvas'        = 'canvas'
    'fetchSpotifyEmbedPreview'  = 'canvas'
    'getOrCacheSongPreviewUrl'  = 'canvas'

    # links
    'openSpotifyLink'          = 'links'
    'parseSpotifyUrl'          = 'links'
    'SpotifyLinkInfo'          = 'links'
    'fetchSpotifyLinkInfo'     = 'links'
}

# Find every top-level symbol declaration line. Patterns covered:
#   export const NAME =        export let NAME =
#   export function NAME(       export async function NAME(
#   export type NAME =
#   const NAME =               let NAME =
#   function NAME(             async function NAME(
$symRe = '^\s*(?:export\s+)?(?:async\s+)?(?:const|let|function|type)\s+([A-Za-z_][A-Za-z0-9_]*)'
$symbols = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $symRe) {
        $name = $Matches[1]
        if ($domain.ContainsKey($name)) {
            $symbols += [PSCustomObject]@{ Name = $name; Line = $i }
        }
    }
}

# Extend each symbol's "block" from its preceding comment block up to the line
# before the next symbol (or EOF).
$blocks = @()
for ($i = 0; $i -lt $symbols.Count; $i++) {
    $sym = $symbols[$i]
    # Find preceding comment block: walk back while previous lines are comments or blank,
    # but stop on a blank that follows another block.
    $start = $sym.Line
    $j = $start - 1
    while ($j -ge 0 -and ($lines[$j] -match '^\s*//' -or $lines[$j].Trim() -eq '')) {
        $j--
    }
    # Skip leading blank lines forward from $j+1.
    $candidate = $j + 1
    while ($candidate -lt $start -and $lines[$candidate].Trim() -eq '') { $candidate++ }
    $start = $candidate
    $end = if ($i -lt $symbols.Count - 1) { $symbols[$i + 1].Line - 1 } else { $lines.Count - 1 }
    # Trim trailing blanks from this block.
    while ($end -gt $start -and $lines[$end].Trim() -eq '') { $end-- }
    $blocks += [PSCustomObject]@{
        Name   = $sym.Name
        Domain = $domain[$sym.Name]
        Start  = $start
        End    = $end
    }
}

# Adjust block starts so they don't overlap (each block's start >= previous block's end + 1).
for ($i = 1; $i -lt $blocks.Count; $i++) {
    if ($blocks[$i].Start -le $blocks[$i - 1].End) {
        $blocks[$i].Start = $blocks[$i - 1].End + 1
    }
}

# Group blocks by domain in original order.
$ordered = @{}
foreach ($b in $blocks) {
    if (-not $ordered.ContainsKey($b.Domain)) { $ordered[$b.Domain] = @() }
    $ordered[$b.Domain] += $b
}

# ── Imports header used at top of every domain file ──────────────────────────
# Each file gets the original imports (paths shifted for the new subdir).
# Unused imports tree-shake fine and tsc tolerates them by default.
$baseImports = @(
    "import * as AuthSession from 'expo-auth-session'"
    "import * as WebBrowser from 'expo-web-browser'"
    "import * as Crypto from 'expo-crypto'"
    "import * as Linking from 'expo-linking'"
    "import { supabase } from '../supabase'"
)

# Per-domain extra imports (cross-domain helpers).
$extraImports = @{
    '_shared'   = @()
    'auth'      = @()
    'player'    = @()
    'tracks'    = @(
        "import { _tokPfx, _readSpotifyErr, _writeResultFrom, type SpotifyWriteResult } from './_shared'"
    )
    'playlists' = @(
        "import { _tokPfx, _readSpotifyErr, _writeResultFrom, type SpotifyWriteResult } from './_shared'"
        "import { type SpotifyTrackResult } from './tracks'"
        "import { getPublicSpotifyToken } from './auth'"
    )
    'artists'   = @()
    'canvas'    = @()
    'links'     = @(
        "import { getActiveSpotifyToken } from './auth'"
        "import { getCurrentlyPlaying, playTrack } from './player'"
    )
}

foreach ($dom in $ordered.Keys) {
    $body = New-Object System.Text.StringBuilder
    foreach ($imp in $baseImports) { [void]$body.AppendLine($imp) }
    foreach ($imp in $extraImports[$dom]) { [void]$body.AppendLine($imp) }
    if ($dom -ne '_shared') {
        # WebBrowser.maybeCompleteAuthSession() lives only in auth.ts (mirrors original behaviour).
    }
    [void]$body.AppendLine()
    if ($dom -eq 'auth') {
        [void]$body.AppendLine('WebBrowser.maybeCompleteAuthSession()')
        [void]$body.AppendLine()
    }
    foreach ($b in $ordered[$dom]) {
        $chunk = $lines[$b.Start..$b.End] -join "`n"
        [void]$body.AppendLine($chunk)
        [void]$body.AppendLine()
    }
    $path = Join-Path $outDir "$dom.ts"
    Set-Content -Path $path -Value $body.ToString().TrimEnd() -Encoding UTF8
    Write-Host "Wrote $path ($(($ordered[$dom] | Measure-Object).Count) symbols)"
}

# Patch links.ts: replace direct `_activeViewerToken` reads with getActiveSpotifyToken() calls.
$linksPath = Join-Path $outDir 'links.ts'
$lc = Get-Content $linksPath -Raw
$lc = $lc -replace 'if \(trackMatch && _activeViewerToken\) \{', "const _tok = getActiveSpotifyToken();`n  if (trackMatch && _tok) {"
$lc = $lc -replace '_activeViewerToken', '_tok'
Set-Content -Path $linksPath -Value $lc -Encoding UTF8

# canvas.ts has a dynamic `await import('./supabase')` — fix to the new path.
$canvasPath = Join-Path $outDir 'canvas.ts'
$cc = Get-Content $canvasPath -Raw
$cc = $cc -replace "await import\('\./supabase'\)", "await import('../supabase')"
Set-Content -Path $canvasPath -Value $cc -Encoding UTF8

# Promote a few internals to exports so other domain files can import them.
$sharedPath = Join-Path $outDir '_shared.ts'
$sc = Get-Content $sharedPath -Raw
$sc = $sc -replace '(?m)^const _tokPfx ', 'export const _tokPfx '
$sc = $sc -replace '(?m)^async function _readSpotifyErr', 'export async function _readSpotifyErr'
$sc = $sc -replace '(?m)^function _writeResultFrom', 'export function _writeResultFrom'
Set-Content -Path $sharedPath -Value $sc -Encoding UTF8

# Write barrel.
$barrel = New-Object System.Text.StringBuilder
[void]$barrel.AppendLine('// Barrel: lib/spotify.ts re-exports the per-domain modules so existing')
[void]$barrel.AppendLine('// call sites (`import { foo } from "../lib/spotify"`) keep working.')
[void]$barrel.AppendLine("export * from './spotify/_shared';")
foreach ($dom in @('auth','player','tracks','playlists','artists','canvas','links')) {
    [void]$barrel.AppendLine("export * from './spotify/$dom';")
}
Set-Content -Path $src -Value $barrel.ToString().TrimEnd() -Encoding UTF8
Write-Host "Rewrote barrel: $src"
