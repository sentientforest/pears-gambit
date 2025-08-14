/**
 * Pear's Gambit - Stockfish Wrapper Header
 * 
 * C++ wrapper for Stockfish engine integration
 */

#pragma once

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <atomic>
#include <thread>
#include <mutex>
#include <condition_variable>

// Forward declarations
class UCI;
class Position;
class Search;

// Analysis result structure
struct AnalysisResult {
    std::string best_move;
    std::vector<std::string> pv;
    int depth = 0;
    int evaluation = 0; // In centipawns
    uint64_t nodes = 0;
    int time_ms = 0;
    bool is_mate = false;
    int mate_in = 0;
};

// Go command options
struct GoOptions {
    int depth = 0;
    int movetime = 0;
    bool infinite = false;
    int wtime = 0;
    int btime = 0;
    int winc = 0;
    int binc = 0;
    int movestogo = 0;
};

// Engine info callback
using InfoCallback = std::function<void(const std::string&)>;

/**
 * High-level wrapper for Stockfish engine
 */
class StockfishWrapper {
public:
    StockfishWrapper();
    ~StockfishWrapper();
    
    // Core engine operations
    void Initialize();
    void Quit();
    bool IsReady();
    
    // Configuration
    void SetOption(const std::string& name, const std::string& value);
    void SetInfoCallback(InfoCallback callback);
    
    // Position setup
    void SetPosition(const std::string& fen);
    void SetPosition(const std::string& fen, const std::vector<std::string>& moves);
    void SetStartPosition(const std::vector<std::string>& moves = {});
    
    // Search operations
    std::string Go(const GoOptions& options = {});
    AnalysisResult Analyze(const std::string& fen, int depth = 20);
    void Stop();
    
    // Evaluation
    int GetEvaluation();
    bool IsInCheck();
    bool IsGameOver();
    std::vector<std::string> GetLegalMoves();
    
    // Utility
    bool IsValidMove(const std::string& move);
    std::string GetFEN();
    void NewGame();

private:
    // Internal methods
    void InitializeEngine();
    void SendCommand(const std::string& command);
    std::string WaitForResponse(const std::string& expected, int timeout_ms = 5000);
    void ProcessInfoLine(const std::string& line);
    
    // Thread management
    void StartWorkerThread();
    void StopWorkerThread();
    void WorkerLoop();
    
    // State
    std::unique_ptr<UCI> uci_;
    std::unique_ptr<Position> position_;
    std::atomic<bool> initialized_{false};
    std::atomic<bool> ready_{false};
    std::atomic<bool> thinking_{false};
    
    // Threading
    std::unique_ptr<std::thread> worker_thread_;
    std::atomic<bool> worker_running_{false};
    std::mutex command_mutex_;
    std::condition_variable command_cv_;
    std::string pending_command_;
    std::string last_response_;
    
    // Analysis state
    AnalysisResult current_analysis_;
    InfoCallback info_callback_;
    std::mutex analysis_mutex_;
    
    // Options
    int hash_size_ = 256;
    int threads_ = 1;
    int skill_level_ = 20;
};

/**
 * Utility functions for move conversion and validation
 */
namespace MoveUtils {
    std::string UCIToSAN(const std::string& uci_move, const std::string& fen);
    std::string SANToUCI(const std::string& san_move, const std::string& fen);
    bool IsValidUCIMove(const std::string& move);
    bool IsValidSANMove(const std::string& move);
}

/**
 * Chess position utilities
 */
namespace PositionUtils {
    bool IsValidFEN(const std::string& fen);
    std::string GetStartingFEN();
    bool IsCheck(const std::string& fen);
    bool IsCheckmate(const std::string& fen);
    bool IsStalemate(const std::string& fen);
    int GetPieceValue(char piece);
}