/**
 * Pear's Gambit - Stockfish Wrapper Implementation
 * 
 * C++ wrapper for Stockfish engine integration
 */

#include "stockfish_wrapper.h"
#include "uci_interface.h"
#include <iostream>
#include <sstream>
#include <chrono>
#include <algorithm>
#include <regex>

// Constructor
StockfishWrapper::StockfishWrapper() {
    uci_ = std::make_unique<UCIInterface>();
}

// Destructor
StockfishWrapper::~StockfishWrapper() {
    Quit();
}

// Initialize engine
void StockfishWrapper::Initialize() {
    if (initialized_) {
        return;
    }
    
    try {
        // Initialize UCI interface
        uci_->Initialize();
        
        // Wait for UCI OK
        if (!uci_->SendCommand("uci")) {
            throw std::runtime_error("Failed to initialize UCI interface");
        }
        
        // Set default options
        SetOption("Hash", std::to_string(hash_size_));
        SetOption("Threads", std::to_string(threads_));
        
        if (skill_level_ < 20) {
            SetOption("Skill Level", std::to_string(skill_level_));
        }
        
        // Check if ready
        if (!uci_->SendCommand("isready")) {
            throw std::runtime_error("Engine not ready");
        }
        
        initialized_ = true;
        ready_ = true;
        
        // Start worker thread
        StartWorkerThread();
        
    } catch (const std::exception& e) {
        throw std::runtime_error("Failed to initialize Stockfish: " + std::string(e.what()));
    }
}

// Quit engine
void StockfishWrapper::Quit() {
    if (!initialized_) {
        return;
    }
    
    StopWorkerThread();
    
    if (uci_) {
        uci_->SendCommand("quit");
        uci_->Shutdown();
    }
    
    initialized_ = false;
    ready_ = false;
}

// Check if ready
bool StockfishWrapper::IsReady() {
    if (!initialized_) {
        return false;
    }
    
    return uci_->SendCommand("isready");
}

// Set engine option
void StockfishWrapper::SetOption(const std::string& name, const std::string& value) {
    if (!uci_) {
        throw std::runtime_error("Engine not initialized");
    }
    
    std::string command = "setoption name " + name + " value " + value;
    if (!uci_->SendCommand(command)) {
        throw std::runtime_error("Failed to set option: " + name);
    }
}

// Set info callback
void StockfishWrapper::SetInfoCallback(InfoCallback callback) {
    info_callback_ = callback;
}

// Set position from FEN
void StockfishWrapper::SetPosition(const std::string& fen) {
    if (!uci_) {
        throw std::runtime_error("Engine not initialized");
    }
    
    std::string command = "position fen " + fen;
    if (!uci_->SendCommand(command)) {
        throw std::runtime_error("Failed to set position");
    }
}

// Set position with moves
void StockfishWrapper::SetPosition(const std::string& fen, const std::vector<std::string>& moves) {
    if (!uci_) {
        throw std::runtime_error("Engine not initialized");
    }
    
    std::string command = "position fen " + fen;
    if (!moves.empty()) {
        command += " moves";
        for (const auto& move : moves) {
            command += " " + move;
        }
    }
    
    if (!uci_->SendCommand(command)) {
        throw std::runtime_error("Failed to set position with moves");
    }
}

// Set starting position
void StockfishWrapper::SetStartPosition(const std::vector<std::string>& moves) {
    if (!uci_) {
        throw std::runtime_error("Engine not initialized");
    }
    
    std::string command = "position startpos";
    if (!moves.empty()) {
        command += " moves";
        for (const auto& move : moves) {
            command += " " + move;
        }
    }
    
    if (!uci_->SendCommand(command)) {
        throw std::runtime_error("Failed to set starting position");
    }
}

