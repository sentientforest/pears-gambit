#!/bin/bash

# Pear Chess Stockfish Integration - Environment Setup
# Source this file to set up CMake and build environment variables

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔧 Setting up Pear Chess build environment..."
echo "Project root: $PROJECT_ROOT"

# CMake configuration
export CMAKE_BUILD_TYPE=Release
export CMAKE_TOOLCHAIN_FILE="$PROJECT_ROOT/cmake/toolchain.cmake"

# Stockfish configuration  
export STOCKFISH_VERSION=sf_17.1
export STOCKFISH_SOURCE_DIR="$PROJECT_ROOT/deps/stockfish/source"
export STOCKFISH_BINARY_DIR="$PROJECT_ROOT/deps/stockfish/builds"

# Native module configuration
export PREBUILD_DIR="$PROJECT_ROOT/prebuilds"

# Detect platform for TARGET_PLATFORM
case "$(uname -s)" in
    Linux*)
        case "$(uname -m)" in
            x86_64)
                export TARGET_PLATFORM="linux-x64"
                ;;
            aarch64|arm64)
                export TARGET_PLATFORM="linux-arm64"
                ;;
            *)
                echo "⚠️  Unsupported Linux architecture: $(uname -m), defaulting to linux-x64"
                export TARGET_PLATFORM="linux-x64"
                ;;
        esac
        ;;
    Darwin*)
        case "$(uname -m)" in
            x86_64)
                export TARGET_PLATFORM="darwin-x64"
                ;;
            arm64)
                export TARGET_PLATFORM="darwin-arm64"
                ;;
            *)
                echo "⚠️  Unsupported macOS architecture: $(uname -m), defaulting to darwin-x64"
                export TARGET_PLATFORM="darwin-x64"
                ;;
        esac
        ;;
    MINGW*|MSYS*|CYGWIN*)
        export TARGET_PLATFORM="win32-x64"
        ;;
    *)
        echo "⚠️  Unsupported platform: $(uname -s), defaulting to linux-x64"
        export TARGET_PLATFORM="linux-x64"
        ;;
esac

# Build directories
export BUILD_DIR="$PROJECT_ROOT/build"
export BUILD_DEBUG_DIR="$BUILD_DIR/debug"
export BUILD_RELEASE_DIR="$BUILD_DIR/release"
export BUILD_TEMP_DIR="$BUILD_DIR/temp"

# Add project scripts to PATH for convenience
export PATH="$PROJECT_ROOT/scripts:$PATH"

# Display configuration
echo "📋 Environment Configuration:"
echo "  CMAKE_BUILD_TYPE: $CMAKE_BUILD_TYPE"
echo "  TARGET_PLATFORM: $TARGET_PLATFORM"
echo "  STOCKFISH_VERSION: $STOCKFISH_VERSION"
echo "  PREBUILD_DIR: $PREBUILD_DIR"
echo "  BUILD_DIR: $BUILD_DIR"

# Helpful aliases
alias cmake-configure='cmake -B "$BUILD_RELEASE_DIR" -S "$PROJECT_ROOT" -DCMAKE_BUILD_TYPE=Release'
alias cmake-configure-debug='cmake -B "$BUILD_DEBUG_DIR" -S "$PROJECT_ROOT" -DCMAKE_BUILD_TYPE=Debug'
alias cmake-build='cmake --build "$BUILD_RELEASE_DIR" --config Release'
alias cmake-build-debug='cmake --build "$BUILD_DEBUG_DIR" --config Debug'
alias cmake-clean='rm -rf "$BUILD_DIR"'

alias stockfish-setup='node "$PROJECT_ROOT/scripts/setup-deps.js"'
alias stockfish-setup-all='node "$PROJECT_ROOT/scripts/setup-deps.js" all'
alias stockfish-list='node "$PROJECT_ROOT/scripts/setup-deps.js" list'
alias stockfish-verify='node "$PROJECT_ROOT/scripts/setup-deps.js" verify'

echo "🚀 Environment ready! Available aliases:"
echo "  cmake-configure     - Configure CMake for Release build"
echo "  cmake-configure-debug - Configure CMake for Debug build"
echo "  cmake-build         - Build Release configuration"
echo "  cmake-build-debug   - Build Debug configuration"
echo "  cmake-clean         - Clean build directory"
echo "  stockfish-setup     - Download Stockfish for current platform"
echo "  stockfish-setup-all - Download Stockfish for all platforms"
echo "  stockfish-list      - List available Stockfish binaries"
echo "  stockfish-verify    - Verify Stockfish binary"
echo ""
echo "💡 To get started:"
echo "  1. stockfish-setup      # Download Stockfish"
echo "  2. cmake-configure      # Configure build"
echo "  3. cmake-build          # Build native modules"