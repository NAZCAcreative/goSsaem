Add-Type -AssemblyName System.Drawing
$sourcePath = 'C:\Users\nazca\.gemini\antigravity\brain\8e6cb9fd-652f-4069-8a45-5aa7125a70a0\.user_uploaded\media_1794322078392_8a42402b.jpg'
$destDir = 'D:\aiProject\goSsaem\public\img\teacher'

$src = [System.Drawing.Bitmap]::FromFile($sourcePath)

function CropAndSave($x, $y, $w, $h, $name) {
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $cropped = $src.Clone($rect, $src.PixelFormat)
    $destFile = Join-Path $destDir $name
    $cropped.Save($destFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Host "Saved $name ($w x $h)"
}

# 1. Flawless tutor hero (from X=405, Y=48, W=525, H=382)
CropAndSave 405 48 525 382 'teacher-hero-tutor.png'

# 2. Complete bottom banner card (from X=20, Y=818, W=895, H=165)
CropAndSave 20 818 895 165 'teacher-bottom-banner-card.png'

# 3. Clean Logo (from X=40, Y=8, W=150, H=36)
CropAndSave 40 8 150 36 'teacher-logo.png'

# 4. Sparks
CropAndSave 285 64 30 25 'spark-orange.png'
CropAndSave 36 615 30 30 'spark-orange-left.png'
CropAndSave 890 848 30 30 'spark-orange-banner.png'

$src.Dispose()
Write-Host "All assets perfected!"
