/**
 * Pear's Gambit - Stockfish Native Binding
 * 
 * Node.js native addon for high-performance Stockfish integration
 */

#include <napi.h>
#include "stockfish_wrapper.h"
#include <memory>
#include <thread>
#include <atomic>

class StockfishEngine : public Napi::ObjectWrap<StockfishEngine> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    StockfishEngine(const Napi::CallbackInfo& info);
    ~StockfishEngine();

private:
    static Napi::FunctionReference constructor;
    
    // Methods
    Napi::Value Start(const Napi::CallbackInfo& info);
    Napi::Value Stop(const Napi::CallbackInfo& info);
    Napi::Value SetOption(const Napi::CallbackInfo& info);
    Napi::Value Position(const Napi::CallbackInfo& info);
    Napi::Value Go(const Napi::CallbackInfo& info);
    Napi::Value IsReady(const Napi::CallbackInfo& info);
    Napi::Value Quit(const Napi::CallbackInfo& info);
    
    // Async methods
    Napi::Value AnalyzeAsync(const Napi::CallbackInfo& info);
    Napi::Value GetBestMoveAsync(const Napi::CallbackInfo& info);
    
    // Internal state
    std::unique_ptr<StockfishWrapper> engine_;
    std::atomic<bool> is_initialized_{false};
    std::atomic<bool> is_thinking_{false};
};

// Worker for async analysis
class AnalysisWorker : public Napi::AsyncWorker {
public:
    AnalysisWorker(Napi::Function& callback, StockfishWrapper* engine, 
                   const std::string& fen, int depth)
        : Napi::AsyncWorker(callback), engine_(engine), fen_(fen), depth_(depth) {}

    ~AnalysisWorker() {}

    void Execute() override {
        try {
            result_ = engine_->Analyze(fen_, depth_);
        } catch (const std::exception& e) {
            SetError(e.what());
        }
    }

    void OnOK() override {
        Napi::HandleScope scope(Env());
        
        Napi::Object analysis = Napi::Object::New(Env());
        analysis.Set("fen", fen_);
        analysis.Set("depth", result_.depth);
        analysis.Set("bestMove", result_.best_move);
        analysis.Set("evaluation", result_.evaluation);
        analysis.Set("nodes", static_cast<double>(result_.nodes));
        analysis.Set("time", result_.time_ms);
        
        // Convert PV to array
        Napi::Array pv = Napi::Array::New(Env());
        for (size_t i = 0; i < result_.pv.size(); ++i) {
            pv.Set(i, result_.pv[i]);
        }
        analysis.Set("pv", pv);
        
        Callback().Call({Env().Null(), analysis});
    }

private:
    StockfishWrapper* engine_;
    std::string fen_;
    int depth_;
    AnalysisResult result_;
};

// Static member initialization
Napi::FunctionReference StockfishEngine::constructor;

// Class initialization
Napi::Object StockfishEngine::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "StockfishEngine", {
        InstanceMethod("start", &StockfishEngine::Start),
        InstanceMethod("stop", &StockfishEngine::Stop),
        InstanceMethod("setOption", &StockfishEngine::SetOption),
        InstanceMethod("position", &StockfishEngine::Position),
        InstanceMethod("go", &StockfishEngine::Go),
        InstanceMethod("isReady", &StockfishEngine::IsReady),
        InstanceMethod("quit", &StockfishEngine::Quit),
        InstanceMethod("analyzeAsync", &StockfishEngine::AnalyzeAsync),
        InstanceMethod("getBestMoveAsync", &StockfishEngine::GetBestMoveAsync)
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("StockfishEngine", func);
    return exports;
}

// Constructor
StockfishEngine::StockfishEngine(const Napi::CallbackInfo& info) 
    : Napi::ObjectWrap<StockfishEngine>(info) {
    
    engine_ = std::make_unique<StockfishWrapper>();
}

// Destructor
StockfishEngine::~StockfishEngine() {
    if (engine_ && is_initialized_) {
        engine_->Quit();
    }
}

// Start engine
Napi::Value StockfishEngine::Start(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (is_initialized_) {
        Napi::TypeError::New(env, "Engine already started").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    try {
        engine_->Initialize();
        is_initialized_ = true;
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Stop engine
Napi::Value StockfishEngine::Stop(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (!is_initialized_) {
        return Napi::Boolean::New(env, true);
    }
    
    try {
        engine_->Stop();
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Set engine option
Napi::Value StockfishEngine::SetOption(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected 2 arguments").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    if (!info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Arguments must be strings").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string name = info[0].As<Napi::String>();
    std::string value = info[1].As<Napi::String>();
    
    try {
        engine_->SetOption(name, value);
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Set position
Napi::Value StockfishEngine::Position(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected at least 1 argument").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string fen = info[0].As<Napi::String>();
    std::vector<std::string> moves;
    
    if (info.Length() > 1 && info[1].IsArray()) {
        Napi::Array move_array = info[1].As<Napi::Array>();
        for (uint32_t i = 0; i < move_array.Length(); ++i) {
            moves.push_back(move_array.Get(i).As<Napi::String>());
        }
    }
    
    try {
        engine_->SetPosition(fen, moves);
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Start analysis
Napi::Value StockfishEngine::Go(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    GoOptions options;
    if (info.Length() > 0 && info[0].IsObject()) {
        Napi::Object opts = info[0].As<Napi::Object>();
        
        if (opts.Has("depth")) {
            options.depth = opts.Get("depth").As<Napi::Number>();
        }
        if (opts.Has("movetime")) {
            options.movetime = opts.Get("movetime").As<Napi::Number>();
        }
        if (opts.Has("infinite")) {
            options.infinite = opts.Get("infinite").As<Napi::Boolean>();
        }
    }
    
    try {
        std::string best_move = engine_->Go(options);
        return Napi::String::New(env, best_move);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Check if engine is ready
Napi::Value StockfishEngine::IsReady(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        bool ready = engine_->IsReady();
        return Napi::Boolean::New(env, ready);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Quit engine
Napi::Value StockfishEngine::Quit(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        engine_->Quit();
        is_initialized_ = false;
        return Napi::Boolean::New(env, true);
    } catch (const std::exception& e) {
        Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

// Async analysis
Napi::Value StockfishEngine::AnalyzeAsync(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Expected 3 arguments").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string fen = info[0].As<Napi::String>();
    int depth = info[1].As<Napi::Number>();
    Napi::Function callback = info[2].As<Napi::Function>();
    
    AnalysisWorker* worker = new AnalysisWorker(callback, engine_.get(), fen, depth);
    worker->Queue();
    
    return env.Undefined();
}

// Async best move
Napi::Value StockfishEngine::GetBestMoveAsync(const Napi::CallbackInfo& info) {
    // Similar to AnalyzeAsync but simpler
    return AnalyzeAsync(info);
}

// Module initialization
Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return StockfishEngine::Init(env, exports);
}

NODE_API_MODULE(stockfish, InitAll)