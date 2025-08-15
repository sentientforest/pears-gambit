# Pear Chess Stockfish Integration - Environment Setup (PowerShell)
# Run this script to set up CMake and build environment variables on Windows

param(
    [switch]$Permanent = $false  # Set to true to make changes permanent
)

# Get the script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "🔧 Setting up Pear Chess build environment..." -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray

# Environment variables
$EnvVars = @{
    'CMAKE_BUILD_TYPE' = 'Release'
    'CMAKE_TOOLCHAIN_FILE' = "$ProjectRoot\cmake\toolchain.cmake"
    'STOCKFISH_VERSION' = 'sf_17.1'
    'STOCKFISH_SOURCE_DIR' = "$ProjectRoot\deps\stockfish\source"
    'STOCKFISH_BINARY_DIR' = "$ProjectRoot\deps\stockfish\builds"
    'PREBUILD_DIR' = "$ProjectRoot\prebuilds"
    'TARGET_PLATFORM' = 'win32-x64'
    'BUILD_DIR' = "$ProjectRoot\build"
    'BUILD_DEBUG_DIR' = "$ProjectRoot\build\debug"
    'BUILD_RELEASE_DIR' = "$ProjectRoot\build\release"
    'BUILD_TEMP_DIR' = "$ProjectRoot\build\temp"
}

# Set environment variables
foreach ($var in $EnvVars.GetEnumerator()) {
    if ($Permanent) {
        [Environment]::SetEnvironmentVariable($var.Key, $var.Value, 'User')
        Write-Host "  ✅ Set permanent: $($var.Key) = $($var.Value)" -ForegroundColor Green
    } else {
        Set-Item -Path "env:$($var.Key)" -Value $var.Value
        Write-Host "  ✅ Set session: $($var.Key) = $($var.Value)" -ForegroundColor Yellow
    }
}

# Add scripts to PATH
$ScriptsPath = "$ProjectRoot\scripts"
$CurrentPath = $env:PATH
if ($CurrentPath -notlike "*$ScriptsPath*") {
    if ($Permanent) {
        $UserPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
        [Environment]::SetEnvironmentVariable('PATH', "$UserPath;$ScriptsPath", 'User')
        Write-Host "  ✅ Added to permanent PATH: $ScriptsPath" -ForegroundColor Green
    } else {
        $env:PATH = "$CurrentPath;$ScriptsPath"
        Write-Host "  ✅ Added to session PATH: $ScriptsPath" -ForegroundColor Yellow
    }
}

# Display configuration
Write-Host "`n📋 Environment Configuration:" -ForegroundColor Cyan
foreach ($var in $EnvVars.GetEnumerator()) {
    Write-Host "  $($var.Key): $($var.Value)" -ForegroundColor Gray
}

# Create PowerShell functions (aliases)
function cmake-configure {
    cmake -B "$env:BUILD_RELEASE_DIR" -S "$ProjectRoot" -DCMAKE_BUILD_TYPE=Release
}

function cmake-configure-debug {
    cmake -B "$env:BUILD_DEBUG_DIR" -S "$ProjectRoot" -DCMAKE_BUILD_TYPE=Debug
}

function cmake-build {
    cmake --build "$env:BUILD_RELEASE_DIR" --config Release
}

function cmake-build-debug {
    cmake --build "$env:BUILD_DEBUG_DIR" --config Debug
}

function cmake-clean {
    if (Test-Path "$env:BUILD_DIR") {
        Remove-Item "$env:BUILD_DIR" -Recurse -Force
        Write-Host "🧹 Cleaned build directory" -ForegroundColor Green
    }
}

function stockfish-setup {
    node "$ProjectRoot\scripts\setup-deps.js"
}

function stockfish-setup-all {
    node "$ProjectRoot\scripts\setup-deps.js" all
}

function stockfish-list {
    node "$ProjectRoot\scripts\setup-deps.js" list
}

function stockfish-verify {
    node "$ProjectRoot\scripts\setup-deps.js" verify
}

Write-Host "`n🚀 Environment ready! Available functions:" -ForegroundColor Green
Write-Host "  cmake-configure     - Configure CMake for Release build" -ForegroundColor White
Write-Host "  cmake-configure-debug - Configure CMake for Debug build" -ForegroundColor White
Write-Host "  cmake-build         - Build Release configuration" -ForegroundColor White
Write-Host "  cmake-build-debug   - Build Debug configuration" -ForegroundColor White
Write-Host "  cmake-clean         - Clean build directory" -ForegroundColor White
Write-Host "  stockfish-setup     - Download Stockfish for current platform" -ForegroundColor White
Write-Host "  stockfish-setup-all - Download Stockfish for all platforms" -ForegroundColor White
Write-Host "  stockfish-list      - List available Stockfish binaries" -ForegroundColor White
Write-Host "  stockfish-verify    - Verify Stockfish binary" -ForegroundColor White

Write-Host "`n💡 To get started:" -ForegroundColor Cyan
Write-Host "  1. stockfish-setup      # Download Stockfish" -ForegroundColor White
Write-Host "  2. cmake-configure      # Configure build" -ForegroundColor White  
Write-Host "  3. cmake-build          # Build native modules" -ForegroundColor White

if (-not $Permanent) {
    Write-Host "`n⚠️  Note: Environment variables are set for this session only." -ForegroundColor Yellow
    Write-Host "   Run with -Permanent switch to make changes permanent." -ForegroundColor Yellow
}