// Start search
std::string StockfishWrapper::Go(const GoOptions& options) {
    if (!uci_) {
        throw std::runtime_error("Engine not initialized");
    }
    
    if (thinking_) {
        Stop();
    }
    
    std::string command = "go";
    
    if (options.depth > 0) {
        command += " depth " + std::to_string(options.depth);
    }
    if (options.movetime > 0) {
        command += " movetime " + std::to_string(options.movetime);
    }
    if (options.infinite) {
        command += " infinite";
    }
    if (options.wtime > 0) {
        command += " wtime " + std::to_string(options.wtime);
    }
    if (options.btime > 0) {
        command += " btime " + std::to_string(options.btime);
    }
    if (options.winc > 0) {
        command += " winc " + std::to_string(options.winc);
    }
    if (options.binc > 0) {
        command += " binc " + std::to_string(options.binc);
    }
    if (options.movestogo > 0) {
        command += " movestogo " + std::to_string(options.movestogo);
    }
    
    thinking_ = true;
    
    // Send command and wait for bestmove
    std::string response = uci_->SendCommandAndWait(command, "bestmove");
    
    thinking_ = false;
    
    // Parse bestmove response
    std::istringstream iss(response);
    std::string token;
    iss >> token; // "bestmove"
    iss >> token; // actual move
    
    return token;
}

// Analyze position
AnalysisResult StockfishWrapper::Analyze(const std::string& fen, int depth) {
    SetPosition(fen);
    
    // Reset analysis result
    std::lock_guard<std::mutex> lock(analysis_mutex_);
    current_analysis_ = AnalysisResult{};
    
    // Start analysis
    GoOptions options;
    options.depth = depth;
    
    std::string best_move = Go(options);
    
    // Return result
    current_analysis_.best_move = best_move;
    return current_analysis_;
}

// Stop search
void StockfishWrapper::Stop() {
    if (!uci_ || !thinking_) {
        return;
    }
    
    uci_->SendCommand("stop");
    thinking_ = false;
}

// Get evaluation
int StockfishWrapper::GetEvaluation() {
    std::lock_guard<std::mutex> lock(analysis_mutex_);
    return current_analysis_.evaluation;
}

// Check if in check
bool StockfishWrapper::IsInCheck() {
    // This would require position analysis
    // For now, return false (would need Stockfish position evaluation)
    return false;
}

// Check if game over
bool StockfishWrapper::IsGameOver() {
    // This would require position analysis
    // For now, return false (would need Stockfish position evaluation)
    return false;
}

// Get legal moves
std::vector<std::string> StockfishWrapper::GetLegalMoves() {
    // This would require position analysis
    // For now, return empty (would need Stockfish move generation)
    return {};
}

// Validate move
bool StockfishWrapper::IsValidMove(const std::string& move) {
    return MoveUtils::IsValidUCIMove(move);
}

// Get FEN
std::string StockfishWrapper::GetFEN() {
    // This would require position tracking
    // For now, return starting position
    return PositionUtils::GetStartingFEN();
}

// New game
void StockfishWrapper::NewGame() {
    if (uci_) {
        uci_->SendCommand("ucinewgame");
        SetStartPosition();
    }
}

// Start worker thread
void StockfishWrapper::StartWorkerThread() {
    if (worker_running_) {
        return;
    }
    
    worker_running_ = true;
    worker_thread_ = std::make_unique<std::thread>(&StockfishWrapper::WorkerLoop, this);
}

// Stop worker thread
void StockfishWrapper::StopWorkerThread() {
    if (!worker_running_ || !worker_thread_) {
        return;
    }
    
    worker_running_ = false;
    command_cv_.notify_all();
    
    if (worker_thread_->joinable()) {
        worker_thread_->join();
    }
    
    worker_thread_.reset();
}

// Worker thread loop
void StockfishWrapper::WorkerLoop() {
    while (worker_running_) {
        std::unique_lock<std::mutex> lock(command_mutex_);
        command_cv_.wait(lock, [this] { return !worker_running_ || !pending_command_.empty(); });
        
        if (!worker_running_) {
            break;
        }
        
        if (!pending_command_.empty()) {
            // Process command
            std::string command = pending_command_;
            pending_command_.clear();
            lock.unlock();
            
            // Send to engine (this would be implemented in UCI interface)
            // For now, just simulate
        }
    }
}

