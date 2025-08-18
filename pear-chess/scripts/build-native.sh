#!/bin/bash

# Native Binding Build Script for Pear Chess Stockfish Integration
# This script builds the native Stockfish binding

echo "🚀 Building Pear Chess Native Stockfish Binding"

# Ensure we're in the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📁 Project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Check if CMake is configured
if [ ! -d "build/release" ]; then
    echo "⚠️  CMake not configured. Running configuration..."
    ./scripts/configure-cmake.sh
    if [ $? -ne 0 ]; then
        echo "❌ CMake configuration failed!"
        exit 1
    fi
fi

# Build the native binding
echo "🔨 Building native binding..."
cmake --build build/release --target build_native_binding

if [ $? -eq 0 ]; then
    echo "✅ Native binding build successful!"
    
    # Check if binary was created
    if [ -f "prebuilds/linux-x64/libstockfish_binding.so" ]; then
        echo "📦 Binary created: prebuilds/linux-x64/libstockfish_binding.so"
        echo "📊 Binary size: $(du -h prebuilds/linux-x64/libstockfish_binding.so | cut -f1)"
    else
        echo "⚠️  Binary not found at expected location"
    fi
    
    echo ""
    echo "🧪 To test the binding:"
    echo "  ./scripts/test-native-binding.sh"
    echo "  cmake --build build/release --target test_native_binding"
else
    echo "❌ Native binding build failed!"
    exit 1
fi