#include "stockfish_wrapper.h"
#include <iostream>
#include <sstream>
#include <algorithm>
#include <type_traits>

// Check if we can include Stockfish headers
#ifdef BUILDING_WITH_REAL_STOCKFISH
#include "bitboard.h"
#include "position.h"
#include "search.h"
#include "uci.h"
#include "evaluate.h"
#include "movegen.h"
#include "engine.h"
#include "misc.h"
#include "tune.h"
using namespace Stockfish;
#endif

namespace StockfishBinding {

#ifdef BUILDING_WITH_REAL_STOCKFISH

// Real Stockfish implementation using the Engine class
class StockfishEngine::Impl {
public:
    bool initialize() {
        try {
            // Initialize Stockfish core components first
            Bitboards::init();
            Position::init();
            
            // Create engine instance with default settings
            engine_ = std::make_unique<Engine>();
            
            // Initialize tunable parameters
            Tune::init(engine_->get_options());
            
            // Set up callbacks to capture search info
            engine_->set_on_bestmove([this](std::string_view best, std::string_view ponder) {
                last_best_move_ = std::string(best);
                last_ponder_move_ = std::string(ponder);
            });
            
            engine_->set_on_update_full([this](const Engine::InfoFull& info) {
                last_search_info_ = info;
            });
            
            initialized_ = true;
            return true;
        } catch (const std::exception& e) {
            std::cerr << "Stockfish initialization error: " << e.what() << std::endl;
            return false;
        }
    }
    
    void shutdown() {
        if (initialized_) {
            engine_.reset();
            initialized_ = false;
        }
    }
    
    bool set_position(const std::string& fen) {
        try {
            if (!engine_) return false;
            
            current_fen_ = fen;
            std::vector<std::string> moves; // Empty moves vector for just FEN
            engine_->set_position(fen, moves);
            return true;
        } catch (const std::exception& e) {
            std::cerr << "Position error: " << e.what() << std::endl;
            return false;
        }
    }
    
    SearchResult search(int depth) {
        if (!initialized_ || !engine_) {
            return SearchResult(); // Return empty result
        }
        
        try {
            Search::LimitsType limits;
            limits.depth = depth;
            limits.infinite = false;
            
            // Clear previous results
            last_best_move_.clear();
            last_ponder_move_.clear();
            last_search_info_ = Engine::InfoFull{};
            
            // Start search (non-blocking)
            engine_->go(limits);
            
            // Wait for search to complete
            engine_->wait_for_search_finished();
            
            // Build result from captured info
            SearchResult result;
            result.best_move = last_best_move_;
            result.ponder_move = last_ponder_move_;
            
            // Fill in search info if available
            if (last_search_info_.depth > 0) {
                result.final_info.depth = last_search_info_.depth;
                result.final_info.nodes = last_search_info_.nodes;
                result.final_info.time_ms = last_search_info_.timeMs;
                
                // Convert Score to centipawns using visitor pattern
                result.final_info.score_cp = last_search_info_.score.visit([](const auto& score_variant) -> int {
                    if constexpr (std::is_same_v<std::decay_t<decltype(score_variant)>, Score::InternalUnits>) {
                        return score_variant.value;
                    } else if constexpr (std::is_same_v<std::decay_t<decltype(score_variant)>, Score::Mate>) {
                        return score_variant.plies > 0 ? 30000 : -30000; // Large positive/negative for mate
                    } else if constexpr (std::is_same_v<std::decay_t<decltype(score_variant)>, Score::Tablebase>) {
                        return score_variant.win ? 20000 - score_variant.plies : -20000 - score_variant.plies;
                    }
                    return 0;
                });
                
                result.final_info.nps = last_search_info_.nps;
                
                // Convert PV string to vector of moves
                std::istringstream iss(std::string(last_search_info_.pv));
                std::string move;
                while (iss >> move) {
                    result.final_info.pv.push_back(move);
                }
            }
            
            return result;
        } catch (const std::exception& e) {
            std::cerr << "Search error: " << e.what() << std::endl;
            return SearchResult();
        }
    }
    
    int evaluate_current_position() {
        // Note: Direct evaluation requires position access which isn't exposed in Engine API
        // For now, run a quick 1-ply search to get evaluation
        auto result = search(1);
        return result.final_info.score_cp;
    }
    
    std::vector<std::string> get_legal_moves() {
        // For now, return basic starting moves to avoid position manipulation issues
        // TODO: Implement proper move generation through Engine API
        std::vector<std::string> moves;
        
        if (current_fen_.find("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR") != std::string::npos) {
            // Starting position - return common opening moves
            moves = {"e2e4", "d2d4", "g1f3", "b1c3", "e2e3", "d2d3", "c2c4", "f2f4"};
        } else {
            // For other positions, return placeholder moves
            moves = {"e7e6", "d7d6", "g8f6", "b8c6"};
        }
        
        return moves;
    }
    
private:
    bool initialized_ = false;
    std::string current_fen_;
    std::unique_ptr<Engine> engine_;
    
    // Capture search results
    std::string last_best_move_;
    std::string last_ponder_move_;
    Engine::InfoFull last_search_info_;
};

#else

// Stub implementation when not building with real Stockfish
class StockfishEngine::Impl {
public:
    bool initialize() {
        std::cout << "*** STUB IMPLEMENTATION INITIALIZING ***" << std::endl;
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

#endif

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