# CMake Toolchain Configuration for Pear Chess
# Provides cross-compilation support and compiler configuration

# Include platform variables
include("${CMAKE_CURRENT_LIST_DIR}/variables.cmake")

# Set the target system
if(TARGET_PLATFORM MATCHES "linux-")
    set(CMAKE_SYSTEM_NAME Linux)
elseif(TARGET_PLATFORM MATCHES "darwin-")
    set(CMAKE_SYSTEM_NAME Darwin)
elseif(TARGET_PLATFORM MATCHES "win32-")
    set(CMAKE_SYSTEM_NAME Windows)
endif()

# Architecture mapping
if(TARGET_PLATFORM MATCHES "-x64")
    set(CMAKE_SYSTEM_PROCESSOR x86_64)
elseif(TARGET_PLATFORM MATCHES "-arm64")
    if(CMAKE_SYSTEM_NAME STREQUAL "Darwin")
        set(CMAKE_SYSTEM_PROCESSOR arm64)
    else()
        set(CMAKE_SYSTEM_PROCESSOR aarch64)
    endif()
endif()

# Compiler detection and configuration
if(CMAKE_SYSTEM_NAME STREQUAL "Linux")
    # Prefer GCC on Linux for Stockfish compatibility
    find_program(CMAKE_C_COMPILER gcc)
    find_program(CMAKE_CXX_COMPILER g++)
    
    if(NOT CMAKE_C_COMPILER OR NOT CMAKE_CXX_COMPILER)
        # Fallback to clang
        find_program(CMAKE_C_COMPILER clang)
        find_program(CMAKE_CXX_COMPILER clang++)
    endif()
    
elseif(CMAKE_SYSTEM_NAME STREQUAL "Darwin")
    # Use clang on macOS
    find_program(CMAKE_C_COMPILER clang)
    find_program(CMAKE_CXX_COMPILER clang++)
    
elseif(CMAKE_SYSTEM_NAME STREQUAL "Windows")
    # Use MSVC on Windows
    set(CMAKE_GENERATOR_PLATFORM x64)
endif()

# Stockfish-specific optimization flags
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    if(CMAKE_SYSTEM_NAME STREQUAL "Linux" OR CMAKE_SYSTEM_NAME STREQUAL "Darwin")
        # GCC/Clang optimization flags for Stockfish
        set(STOCKFISH_CXX_FLAGS 
            "-O3 -flto -DNDEBUG -march=native -mtune=native"
        )
        
        # Additional flags for different architectures
        if(STOCKFISH_ARCH STREQUAL "x86-64-modern")
            list(APPEND STOCKFISH_CXX_FLAGS "-msse -msse2 -mpopcnt")
        elseif(STOCKFISH_ARCH STREQUAL "apple-silicon")
            list(APPEND STOCKFISH_CXX_FLAGS "-mcpu=apple-m1")
        endif()
        
    elseif(CMAKE_SYSTEM_NAME STREQUAL "Windows")
        # MSVC optimization flags
        set(STOCKFISH_CXX_FLAGS 
            "/O2 /Ob2 /DNDEBUG /GL /arch:AVX2"
        )
    endif()
    
    # Join flags into a single string
    string(REPLACE ";" " " STOCKFISH_CXX_FLAGS_STR "${STOCKFISH_CXX_FLAGS}")
    set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} ${STOCKFISH_CXX_FLAGS_STR}")
endif()

# Link-time optimization configuration
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    set(CMAKE_INTERPROCEDURAL_OPTIMIZATION ON)
    
    # Platform-specific LTO flags
    if(CMAKE_SYSTEM_NAME STREQUAL "Linux" OR CMAKE_SYSTEM_NAME STREQUAL "Darwin")
        set(CMAKE_EXE_LINKER_FLAGS_RELEASE "${CMAKE_EXE_LINKER_FLAGS_RELEASE} -flto")
        set(CMAKE_SHARED_LINKER_FLAGS_RELEASE "${CMAKE_SHARED_LINKER_FLAGS_RELEASE} -flto")
    endif()
endif()

# Runtime library configuration
if(CMAKE_SYSTEM_NAME STREQUAL "Windows")
    # Use static runtime on Windows to avoid DLL dependencies
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()

# Find required packages and tools
find_package(Threads REQUIRED)

# Export toolchain information
message(STATUS "===== Toolchain Configuration =====")
message(STATUS "System: ${CMAKE_SYSTEM_NAME} ${CMAKE_SYSTEM_PROCESSOR}")
message(STATUS "C Compiler: ${CMAKE_C_COMPILER}")
message(STATUS "CXX Compiler: ${CMAKE_CXX_COMPILER}")
message(STATUS "Build Type: ${CMAKE_BUILD_TYPE}")
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    message(STATUS "Stockfish Flags: ${STOCKFISH_CXX_FLAGS_STR}")
endif()
message(STATUS "=====================================")