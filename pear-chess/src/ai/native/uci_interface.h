/**
 * Pear's Gambit - UCI Interface Header
 * 
 * Low-level UCI protocol communication
 */

#pragma once

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <thread>
#include <mutex>
#include <atomic>

// Forward declarations for process handling
struct Process;

// Response callback type
using ResponseCallback = std::function<void(const std::string&)>;

/**
 * UCI Interface for communication with chess engines
 * Handles low-level UCI protocol communication
 */
class UCIInterface {
public:
    UCIInterface();
    ~UCIInterface();
    
    // Lifecycle
    void Initialize();
    void Shutdown();
    
    // Communication
    bool SendCommand(const std::string& command);
    std::string SendCommandAndWait(const std::string& command, const std::string& expected);
    std::string WaitForResponse(const std::string& expected, int timeout_ms = 5000);
    
    // Callbacks
    void SetResponseCallback(ResponseCallback callback);
    
    // Status
    bool IsRunning() const { return running_; }

private:
    // Internal methods
    void ReaderLoop();
    void ProcessResponse(const std::string& response);
    void SimulateResponse(const std::string& command); // For development
    
    // State
    std::unique_ptr<Process> process_;
    std::atomic<bool> running_;
    
    // Threading
    std::thread reader_thread_;
    std::mutex response_mutex_;
    std::vector<std::string> recent_responses_;
    
    // Callbacks
    ResponseCallback response_callback_;
};