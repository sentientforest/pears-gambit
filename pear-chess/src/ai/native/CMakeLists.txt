# CMakeLists.txt for Stockfish Native Binding
# Based on bare-ffmpeg pattern for Pear Runtime

cmake_minimum_required(VERSION 3.16)

# Project configuration
project(pear-chess-stockfish LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Platform detection
if(WIN32)
  set(BARE_PLATFORM "win32")
elseif(APPLE)
  set(BARE_PLATFORM "darwin")
else()
  set(BARE_PLATFORM "linux")
endif()

# Architecture detection
if(CMAKE_SYSTEM_PROCESSOR MATCHES "x86_64|AMD64")
  set(BARE_ARCH "x64")
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "aarch64|arm64")
  set(BARE_ARCH "arm64")
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "arm")
  set(BARE_ARCH "arm")
else()
  message(FATAL_ERROR "Unsupported architecture: ${CMAKE_SYSTEM_PROCESSOR}")
endif()

# Build configuration
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
  set(BARE_BUILD_TYPE "debug")
else()
  set(BARE_BUILD_TYPE "release")
endif()

# Output directory
set(BARE_OUTPUT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../prebuilds/${BARE_PLATFORM}-${BARE_ARCH}")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${BARE_OUTPUT_DIR}")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${BARE_OUTPUT_DIR}")

# Compiler flags
if(MSVC)
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /W3")
else()
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -O3 -DNDEBUG")
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -flto -march=native")
endif()

# Find required packages
find_package(PkgConfig QUIET)

# Try to find system Stockfish first
find_path(STOCKFISH_INCLUDE_DIR
  NAMES stockfish.h uci.h
  PATHS
    /usr/include/stockfish
    /usr/local/include/stockfish
    /opt/homebrew/include/stockfish
    ${CMAKE_CURRENT_SOURCE_DIR}/stockfish/src
)

find_library(STOCKFISH_LIBRARY
  NAMES stockfish libstockfish.a
  PATHS
    /usr/lib
    /usr/local/lib
    /opt/homebrew/lib
    ${CMAKE_CURRENT_SOURCE_DIR}/stockfish/src
)

# If system Stockfish not found, build from source
if(NOT STOCKFISH_INCLUDE_DIR OR NOT STOCKFISH_LIBRARY)
  message(STATUS "System Stockfish not found, will build from source")
  
  # Include ExternalProject module
  include(ExternalProject)
  
  # Download and build Stockfish
  ExternalProject_Add(
    stockfish-external
    GIT_REPOSITORY https://github.com/official-stockfish/Stockfish.git
    GIT_TAG sf_16
    SOURCE_DIR ${CMAKE_CURRENT_BINARY_DIR}/stockfish-src
    CONFIGURE_COMMAND ""
    BUILD_COMMAND make -C <SOURCE_DIR>/src build ARCH=x86-64-modern
    INSTALL_COMMAND ""
    BUILD_IN_SOURCE 1
  )
  
  set(STOCKFISH_INCLUDE_DIR ${CMAKE_CURRENT_BINARY_DIR}/stockfish-src/src)
  set(STOCKFISH_LIBRARY ${CMAKE_CURRENT_BINARY_DIR}/stockfish-src/src/stockfish)
  set(STOCKFISH_BUILT_FROM_SOURCE TRUE)
endif()

# Include directories
include_directories(${STOCKFISH_INCLUDE_DIR})

# Source files
set(SOURCES
  binding.cpp
  stockfish_wrapper.cpp
  uci_interface.cpp
)

# Create shared library
add_library(${PROJECT_NAME} SHARED ${SOURCES})

# Set target properties
set_target_properties(${PROJECT_NAME} PROPERTIES
  PREFIX ""
  OUTPUT_NAME "stockfish"
  SUFFIX ".node"
)

# Link libraries
if(STOCKFISH_BUILT_FROM_SOURCE)
  add_dependencies(${PROJECT_NAME} stockfish-external)
  target_link_libraries(${PROJECT_NAME} PRIVATE ${STOCKFISH_LIBRARY})
else()
  target_link_libraries(${PROJECT_NAME} PRIVATE ${STOCKFISH_LIBRARY})
endif()

# Platform-specific settings
if(WIN32)
  target_compile_definitions(${PROJECT_NAME} PRIVATE WIN32_LEAN_AND_MEAN)
  target_link_libraries(${PROJECT_NAME} PRIVATE ws2_32)
elseif(APPLE)
  set_target_properties(${PROJECT_NAME} PROPERTIES
    MACOSX_RPATH ON
    INSTALL_NAME_DIR "@rpath"
  )
else()
  target_link_libraries(${PROJECT_NAME} PRIVATE pthread)
endif()

# Install rules
install(TARGETS ${PROJECT_NAME}
  DESTINATION ${BARE_OUTPUT_DIR}
)

# Custom target for cleaning prebuilds
add_custom_target(clean-prebuilds
  COMMAND ${CMAKE_COMMAND} -E remove_directory ${CMAKE_CURRENT_SOURCE_DIR}/../../../prebuilds
  COMMENT "Cleaning prebuilds directory"
)

# Print configuration summary
message(STATUS "=== Pear Chess Stockfish Native Binding Configuration ===")
message(STATUS "Platform: ${BARE_PLATFORM}")
message(STATUS "Architecture: ${BARE_ARCH}")
message(STATUS "Build Type: ${BARE_BUILD_TYPE}")
message(STATUS "Output Directory: ${BARE_OUTPUT_DIR}")
message(STATUS "Stockfish Include: ${STOCKFISH_INCLUDE_DIR}")
message(STATUS "Stockfish Library: ${STOCKFISH_LIBRARY}")
if(STOCKFISH_BUILT_FROM_SOURCE)
  message(STATUS "Stockfish: Building from source")
else()
  message(STATUS "Stockfish: Using system installation")
endif()
message(STATUS "=========================================================")