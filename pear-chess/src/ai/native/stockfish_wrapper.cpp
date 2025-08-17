#include "stockfish_wrapper.h"
#include <iostream>
#include <sstream>
#include <algorithm>

namespace StockfishBinding {

// Simple stub implementation for initial testing
class StockfishEngine::Impl {
public:
    bool initialize() {
        std::cout << "StockfishEngine::Impl::initialize() - stub implementation" << std::endl;
        return true;
    }
    
    void shutdown() {
        std::cout << "StockfishEngine::Impl::shutdown() - stub implementation" << std::endl;
    }
    
    bool set_position(const std::string& fen) {
        std::cout << "Setting position to: " << fen << std::endl;
        current_fen_ = fen;
        return true;
    }
    
    SearchResult search(int depth) {
        std::cout << "Searching to depth " << depth << std::endl;
        
        SearchResult result;
        result.best_move = "e2e4";  // Stub best move
        result.ponder_move = "e7e5";
        
        result.final_info.depth = depth;
        result.final_info.nodes = 1000 * depth;
        result.final_info.nps = 100000;
        result.final_info.time_ms = depth * 10;
        result.final_info.score_cp = 25;
        result.final_info.pv = {"e2e4", "e7e5", "g1f3"};
        
        return result;
    }
    
    int evaluate_current_position() {
        return 25; // Stub evaluation
    }
    
    std::vector<std::string> get_legal_moves() {
        return {"e2e4", "d2d4", "g1f3", "b1c3"}; // Stub moves
    }
    
private:
    std::string current_fen_;
};

StockfishEngine::StockfishEngine() 
    : impl_(std::make_unique<Impl>()), ready_(false) {
}

StockfishEngine::~StockfishEngine() {
    if (ready_) {
        shutdown();
    }
}

bool StockfishEngine::initialize() {
    ready_ = impl_->initialize();
    return ready_;
}

void StockfishEngine::shutdown() {
    if (ready_) {
        impl_->shutdown();
        ready_ = false;
    }
}

bool StockfishEngine::set_position(const std::string& fen) {
    return impl_->set_position(fen);
}

bool StockfishEngine::set_position_with_moves(const std::string& fen, const std::vector<std::string>& moves) {
    if (!impl_->set_position(fen)) {
        return false;
    }
    // TODO: Apply moves
    return true;
}

bool StockfishEngine::set_startpos_with_moves(const std::vector<std::string>& moves) {
    return set_position_with_moves("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", moves);
}

SearchResult StockfishEngine::search(int depth) {
    return impl_->search(depth);
}

SearchResult StockfishEngine::search_time(int time_ms) {
    // For stub, just use depth based on time
    int depth = std::max(1, time_ms / 100);
    return search(depth);
}

SearchResult StockfishEngine::search_nodes(int64_t nodes) {
    // For stub, just use depth based on nodes
    int depth = std::max(1, static_cast<int>(nodes / 1000));
    return search(depth);
}

void StockfishEngine::stop_search() {
    // TODO: Implement search stopping
}

bool StockfishEngine::set_option(const std::string& name, const std::string& value) {
    std::cout << "Setting option " << name << " = " << value << std::endl;
    return true;
}

bool StockfishEngine::set_option(const std::string& name, int value) {
    return set_option(name, std::to_string(value));
}

bool StockfishEngine::set_option(const std::string& name, bool value) {
    return set_option(name, value ? "true" : "false");
}

int StockfishEngine::evaluate_current_position() {
    return impl_->evaluate_current_position();
}

std::vector<std::string> StockfishEngine::get_legal_moves() {
    return impl_->get_legal_moves();
}

bool StockfishEngine::is_legal_move(const std::string& move) {
    auto moves = get_legal_moves();
    return std::find(moves.begin(), moves.end(), move) != moves.end();
}

bool StockfishEngine::is_check() {
    return false; // Stub
}

bool StockfishEngine::is_checkmate() {
    return false; // Stub
}

bool StockfishEngine::is_stalemate() {
    return false; // Stub
}

bool StockfishEngine::is_draw() {
    return false; // Stub
}

void StockfishEngine::set_info_callback(InfoCallback callback) {
    info_callback_ = callback;
}

void StockfishEngine::on_search_info(const SearchInfo& info) {
    if (info_callback_) {
        info_callback_(info);
    }
}

// Utility functions
namespace Utils {
    std::string move_to_uci(const std::string& from, const std::string& to, const std::string& promotion) {
        return from + to + promotion;
    }
    
    bool parse_uci_move(const std::string& uci, std::string& from, std::string& to, std::string& promotion) {
        if (uci.length() < 4) return false;
        
        from = uci.substr(0, 2);
        to = uci.substr(2, 2);
        promotion = uci.length() > 4 ? uci.substr(4) : "";
        
        return true;
    }
    
    std::string fen_after_move(const std::string& fen, const std::string& move) {
        // Stub implementation
        return fen;
    }
    
    bool is_valid_fen(const std::string& fen) {
        // Basic validation
        return fen.find(' ') != std::string::npos;
    }
}

} // namespace StockfishBinding