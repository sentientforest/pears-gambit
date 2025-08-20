#include "stockfish_wrapper.h"
#include <iostream>
#include <cassert>

using namespace StockfishBinding;

int main() {
    std::cout << "=== Native Binding Test ===" << std::endl;
    
    try {
        // Test engine creation
        std::cout << "1. Creating Stockfish engine..." << std::endl;
        StockfishEngine engine;
        
        // Test initialization
        std::cout << "2. Initializing engine..." << std::endl;
        assert(engine.initialize());
        assert(engine.is_ready());
        std::cout << " Engine initialized successfully" << std::endl;
        
        // Test position setting
        std::cout << "3. Setting starting position..." << std::endl;
        const std::string starting_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        assert(engine.set_position(starting_fen));
        std::cout << " Position set successfully" << std::endl;
        
        // Test search
        std::cout << "4. Searching position..." << std::endl;
        SearchResult result = engine.search(5);
        assert(!result.best_move.empty());
        std::cout << " Search completed: " << result.best_move << std::endl;
        std::cout << "   Depth: " << result.final_info.depth << std::endl;
        std::cout << "   Nodes: " << result.final_info.nodes << std::endl;
        std::cout << "   Score: " << result.final_info.score_cp << " cp" << std::endl;
        
        // Test evaluation
        std::cout << "5. Testing evaluation..." << std::endl;
        int eval = engine.evaluate_current_position();
        std::cout << " Evaluation: " << eval << " cp" << std::endl;
        
        // Test move generation
        std::cout << "6. Testing move generation..." << std::endl;
        auto moves = engine.get_legal_moves();
        assert(!moves.empty());
        std::cout << " Generated " << moves.size() << " legal moves" << std::endl;
        std::cout << "   Moves: ";
        for (size_t i = 0; i < std::min(moves.size(), size_t(5)); ++i) {
            std::cout << moves[i] << " ";
        }
        std::cout << std::endl;
        
        // Test move validation
        std::cout << "7. Testing move validation..." << std::endl;
        assert(engine.is_legal_move(moves[0]));
        assert(!engine.is_legal_move("invalid"));
        std::cout << " Move validation working" << std::endl;
        
        // Test options
        std::cout << "8. Testing engine options..." << std::endl;
        assert(engine.set_option("Hash", 64));
        assert(engine.set_option("Threads", 1));
        assert(engine.set_option("MultiPV", true));
        std::cout << " Engine options set successfully" << std::endl;
        
        // Test utility functions
        std::cout << "9. Testing utility functions..." << std::endl;
        std::string uci_move = Utils::move_to_uci("e2", "e4");
        assert(uci_move == "e2e4");
        
        std::string from, to, promotion;
        assert(Utils::parse_uci_move("e2e4", from, to, promotion));
        assert(from == "e2" && to == "e4" && promotion.empty());
        
        assert(Utils::is_valid_fen(starting_fen));
        assert(!Utils::is_valid_fen("invalid"));
        
        std::cout << " Utility functions working" << std::endl;
        
        // Test shutdown
        std::cout << "10. Testing shutdown..." << std::endl;
        engine.shutdown();
        assert(!engine.is_ready());
        std::cout << " Engine shutdown successfully" << std::endl;
        
        std::cout << "\n<‰ All native binding tests passed!" << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "L Test failed with exception: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "L Test failed with unknown exception" << std::endl;
        return 1;
    }
    
    return 0;
}