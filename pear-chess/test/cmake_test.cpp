#include <iostream>
#include <thread>
#include <chrono>

int main() {
    std::cout << "=== CMake Build Test ===" << std::endl;
    std::cout << "C++ Standard: " << __cplusplus << std::endl;
    std::cout << "Thread support: ";
    
    try {
        auto thread_count = std::thread::hardware_concurrency();
        std::cout << "✅ Available (" << thread_count << " cores)" << std::endl;
    } catch (...) {
        std::cout << "❌ Not available" << std::endl;
        return 1;
    }
    
    std::cout << "Compiler test: ";
    
    // Test some C++17 features
    auto test_lambda = [](const auto& value) {
        return value * 2;
    };
    
    auto result = test_lambda(42);
    if (result == 84) {
        std::cout << "✅ C++17 features working" << std::endl;
    } else {
        std::cout << "❌ C++17 features not working" << std::endl;
        return 1;
    }
    
    std::cout << "Threading test: ";
    
    bool thread_test_passed = false;
    std::thread test_thread([&thread_test_passed]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
        thread_test_passed = true;
    });
    
    test_thread.join();
    
    if (thread_test_passed) {
        std::cout << "✅ Threading working" << std::endl;
    } else {
        std::cout << "❌ Threading not working" << std::endl;
        return 1;
    }
    
    std::cout << "🎉 All tests passed!" << std::endl;
    return 0;
}