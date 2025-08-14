# Updated Stockfish Integration Plan - August 14, 2025

## Current State Assessment

### ✅ What We Have Completed

**Framework Architecture (80% Complete)**:
- [x] Complete AI module structure in `src/ai/`
- [x] UCI protocol implementations (`uci-simple.js`, `uci-protocol.js`)
- [x] External engine framework (`external-engine-simple.js`)
- [x] Native binding architecture (`src/ai/native/` with CMake setup)
- [x] Opening book database (fully functional)
- [x] Game analysis framework
- [x] AI vs AI game framework  
- [x] Performance benchmarking framework
- [x] Stub system for Pear Runtime compatibility
- [x] Application compatibility fixes (no crashes)

**Technical Infrastructure**:
- [x] CMakeLists.txt for native bindings (following bare-ffmpeg pattern)
- [x] C++ binding structure (binding.cpp, stockfish_wrapper.cpp)
- [x] JavaScript interface layer (index.js)
- [x] Package configuration (package.json)

### ❌ What We Still Need

**Core Functionality (Missing)**:
- [ ] **Actual Stockfish binary integration** - No working engine
- [ ] **Build system testing** - CMake system unverified
- [ ] **External process testing** - Requires system Stockfish
- [ ] **Native binding compilation** - Not built or tested
- [ ] **Full integration testing** - No end-to-end verification
- [ ] **UI integration** - Analysis panels not connected

**Infrastructure Gaps**:
- [ ] **Stockfish binary management** - No download/storage system
- [ ] **Build artifact organization** - No working directories
- [ ] **Git ignore for builds** - Missing build artifact exclusions
- [ ] **Environment variable setup** - No CMake/linking vars
- [ ] **CI/CD integration** - No automated builds

---

## Revised Implementation Strategy

### Phase 1: Binary and Build Infrastructure (Week 1)
**Goal**: Establish working build environment and binary management

### Phase 2: External Process Integration (Week 2) 
**Goal**: Get first working Stockfish integration

### Phase 3: Native Binding Implementation (Weeks 3-4)
**Goal**: High-performance native integration  

### Phase 4: UI Integration and Testing (Week 5)
**Goal**: Complete user-facing features

---

## Phase 1: Infrastructure Setup

### 1.1 Directory Structure and Build Management

**Create Working Directories**:
```
pear-chess/
├── build/                  # CMake build artifacts (git ignored)
│   ├── debug/             # Debug builds
│   ├── release/           # Release builds
│   └── temp/              # Temporary build files
├── deps/                  # External dependencies (git ignored)
│   ├── stockfish/         # Stockfish source/binaries
│   │   ├── source/        # Stockfish source code
│   │   ├── binaries/      # Downloaded binaries
│   │   └── builds/        # Compiled binaries
│   └── cmake-tools/       # CMake dependencies
├── prebuilds/             # Compiled native modules (git ignored)
│   ├── linux-x64/
│   ├── linux-arm64/
│   ├── darwin-x64/
│   ├── darwin-arm64/
│   └── win32-x64/
└── scripts/               # Build and setup scripts
    ├── setup-deps.js     # Download dependencies
    ├── build-native.js   # Build native modules
    └── test-integration.js # Integration tests
```

**Update .gitignore**:
```gitignore
# Existing entries
test-p2p-storage
chess-games
chess-games-state
pear-chess-storage-*

# Build artifacts
build/
deps/
prebuilds/
*.node
*.so
*.dylib
*.dll

# CMake artifacts
CMakeCache.txt
CMakeFiles/
cmake_install.cmake
compile_commands.json

# Stockfish binaries and builds
stockfish
stockfish.exe
stockfish-*

# Temporary files
*.tmp
*.log
.DS_Store
Thumbs.db
```

### 1.2 Stockfish Binary Management

**Binary Storage Strategy**:
- **Location**: `deps/stockfish/binaries/`
- **Organization**: By platform and version
- **Download**: Automated script for official releases
- **Fallback**: System Stockfish detection

