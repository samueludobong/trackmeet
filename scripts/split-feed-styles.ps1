# Splits lib/feed/styles.ts. The big `styles` export is split by section
# comments into per-section sub-files; the original `styles` export becomes a
# merged object so all 30+ call sites keep working unchanged.

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$src  = Join-Path $root 'lib\feed\styles.ts'
$outDir = Join-Path $root 'lib\feed\styles'

if (-not (Test-Path $src)) { throw "Source not found: $src" }
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

$lines = Get-Content $src

# Section 1: locate the three exports.
$exportMatches = $lines | Select-String -Pattern '^export const (\w+) = StyleSheet\.create'
$stylesIdx = ($exportMatches | Where-Object { $_.Matches[0].Groups[1].Value -eq 'styles' }).LineNumber - 1
$headerEnd = ($exportMatches[0].LineNumber - 1) - 1

# Header (imports).
$header = ($lines[0..$headerEnd] -join "`n").TrimEnd()

# Two small exports above `styles` keep their original form, dumped into misc.ts.
$miscStart = $exportMatches[0].LineNumber - 1
$miscEnd   = $stylesIdx - 1
$miscBody  = ($lines[$miscStart..$miscEnd] -join "`n").TrimEnd()

# Find the end of the `styles` StyleSheet.create — the matching `});`.
$stylesEnd = $null
for ($i = $stylesIdx + 1; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\}\);?\s*$') { $stylesEnd = $i; break }
}
if ($null -eq $stylesEnd) { throw 'Could not find end of styles StyleSheet.create' }

# Inner content (between `styles = StyleSheet.create({` and `});`).
$inner = $lines[($stylesIdx + 1)..($stylesEnd - 1)]

# Slugify a comment to a filename + ts identifier.
function Slug($comment) {
    $s = $comment -replace '^//\s*', '' -replace '[─━]+', '' -replace '[^a-zA-Z0-9 ]', '' -replace '\s+', ' '
    $s = $s.Trim().ToLower()
    $parts = $s -split ' '
    # camelCase
    $first, $rest = $parts[0], ($parts | Select-Object -Skip 1)
    $cap = $rest | ForEach-Object { if ($_.Length -gt 0) { $_.Substring(0,1).ToUpper() + $_.Substring(1) } }
    return ($first + ($cap -join ''))
}

# Walk inner, partition by leading `// ...` section comments.
$sections = @()
$current = $null
foreach ($l in $inner) {
    if ($l -match '^\s*//\s*\S') {
        # New section comment — start a new bucket. If we had a current one with content, push it.
        if ($null -ne $current -and $current.Lines.Count -gt 0) { $sections += $current }
        $current = [PSCustomObject]@{ Slug = (Slug $l); Comment = $l.Trim(); Lines = New-Object System.Collections.Generic.List[string] }
        continue
    }
    if ($null -eq $current) {
        # Lines before any comment go in an "intro" bucket.
        $current = [PSCustomObject]@{ Slug = 'intro'; Comment = '// Intro / container'; Lines = New-Object System.Collections.Generic.List[string] }
    }
    $current.Lines.Add($l)
}
if ($null -ne $current -and $current.Lines.Count -gt 0) { $sections += $current }

# Deduplicate slugs.
$seen = @{}
foreach ($s in $sections) {
    if ($seen.ContainsKey($s.Slug)) {
        $seen[$s.Slug] += 1
        $s.Slug = "$($s.Slug)$($seen[$s.Slug])"
    } else { $seen[$s.Slug] = 1 }
}

# Write each section as its own file exporting a StyleSheet.create.
foreach ($s in $sections) {
    $body = New-Object System.Text.StringBuilder
    [void]$body.AppendLine($header)
    [void]$body.AppendLine()
    [void]$body.AppendLine($s.Comment)
    [void]$body.AppendLine("export const $($s.Slug) = StyleSheet.create({")
    foreach ($l in $s.Lines) { [void]$body.AppendLine($l.TrimEnd()) }
    [void]$body.AppendLine('});')
    $path = Join-Path $outDir ("$($s.Slug).ts")
    Set-Content -Path $path -Value $body.ToString().TrimEnd() -Encoding UTF8
}

# Write a misc file for the two non-`styles` exports (moreOptionsStyles, profileSStyles).
$miscPath = Join-Path $outDir 'misc.ts'
$miscContent = "$header`n`n$miscBody"
Set-Content -Path $miscPath -Value $miscContent -Encoding UTF8

# Rewrite lib/feed/styles.ts as a merger.
$barrel = New-Object System.Text.StringBuilder
[void]$barrel.AppendLine('// Composed feed stylesheet. Each section lives in ./styles/<section>.ts')
[void]$barrel.AppendLine('// and is merged here so callers keep using `styles.X` unchanged.')
[void]$barrel.AppendLine("export { moreOptionsStyles, profileSStyles } from './styles/misc';")
foreach ($s in $sections) {
    [void]$barrel.AppendLine("import { $($s.Slug) } from './styles/$($s.Slug)';")
}
[void]$barrel.AppendLine()
[void]$barrel.AppendLine('export const styles = {')
foreach ($s in $sections) {
    [void]$barrel.AppendLine("  ...$($s.Slug),")
}
[void]$barrel.AppendLine('} as const;')
Set-Content -Path $src -Value $barrel.ToString().TrimEnd() -Encoding UTF8
Write-Host "Wrote $($sections.Count) section files + misc.ts; barrel rewritten."