// Send command
void StockfishWrapper::SendCommand(const std::string& command) {
    std::lock_guard<std::mutex> lock(command_mutex_);
    pending_command_ = command;
    command_cv_.notify_one();
}

// Wait for response
std::string StockfishWrapper::WaitForResponse(const std::string& expected, int timeout_ms) {
    auto start = std::chrono::steady_clock::now();
    
    while (std::chrono::steady_clock::now() - start < std::chrono::milliseconds(timeout_ms)) {
        if (last_response_.find(expected) != std::string::npos) {
            return last_response_;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    
    throw std::runtime_error("Timeout waiting for: " + expected);
}

// Process info line
void StockfishWrapper::ProcessInfoLine(const std::string& line) {
    if (info_callback_) {
        info_callback_(line);
    }
    
    // Parse info for analysis
    std::lock_guard<std::mutex> lock(analysis_mutex_);
    
    std::istringstream iss(line);
    std::string token;
    
    while (iss >> token) {
        if (token == "depth") {
            iss >> current_analysis_.depth;
        } else if (token == "score") {
            iss >> token;
            if (token == "cp") {
                iss >> current_analysis_.evaluation;
            } else if (token == "mate") {
                iss >> current_analysis_.mate_in;
                current_analysis_.is_mate = true;
                current_analysis_.evaluation = current_analysis_.mate_in > 0 ? 10000 : -10000;
            }
        } else if (token == "nodes") {
            iss >> current_analysis_.nodes;
        } else if (token == "time") {
            iss >> current_analysis_.time_ms;
        } else if (token == "pv") {
            current_analysis_.pv.clear();
            std::string move;
            while (iss >> move) {
                current_analysis_.pv.push_back(move);
            }
        }
    }
}

// Move utility implementations
namespace MoveUtils {
    bool IsValidUCIMove(const std::string& move) {
        if (move.length() < 4 || move.length() > 5) {
            return false;
        }
        
        // Basic UCI move format: e2e4, e7e8q
        std::regex uci_pattern(R"([a-h][1-8][a-h][1-8][qrbn]?)");
        return std::regex_match(move, uci_pattern);
    }
    
    bool IsValidSANMove(const std::string& move) {
        // Basic SAN validation (simplified)
        if (move.empty()) {
            return false;
        }
        
        // Allow common SAN patterns
        std::regex san_pattern(R"([NBRQK]?[a-h]?[1-8]?[x]?[a-h][1-8][+#]?|O-O|O-O-O)");
        return std::regex_match(move, san_pattern);
    }
    
    std::string UCIToSAN(const std::string& uci_move, const std::string& fen) {
        // This would require a full chess position parser
        // For now, return UCI move
        return uci_move;
    }
    
    std::string SANToUCI(const std::string& san_move, const std::string& fen) {
        // This would require a full chess position parser
        // For now, return SAN move
        return san_move;
    }
}

// Position utility implementations
namespace PositionUtils {
    bool IsValidFEN(const std::string& fen) {
        // Basic FEN validation
        std::regex fen_pattern(R"([rnbqkpRNBQKP1-8/]+ [wb] [KQkq-]+ [a-h3-6-]+ \d+ \d+)");
        return std::regex_match(fen, fen_pattern);
    }
    
    std::string GetStartingFEN() {
        return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
    
    bool IsCheck(const std::string& fen) {
        // Would require position analysis
        return false;
    }
    
    bool IsCheckmate(const std::string& fen) {
        // Would require position analysis
        return false;
    }
    
    bool IsStalemate(const std::string& fen) {
        // Would require position analysis
        return false;
    }
    
    int GetPieceValue(char piece) {
        switch (std::tolower(piece)) {
            case 'p': return 100;
            case 'n': return 320;
            case 'b': return 330;
            case 'r': return 500;
            case 'q': return 900;
            case 'k': return 10000;
            default: return 0;
        }
    }
}