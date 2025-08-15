cmake_minimum_required(VERSION 3.16)

project(pear-chess-stockfish C CXX)

# Set the default build type to Release
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Include our configuration files
include(cmake/variables.cmake)

# Display build information
message(STATUS "===== Pear Chess CMake Configuration =====")
message(STATUS "Project: ${PROJECT_NAME}")
message(STATUS "Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Target Platform: ${TARGET_PLATFORM}")
message(STATUS "CMake Version: ${CMAKE_VERSION}")
message(STATUS "C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "Output Directory: ${NATIVE_MODULE_OUTPUT_DIR}")
message(STATUS "==========================================")

# For now, we'll create a simple test target to verify CMake is working
# The actual native binding will be implemented in the next phase

add_custom_target(test_cmake_config
    COMMAND ${CMAKE_COMMAND} -E echo "CMake configuration test successful"
    COMMAND ${CMAKE_COMMAND} -E echo "Platform: ${TARGET_PLATFORM}"
    COMMAND ${CMAKE_COMMAND} -E echo "Build type: ${CMAKE_BUILD_TYPE}"
    COMMAND ${CMAKE_COMMAND} -E echo "Output directory: ${NATIVE_MODULE_OUTPUT_DIR}"
    COMMENT "Testing CMake configuration"
)

# Create a simple test executable to verify compiler works
add_executable(cmake_test_exe
    EXCLUDE_FROM_ALL
    test/cmake_test.cpp
)

# Test that we can find required packages
find_package(Threads REQUIRED)
target_link_libraries(cmake_test_exe Threads::Threads)

# Set properties for the test executable
set_target_properties(cmake_test_exe PROPERTIES
    CXX_STANDARD ${CMAKE_CXX_STANDARD}
    CXX_STANDARD_REQUIRED ON
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/test
)

# Add a test target that builds and runs the test
add_custom_target(test_cmake_build
    DEPENDS cmake_test_exe
    COMMAND ${CMAKE_COMMAND} -E echo "CMake build test successful"
    COMMAND $<TARGET_FILE:cmake_test_exe>
    COMMENT "Testing CMake build and execution"
)

# Create output directories
file(MAKE_DIRECTORY ${NATIVE_MODULE_OUTPUT_DIR})
file(MAKE_DIRECTORY ${STOCKFISH_BUILD_OUTPUT_DIR})

message(STATUS "CMake configuration complete. Available targets:")
message(STATUS "  test_cmake_config - Test configuration")
message(STATUS "  test_cmake_build  - Test build and execution")
message(STATUS "  cmake_test_exe    - Test executable")

# Future: Add Stockfish port configuration here
# include(cmake/stockfish.cmake)

# Future: Add native binding subdirectory here  
# add_subdirectory(src/ai/native)