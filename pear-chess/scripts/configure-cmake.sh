#!/bin/bash

# CMake Configuration Script for Pear Chess Stockfish Integration
# This script ensures consistent CMake configuration from the project root

echo "🔧 Configuring CMake for Pear Chess Stockfish Integration"

# Ensure we're in the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📁 Project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Verify directory structure
if [ ! -d "deps/stockfish/source/src" ]; then
    echo "❌ Stockfish source not found at deps/stockfish/source/src"
    echo "   Run scripts/download-stockfish-source.sh first"
    exit 1
fi

# Count source files to verify
SOURCE_COUNT=$(find deps/stockfish/source/src -name "*.cpp" | wc -l)
echo "📋 Found $SOURCE_COUNT Stockfish source files"

if [ "$SOURCE_COUNT" -lt 20 ]; then
    echo "❌ Insufficient source files found"
    exit 1
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf build/release

# Configure CMake with standardized parameters
echo "⚙️  Configuring CMake..."
cmake -B build/release -S . \
    -DCMAKE_BUILD_TYPE=Release \
    -Wno-dev

if [ $? -eq 0 ]; then
    echo "✅ CMake configuration successful!"
    echo ""
    echo "📊 Build Information:"
    echo "  Build directory: build/release"
    echo "  Build type: Release"  
    echo "  Stockfish source: deps/stockfish/source/src"
    echo "  Output directory: prebuilds/linux-x64"
    echo ""
    echo "🚀 Next steps:"
    echo "  cmake --build build/release --target build_native_binding"
    echo "  cmake --build build/release --target test_native_binding"
else
    echo "❌ CMake configuration failed!"
    exit 1
fi