**Implementation**:
```javascript
// scripts/setup-deps.js
import { download } from './download-utils.js'
import { detectPlatform } from './platform-utils.js'

export class StockfishBinaryManager {
  constructor() {
    this.baseUrl = 'https://github.com/official-stockfish/Stockfish/releases/download'
    this.version = 'sf_17.1'
    this.basePath = './deps/stockfish/binaries'
  }

  async ensureBinaries() {
    const platform = detectPlatform()
    const binaryPath = this.getBinaryPath(platform)
    
    if (!await this.exists(binaryPath)) {
      await this.downloadBinary(platform)
    }
    
    return binaryPath
  }

  getBinaryPath(platform) {
    const binaries = {
      'linux-x64': 'stockfish-ubuntu-x86-64-modern',
      'linux-arm64': 'stockfish-ubuntu-x86-64-modern', // Fallback
      'darwin-x64': 'stockfish-macos-x86-64-modern',
      'darwin-arm64': 'stockfish-macos-m1-apple-silicon',
      'win32-x64': 'stockfish-windows-x86-64-modern.exe'
    }
    
    return `${this.basePath}/${platform}/${binaries[platform]}`
  }

  async downloadBinary(platform) {
    // Implementation for downloading official Stockfish binaries
  }
}
```

### 1.3 CMake Environment Setup

**Environment Variables Needed**:
```bash
# CMake configuration
export CMAKE_BUILD_TYPE=Release
export CMAKE_TOOLCHAIN_FILE=cmake/toolchain.cmake

# Stockfish configuration  
export STOCKFISH_VERSION=sf_17.1
export STOCKFISH_SOURCE_DIR=./deps/stockfish/source
export STOCKFISH_BINARY_DIR=./deps/stockfish/builds

# Native module configuration
export PREBUILD_DIR=./prebuilds
export TARGET_PLATFORM=linux-x64  # Or current platform
```

**CMake Variables Configuration**:
```cmake
# cmake/variables.cmake
set(STOCKFISH_VERSION "sf_17.1" CACHE STRING "Stockfish version")
set(STOCKFISH_SOURCE_DIR "${CMAKE_SOURCE_DIR}/deps/stockfish/source" CACHE PATH "Stockfish source directory")
set(STOCKFISH_BINARY_DIR "${CMAKE_SOURCE_DIR}/deps/stockfish/builds" CACHE PATH "Stockfish build directory")
set(PREBUILD_DIR "${CMAKE_SOURCE_DIR}/prebuilds" CACHE PATH "Prebuild output directory")

# Platform detection
if(CMAKE_SYSTEM_NAME STREQUAL "Linux")
    if(CMAKE_SYSTEM_PROCESSOR STREQUAL "x86_64")
        set(TARGET_PLATFORM "linux-x64")
    elseif(CMAKE_SYSTEM_PROCESSOR STREQUAL "aarch64")
        set(TARGET_PLATFORM "linux-arm64")
    endif()
elseif(CMAKE_SYSTEM_NAME STREQUAL "Darwin")
    if(CMAKE_SYSTEM_PROCESSOR STREQUAL "x86_64")
        set(TARGET_PLATFORM "darwin-x64")
    elseif(CMAKE_SYSTEM_PROCESSOR STREQUAL "arm64")
        set(TARGET_PLATFORM "darwin-arm64")
    endif()
elseif(CMAKE_SYSTEM_NAME STREQUAL "Windows")
    set(TARGET_PLATFORM "win32-x64")
endif()
```

---

## Phase 2: External Process Integration 

### 2.1 Priority Implementation

**Focus**: Get external process mode working first before native bindings

**Steps**:
1. **Test external-engine-simple.js in Node.js environment**
2. **Download system Stockfish or use binary manager**
3. **Verify UCI protocol communication** 
4. **Test position analysis and move generation**
5. **Integrate with game interface**

