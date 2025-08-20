#pragma once

#include <string>
#include <vector>
#include <functional>
#include <memory>

namespace StockfishBinding {

struct SearchInfo {
    int depth = 0;
    int seldepth = 0;
    int64_t nodes = 0;
    int64_t nps = 0;
    int time_ms = 0;
    int score_cp = 0;
    bool is_mate = false;
    int mate_in = 0;
    std::vector<std::string> pv;  // Principal variation
    int multipv = 1;
    int hashfull = 0;
};

struct SearchResult {
    std::string best_move;
    std::string ponder_move;
    SearchInfo final_info;
    std::vector<SearchInfo> all_info;
};

class StockfishEngine {
public:
    StockfishEngine();
    ~StockfishEngine();

    // Engine control
    bool initialize();
    void shutdown();
    bool is_ready() const { return ready_; }

    // Position management
    bool set_position(const std::string& fen);
    bool set_position_with_moves(const std::string& fen, const std::vector<std::string>& moves);
    bool set_startpos_with_moves(const std::vector<std::string>& moves);

    // Search operations
    SearchResult search(int depth);
    SearchResult search_time(int time_ms);
    SearchResult search_nodes(int64_t nodes);
    void stop_search();

    // Engine options
    bool set_option(const std::string& name, const std::string& value);
    bool set_option(const std::string& name, int value);
    bool set_option(const std::string& name, bool value);

    // Evaluation
    int evaluate_current_position();
    
    // Move generation and validation
    std::vector<std::string> get_legal_moves();
    bool is_legal_move(const std::string& move);
    
    // Game state queries
    bool is_check();
    bool is_checkmate();
    bool is_stalemate();
    bool is_draw();
    
    // Callbacks for search info
    using InfoCallback = std::function<void(const SearchInfo&)>;
    void set_info_callback(InfoCallback callback);

private:
    class Impl;
    std::unique_ptr<Impl> impl_;
    bool ready_;
    InfoCallback info_callback_;
    
    void on_search_info(const SearchInfo& info);
};

// Utility functions
namespace Utils {
    std::string move_to_uci(const std::string& from, const std::string& to, const std::string& promotion = "");
    bool parse_uci_move(const std::string& uci, std::string& from, std::string& to, std::string& promotion);
    std::string fen_after_move(const std::string& fen, const std::string& move);
    bool is_valid_fen(const std::string& fen);
}

} // namespace StockfishBinding