# Generates square app icon + web favicons from the wide Taplo logo.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path $root "public\taplo-logo-full-color-original.png"
$brandingDir = Join-Path $root "branding"
$publicDir = Join-Path $root "public"

New-Item -ItemType Directory -Force -Path $brandingDir | Out-Null

function New-SquareIcon([int]$size) {
  $logo = [System.Drawing.Image]::FromFile($logoPath)
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.Clear([System.Drawing.Color]::FromArgb(243, 245, 248))

  $maxWidth = [int]($size * 0.86)
  $scale = $maxWidth / $logo.Width
  $drawHeight = [int]($logo.Height * $scale)
  $x = [int](($size - $maxWidth) / 2)
  $y = [int](($size - $drawHeight) / 2)
  $graphics.DrawImage($logo, $x, $y, $maxWidth, $drawHeight)

  $logo.Dispose()
  $graphics.Dispose()
  return $bmp
}

function Save-Png([System.Drawing.Bitmap]$bmp, [string]$path) {
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Save-Ico([System.Drawing.Bitmap]$source, [string]$path) {
  $iconHandle = $source.GetHicon()
  try {
    $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
    $stream = New-Object System.IO.FileStream($path, [System.IO.FileMode]::Create)
    $icon.Save($stream)
    $stream.Close()
    $icon.Dispose()
  } finally {
    $source.Dispose()
  }
}

$icon1024 = New-SquareIcon 1024
Save-Png $icon1024 (Join-Path $brandingDir "icon.png")

$icon180 = New-SquareIcon 180
Save-Png $icon180 (Join-Path $publicDir "apple-touch-icon.png")
$icon180.Dispose()

$icon32 = New-SquareIcon 32
Save-Ico $icon32 (Join-Path $publicDir "favicon.ico")

$icon1024.Dispose()

Write-Host "Generated branding/icon.png, public/favicon.ico, public/apple-touch-icon.png"
