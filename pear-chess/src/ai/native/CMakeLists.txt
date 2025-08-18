# Native Stockfish Binding for Pear Chess
cmake_minimum_required(VERSION 3.16)

# Check if we're building as part of bare runtime or standalone
set(BUILDING_FOR_BARE FALSE)

# Try to find bare runtime dependencies
find_package(cmake-bare QUIET PATHS ${CMAKE_SOURCE_DIR}/node_modules/cmake-bare)
find_package(cmake-harden QUIET PATHS ${CMAKE_SOURCE_DIR}/node_modules/cmake-harden)

if(cmake-bare_FOUND AND cmake-harden_FOUND)
    set(BUILDING_FOR_BARE TRUE)
    message(STATUS "Building native binding for Bare runtime")
else()
    message(STATUS "Building native binding as standalone library")
endif()

# Source files for the binding
set(BINDING_SOURCES
    stockfish_wrapper.cpp
    binding.cpp
)

if(BUILDING_FOR_BARE)
    # Build as Bare module
    add_bare_module(stockfish_binding)
    harden(stockfish_binding)
    
    target_sources(stockfish_binding PRIVATE ${BINDING_SOURCES})
    
    # Link with Stockfish
    target_link_libraries(stockfish_binding PRIVATE ${STOCKFISH_LIBRARIES})
    target_include_directories(stockfish_binding PRIVATE ${STOCKFISH_INCLUDE_DIR})
    
    # Set output directory
    set_target_properties(stockfish_binding PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY ${NATIVE_MODULE_OUTPUT_DIR}
        RUNTIME_OUTPUT_DIRECTORY ${NATIVE_MODULE_OUTPUT_DIR}
    )
    
else()
    # Build as standalone shared library for testing
    add_library(stockfish_binding SHARED ${BINDING_SOURCES})
    
    # Link with Stockfish
    target_link_libraries(stockfish_binding PRIVATE ${STOCKFISH_LIBRARIES})
    target_include_directories(stockfish_binding PRIVATE ${STOCKFISH_INCLUDE_DIR})
    
    # Set properties
    set_target_properties(stockfish_binding PROPERTIES
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
        POSITION_INDEPENDENT_CODE ON
        OUTPUT_NAME "stockfish_binding"
        LIBRARY_OUTPUT_DIRECTORY ${NATIVE_MODULE_OUTPUT_DIR}
        RUNTIME_OUTPUT_DIRECTORY ${NATIVE_MODULE_OUTPUT_DIR}
    )
    
    # Add a simple test executable
    add_executable(test_binding test_binding.cpp)
    target_link_libraries(test_binding stockfish_binding ${STOCKFISH_LIBRARIES})
    target_include_directories(test_binding PRIVATE ${STOCKFISH_INCLUDE_DIR})
    
    set_target_properties(test_binding PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/test
    )
endif()

# Common properties
target_compile_definitions(stockfish_binding PRIVATE
    BUILDING_STOCKFISH_BINDING
    BUILDING_WITH_REAL_STOCKFISH
)

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_definitions(stockfish_binding PRIVATE DEBUG_BINDING)
endif()

message(STATUS "Native binding configuration:")
message(STATUS "  Building for Bare: ${BUILDING_FOR_BARE}")
message(STATUS "  Output directory: ${NATIVE_MODULE_OUTPUT_DIR}")
message(STATUS "  Stockfish include: ${STOCKFISH_INCLUDE_DIR}")

# Add custom target for easy building
add_custom_target(build_native_binding
    DEPENDS stockfish_binding
    COMMENT "Building native Stockfish binding"
)

if(NOT BUILDING_FOR_BARE)
    add_custom_target(test_native_binding
        DEPENDS test_binding
        COMMAND $<TARGET_FILE:test_binding>
        COMMENT "Testing native Stockfish binding"
    )
endif()