**Testing Strategy**:
```javascript
// scripts/test-external.js
import { StockfishBinaryManager } from './setup-deps.js'
import { SimpleStockfishEngine } from '../src/ai/external-engine-simple.js'

export async function testExternalEngine() {
  // 1. Ensure binary availability
  const binaryManager = new StockfishBinaryManager()
  const binaryPath = await binaryManager.ensureBinaries()
  
  // 2. Test engine initialization
  const engine = new SimpleStockfishEngine({ 
    binaryPath,
    debug: true 
  })
  
  await engine.start()
  
  // 3. Test position analysis
  const analysis = await engine.analyze(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    { depth: 15 }
  )
  
  console.log('Analysis result:', analysis)
  
  await engine.quit()
}
```

### 2.2 Node.js vs Pear Runtime Strategy

**Dual Support Approach**:
- **Development/Testing**: Node.js with external process
- **Production**: Pear Runtime with native bindings (future)
- **Fallback**: Stub implementations (current)

---

## Phase 3: Native Binding Implementation

### 3.1 CMake Build System Completion

**Update existing CMakeLists.txt**:
```cmake
# Root CMakeLists.txt updates needed
cmake_minimum_required(VERSION 3.16)

project(pear-chess-stockfish)

# Include our variables and platform detection
include(cmake/variables.cmake)

# Download and build Stockfish if needed
include(cmake/stockfish.cmake)

# Add our binding
add_subdirectory(src/ai/native)

# Set output directory to prebuilds
set_target_properties(stockfish-binding PROPERTIES
    LIBRARY_OUTPUT_DIRECTORY "${PREBUILD_DIR}/${TARGET_PLATFORM}"
    RUNTIME_OUTPUT_DIRECTORY "${PREBUILD_DIR}/${TARGET_PLATFORM}"
)
```

### 3.2 Build Script Integration

**Create automated build process**:
```javascript
// scripts/build-native.js
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function buildNative() {
  // 1. Setup dependencies
  await execAsync('node scripts/setup-deps.js')
  
  // 2. Configure CMake
  await execAsync('cmake -B build -S . -DCMAKE_BUILD_TYPE=Release')
  
  // 3. Build
  await execAsync('cmake --build build --config Release')
  
  // 4. Test
  await execAsync('node scripts/test-native.js')
}
```

---

## Phase 4: Integration and Testing

### 4.1 UI Integration Points

**Connect analysis panel to working engines**:
```javascript
// Update src/ui/components/analysis-panel.js
import { AI } from '../../ai/index.js'

// Replace stub calls with real AI when available
if (AI.getStatus().stockfishReady) {
  // Use real analysis
  const analysis = await AI.analyzePosition(fen)
} else {
  // Use stub or show "AI unavailable"
  this.showAIUnavailable()
}
```

### 4.2 Testing Strategy

**Integration Test Suite**:
1. **Binary availability tests**
2. **External engine communication tests**  
3. **Native binding compilation tests**
4. **Performance benchmark tests**
5. **UI integration tests**
6. **Cross-platform compatibility tests**

---

## Prerequisites Summary

### Immediate Actions Needed

1. **Create working directories** (`build/`, `deps/`, `prebuilds/`)
2. **Update .gitignore** for build artifacts
3. **Implement binary download system** for Stockfish
4. **Set up CMake environment variables**
5. **Test external engine in Node.js environment**
6. **Verify CMake build system works**

### System Requirements

**For External Process Mode**:
- Node.js environment (for testing)
- System Stockfish binary OR downloaded binaries
- Basic process spawning capabilities

**For Native Binding Mode**:
- CMake 3.16+
- C++ compiler (GCC 7+, Clang 5+, MSVC 2019+)
- Stockfish source code
- cmake-bare, cmake-harden dependencies

### Success Criteria

**Phase 1 Complete**: Build environment ready, binaries available
**Phase 2 Complete**: External engine analyzing positions
**Phase 3 Complete**: Native bindings compiled and working  
**Phase 4 Complete**: UI showing real chess analysis

---

## Next Steps

1. **Create directory structure and setup scripts**
2. **Test external engine in Node.js with system/downloaded Stockfish**
3. **Verify and fix CMake build system**
4. **Complete full integration testing**

This updated plan focuses on getting working functionality quickly while building toward the full native integration goal.