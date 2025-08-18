#!/bin/bash

echo "🔄 Downloading Stockfish source code..."

cd deps/stockfish/source

# Download and extract in separate steps to avoid timeout issues
echo "📥 Downloading..."
wget -q https://github.com/official-stockfish/Stockfish/archive/refs/tags/sf_17.1.tar.gz -O stockfish.tar.gz

if [ $? -eq 0 ]; then
    echo "📦 Extracting..."
    tar -xzf stockfish.tar.gz --strip-components=1
    rm stockfish.tar.gz
    
    if [ -f "src/main.cpp" ]; then
        echo "✅ Stockfish source downloaded successfully"
        echo "📋 Source files found: $(find src -name "*.cpp" | wc -l) cpp files"
        echo "📋 Header files found: $(find src -name "*.h" | wc -l) h files"
        exit 0
    else
        echo "❌ Source extraction failed"
        exit 1
    fi
else
    echo "❌ Download failed"
    exit 1
fi