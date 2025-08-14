/**
 * Pear's Gambit - UCI Interface Implementation
 * 
 * Low-level UCI protocol communication
 */

#include "uci_interface.h"
#include <iostream>
#include <sstream>
#include <chrono>
#include <thread>

// Constructor
UCIInterface::UCIInterface() : process_(nullptr), running_(false) {}

// Destructor
UCIInterface::~UCIInterface() {
    Shutdown();
}

// Initialize UCI interface
void UCIInterface::Initialize() {
    if (running_) {
        return;
    }
    
    // For native binding, we don't spawn a process
    // Instead, we would integrate directly with Stockfish source
    // This is a simplified implementation
    
    running_ = true;
    
    // Start reader thread
    reader_thread_ = std::thread(&UCIInterface::ReaderLoop, this);
}

// Shutdown interface
void UCIInterface::Shutdown() {
    if (!running_) {
        return;
    }
    
    running_ = false;
    
    // Signal shutdown
    if (reader_thread_.joinable()) {
        reader_thread_.join();
    }
    
    // Clean up process if any
    if (process_) {
        // Terminate process
        process_ = nullptr;
    }
}

// Send command to engine
bool UCIInterface::SendCommand(const std::string& command) {
    if (!running_) {
        return false;
    }
    
    // In a real implementation, this would send to Stockfish
    // For now, simulate common responses
    SimulateResponse(command);
    
    return true;
}

// Send command and wait for response
std::string UCIInterface::SendCommandAndWait(const std::string& command, const std::string& expected) {
    if (!SendCommand(command)) {
        return "";
    }
    
    return WaitForResponse(expected);
}

// Wait for specific response
std::string UCIInterface::WaitForResponse(const std::string& expected, int timeout_ms) {
    auto start = std::chrono::steady_clock::now();
    
    while (std::chrono::steady_clock::now() - start < std::chrono::milliseconds(timeout_ms)) {
        std::lock_guard<std::mutex> lock(response_mutex_);
        
        for (const auto& response : recent_responses_) {
            if (response.find(expected) != std::string::npos) {
                return response;
            }
        }
        
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    
    throw std::runtime_error("Timeout waiting for: " + expected);
}

// Set response callback
void UCIInterface::SetResponseCallback(ResponseCallback callback) {
    response_callback_ = callback;
}

// Reader thread loop
void UCIInterface::ReaderLoop() {
    while (running_) {
        // In a real implementation, this would read from Stockfish process
        // For now, just sleep
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
}

// Process response from engine
void UCIInterface::ProcessResponse(const std::string& response) {
    {
        std::lock_guard<std::mutex> lock(response_mutex_);
        recent_responses_.push_back(response);
        
        // Keep only recent responses
        if (recent_responses_.size() > 100) {
            recent_responses_.erase(recent_responses_.begin());
        }
    }
    
    // Call callback if set
    if (response_callback_) {
        response_callback_(response);
    }
}

// Simulate engine responses (for development)
void UCIInterface::SimulateResponse(const std::string& command) {
    std::string response;
    
    if (command == "uci") {
        response = "id name Stockfish 16\n";
        response += "id author The Stockfish developers\n";
        response += "option name Hash type spin default 16 min 1 max 33554432\n";
        response += "option name Threads type spin default 1 min 1 max 1024\n";
        response += "option name Skill Level type spin default 20 min 0 max 20\n";
        response += "uciok";
    } else if (command == "isready") {
        response = "readyok";
    } else if (command == "ucinewgame") {
        response = ""; // No response expected
    } else if (command.starts_with("position")) {
        response = ""; // No response expected
    } else if (command.starts_with("go")) {
        // Simulate analysis
        response = "info depth 1 score cp 20 nodes 100 pv e2e4\n";
        response += "info depth 5 score cp 25 nodes 5000 pv e2e4 e7e5\n";
        response += "info depth 10 score cp 30 nodes 50000 pv e2e4 e7e5 g1f3\n";
        response += "bestmove e2e4 ponder e7e5";
    } else if (command == "stop") {
        response = "bestmove (none)";
    } else if (command == "quit") {
        running_ = false;
        return;
    }
    
    if (!response.empty()) {
        // Simulate async response
        std::thread([this, response]() {
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            
            std::istringstream iss(response);
            std::string line;
            while (std::getline(iss, line)) {
                ProcessResponse(line);
            }
        }).detach();
    }
}