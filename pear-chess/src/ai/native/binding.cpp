// Placeholder binding.cpp for now - this will contain the 
// JavaScript/Bare runtime binding when we add Bare support

#include "stockfish_wrapper.h"
#include <iostream>

extern "C" {
    // Simple C interface for testing
    void* stockfish_create() {
        return new StockfishBinding::StockfishEngine();
    }
    
    bool stockfish_initialize(void* engine) {
        return static_cast<StockfishBinding::StockfishEngine*>(engine)->initialize();
    }
    
    bool stockfish_set_position(void* engine, const char* fen) {
        return static_cast<StockfishBinding::StockfishEngine*>(engine)->set_position(fen);
    }
    
    void stockfish_destroy(void* engine) {
        delete static_cast<StockfishBinding::StockfishEngine*>(engine);
    }
}

// This file will be expanded later to include:
// - Bare runtime JavaScript bindings
// - N-API bindings for Node.js
// - Conversion between C++ and JavaScript types
// - Async search operations
// - Callback handling