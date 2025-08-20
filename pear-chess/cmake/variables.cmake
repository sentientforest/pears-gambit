# CMake Variables Configuration for Pear Chess Stockfish Integration
# This file defines build configuration variables and platform detection

# Stockfish configuration
set(STOCKFISH_VERSION "sf_17.1" CACHE STRING "Stockfish version")
set(STOCKFISH_SOURCE_DIR "${CMAKE_SOURCE_DIR}/deps/stockfish/source" CACHE PATH "Stockfish source directory")
set(STOCKFISH_BINARY_DIR "${CMAKE_SOURCE_DIR}/deps/stockfish/builds" CACHE PATH "Stockfish build directory")
set(PREBUILD_DIR "${CMAKE_SOURCE_DIR}/prebuilds" CACHE PATH "Prebuild output directory")

# Build configuration
set(CMAKE_BUILD_TYPE "Release" CACHE STRING "Build type")
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Platform detection and configuration
if(CMAKE_SYSTEM_NAME STREQUAL "Linux")
    if(CMAKE_SYSTEM_PROCESSOR STREQUAL "x86_64")
        set(TARGET_PLATFORM "linux-x64")
        set(STOCKFISH_ARCH "x86-64-sse41-popcnt")
    elseif(CMAKE_SYSTEM_PROCESSOR STREQUAL "aarch64")
        set(TARGET_PLATFORM "linux-arm64")
        set(STOCKFISH_ARCH "armv8")
    else()
        message(WARNING "Unsupported Linux architecture: ${CMAKE_SYSTEM_PROCESSOR}")
        set(TARGET_PLATFORM "linux-x64")  # Fallback
        set(STOCKFISH_ARCH "x86-64-sse41-popcnt")
    endif()
    
    # Linux-specific compiler flags
    set(PLATFORM_CXX_FLAGS "-pthread")
    set(PLATFORM_LINKER_FLAGS "-pthread")
    
elseif(CMAKE_SYSTEM_NAME STREQUAL "Darwin")
    if(CMAKE_SYSTEM_PROCESSOR STREQUAL "x86_64")
        set(TARGET_PLATFORM "darwin-x64")
        set(STOCKFISH_ARCH "x86-64-sse41-popcnt")
    elseif(CMAKE_SYSTEM_PROCESSOR STREQUAL "arm64")
        set(TARGET_PLATFORM "darwin-arm64")
        set(STOCKFISH_ARCH "apple-silicon")
    else()
        message(WARNING "Unsupported macOS architecture: ${CMAKE_SYSTEM_PROCESSOR}")
        set(TARGET_PLATFORM "darwin-x64")  # Fallback
        set(STOCKFISH_ARCH "x86-64-sse41-popcnt")
    endif()
    
    # macOS-specific compiler flags
    set(PLATFORM_CXX_FLAGS "-stdlib=libc++")
    set(PLATFORM_LINKER_FLAGS "-stdlib=libc++")
    
elseif(CMAKE_SYSTEM_NAME STREQUAL "Windows")
    set(TARGET_PLATFORM "win32-x64")
    set(STOCKFISH_ARCH "x86-64-sse41-popcnt")
    
    # Windows-specific compiler flags
    set(PLATFORM_CXX_FLAGS "/O2 /GL")
    set(PLATFORM_LINKER_FLAGS "/LTCG")
    
else()
    message(FATAL_ERROR "Unsupported platform: ${CMAKE_SYSTEM_NAME}")
endif()

# Output configuration
set(NATIVE_MODULE_OUTPUT_DIR "${PREBUILD_DIR}/${TARGET_PLATFORM}")
set(STOCKFISH_BUILD_OUTPUT_DIR "${STOCKFISH_BINARY_DIR}/${TARGET_PLATFORM}")

# Create output directories
file(MAKE_DIRECTORY "${NATIVE_MODULE_OUTPUT_DIR}")
file(MAKE_DIRECTORY "${STOCKFISH_BUILD_OUTPUT_DIR}")

# Compiler configuration
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Release optimization flags
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${PLATFORM_CXX_FLAGS}")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${PLATFORM_LINKER_FLAGS}")
    set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} ${PLATFORM_LINKER_FLAGS}")
endif()

# Debug configuration
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -O0")
    add_definitions(-DDEBUG)
endif()

# Display configuration
message(STATUS "===== Pear Chess Build Configuration =====")
message(STATUS "Target Platform: ${TARGET_PLATFORM}")
message(STATUS "Stockfish Architecture: ${STOCKFISH_ARCH}")
message(STATUS "Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Output Directory: ${NATIVE_MODULE_OUTPUT_DIR}")
message(STATUS "Stockfish Source: ${STOCKFISH_SOURCE_DIR}")
message(STATUS "Stockfish Build: ${STOCKFISH_BUILD_OUTPUT_DIR}")
message(STATUS "==========================================")

# Export variables for use in other CMake files
set(TARGET_PLATFORM "${TARGET_PLATFORM}" PARENT_SCOPE)
set(STOCKFISH_ARCH "${STOCKFISH_ARCH}" PARENT_SCOPE)
set(NATIVE_MODULE_OUTPUT_DIR "${NATIVE_MODULE_OUTPUT_DIR}" PARENT_SCOPE)
set(STOCKFISH_BUILD_OUTPUT_DIR "${STOCKFISH_BUILD_OUTPUT_DIR}" PARENT_SCOPE)