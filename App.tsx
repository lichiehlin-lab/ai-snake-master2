
import React, { useState, useEffect } from 'react';
import SnakeGame from './components/SnakeGame';
import { GameState, GameTheme, AIStatus } from './types';
import { GeminiService } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [theme, setTheme] = useState<GameTheme>({
    backgroundUrl: null,
    snakeColor: '#00ffcc',
    foodColor: '#ff0077'
  });
  const [aiStatus, setAiStatus] = useState<AIStatus>({
    loading: false,
    message: '',
    error: null
  });
  const [prompt, setPrompt] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      const ok = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(ok);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const startGame = () => {
    setScore(0);
    setLives(3);
    setGameState(GameState.PLAYING);
  };

  const handleGenerateTheme = async () => {
    if (!prompt) return;
    setAiStatus({ loading: true, message: 'Gemini 正在構思您的數位空間...', error: null });
    try {
      const imageUrl = await GeminiService.generateThemeImage(prompt);
      setTheme(prev => ({ ...prev, backgroundUrl: imageUrl }));
      setAiStatus({ loading: false, message: '主題同步完成！', error: null });
    } catch (err: any) {
      setAiStatus({ loading: false, message: '', error: err.message });
    }
  };

  const handleAnimateGame = async (canvasDataUrl: string) => {
    if (!hasApiKey) {
      await handleSelectKey();
      return;
    }
    setAiStatus({ loading: true, message: 'Veo 正在進行數據影像化處理...', error: null });
    try {
      const videoUrl = await GeminiService.generateVeoVideo(`極具科技感的流體動畫，蛇在一個由 ${prompt || '賽博龐克'} 構成的空間中律動，充滿電影感與動態模糊`, canvasDataUrl);
      setGeneratedVideo(videoUrl);
      setAiStatus({ loading: false, message: '影像解碼完成！', error: null });
    } catch (err: any) {
      setAiStatus({ loading: false, message: '', error: err.message });
      if (err.message.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-slate-950 overflow-y-auto text-slate-200">
      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-10 gap-6 border-b border-slate-800 pb-8">
        <div className="text-center md:text-left">
          <h1 className="text-5xl md:text-7xl font-orbitron font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">
            AI 幻影蛇靈
          </h1>
          <p className="text-cyan-600/80 font-mono mt-3 uppercase tracking-[0.3em] text-[10px]">
            System.Core.v3.5 // <span className="text-purple-500 animate-pulse">Ultra Slow Processing Mode</span>
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-slate-900/80 p-4 rounded-lg border-l-4 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)] min-w-[120px]">
            <span className="text-slate-500 text-[9px] block uppercase tracking-widest mb-2 font-bold font-orbitron">SYNC LIVES</span>
            <div className="flex gap-2 text-red-500 text-xl">
              {[...Array(3)].map((_, i) => (
                <i key={i} className={`fa-solid fa-heart-pulse ${i >= lives ? 'opacity-10 text-slate-700' : 'animate-pulse'}`}></i>
              ))}
            </div>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-lg border-l-4 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.1)] min-w-[100px]">
            <span className="text-slate-500 text-[9px] block uppercase tracking-widest mb-1 font-bold font-orbitron">CORE SCORE</span>
            <span className="text-3xl font-orbitron text-cyan-400 leading-none">{score}</span>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-lg border-l-4 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.1)] min-w-[100px]">
            <span className="text-slate-500 text-[9px] block uppercase tracking-widest mb-1 font-bold font-orbitron">MAX RECORD</span>
            <span className="text-3xl font-orbitron text-purple-400 leading-none">{highScore}</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="relative group overflow-hidden rounded-3xl border border-slate-800 shadow-[0_0_80px_rgba(0,0,0,0.8)] bg-black aspect-square md:aspect-video flex items-center justify-center">
            {/* 數位噪點與網格特效疊層 */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(0,255,255,0.05),rgba(255,0,255,0.02),rgba(0,255,255,0.05))] bg-[length:100%_3px,4px_100%] z-20"></div>
            
            <SnakeGame 
              gameState={gameState} 
              setGameState={setGameState} 
              theme={theme} 
              lives={lives}
              onLifeLost={() => setLives(prev => prev - 1)}
              onScoreUpdate={(s) => {
                setScore(s);
                if (s > highScore) setHighScore(s);
              }}
              onAnimate={handleAnimateGame}
            />

            {gameState === GameState.IDLE && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center z-30">
                <div className="w-32 h-32 mb-10 relative">
                  <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-[ping_3s_linear_infinite]"></div>
                  <div className="absolute inset-0 border border-cyan-500/50 rounded-full animate-[spin_10s_linear_infinite]"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fa-solid fa-atom text-6xl text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]"></i>
                  </div>
                </div>
                <h2 className="text-5xl font-orbitron mb-4 tracking-[0.3em] text-white">啟動核心協議</h2>
                <p className="text-slate-500 mb-10 font-mono text-sm max-w-md leading-relaxed">
                  系統偵測到：極致慢速模式 (600ms) 已就緒。<br/>玩家擁有 3 次數據回溯機會。
                </p>
                <button 
                  onClick={startGame}
                  className="group relative px-16 py-5 bg-transparent overflow-hidden border-2 border-cyan-500 text-cyan-400 font-bold rounded-full transition-all hover:text-white hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                >
                  <div className="absolute inset-0 w-0 bg-cyan-500 transition-all duration-300 group-hover:w-full -z-10"></div>
                  INITIALIZE SYSTEM
                </button>
              </div>
            )}

            {gameState === GameState.GAME_OVER && (
              <div className="absolute inset-0 bg-red-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center z-40 animate-in fade-in duration-700">
                <div className="relative mb-8">
                  <i className="fa-solid fa-triangle-exclamation text-8xl text-red-500 animate-pulse"></i>
                  <div className="absolute -inset-4 bg-red-600/20 blur-xl rounded-full -z-10 animate-pulse"></div>
                </div>
                <h2 className="text-6xl font-orbitron text-white mb-4 tracking-tighter">核心數據潰散</h2>
                <p className="text-xl text-red-400 font-mono mb-12 italic tracking-widest">ERROR_CODE: LIVES_DEPLETED // FINAL_SCORE: {score}</p>
                <button 
                  onClick={startGame}
                  className="px-12 py-4 bg-red-600 text-white font-bold rounded-full shadow-[0_0_40px_rgba(220,38,38,0.6)] hover:bg-red-500 hover:scale-110 transition-all active:scale-95 font-orbitron tracking-widest"
                >
                  REBOOT DATA
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-8 text-[11px] font-mono tracking-widest text-slate-400">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> 引擎狀態: 優化中</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span> 延遲: 600MS</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> 模型: Gemini 2.5 Flash</span>
            </div>
            <div className="text-cyan-500/50 text-[10px] font-orbitron animate-pulse">DATA_SYNC_ACTIVE_0925</div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 h-full flex flex-col shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
              <i className="fa-solid fa-microchip text-9xl"></i>
            </div>

            <h3 className="text-xs font-orbitron mb-8 text-cyan-400 flex items-center gap-4 uppercase tracking-[0.4em]">
              <span className="w-3 h-3 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"></span> AI 空間定製
            </h3>
            
            <div className="space-y-6 mb-10">
              <div className="relative">
                <input 
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="輸入視覺概念 (如: 數位深海)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-6 py-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all text-slate-200 placeholder:text-slate-700 font-sans"
                />
                <i className="fa-solid fa-wand-magic-sparkles absolute right-6 top-1/2 -translate-y-1/2 text-slate-800"></i>
              </div>
              <button 
                onClick={handleGenerateTheme}
                disabled={aiStatus.loading || !prompt}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-700 disabled:opacity-30 rounded-xl font-bold text-white hover:from-cyan-500 hover:to-blue-600 transition-all shadow-lg active:scale-[0.98]"
              >
                {aiStatus.loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner animate-spin"></i> 空間編碼中...
                  </span>
                ) : '重塑數位空間'}
              </button>
            </div>

            <h3 className="text-xs font-orbitron mb-8 text-purple-400 flex items-center gap-4 uppercase tracking-[0.4em]">
              <span className="w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span> VEO 影像渲染
            </h3>
            
            <div className="flex-1 flex flex-col min-h-[250px]">
              {generatedVideo ? (
                <div className="rounded-2xl overflow-hidden bg-black border border-purple-900/40 shadow-2xl">
                  <video src={generatedVideo} controls autoPlay loop className="w-full" />
                </div>
              ) : (
                <div className="flex-1 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-slate-950/40 transition-colors hover:border-slate-700">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-6">
                    <i className="fa-solid fa-film text-slate-700 text-2xl"></i>
                  </div>
                  <p className="text-slate-600 text-[10px] leading-relaxed font-mono tracking-widest">
                    等待高分紀錄數據...<br/>解鎖後將透過 VEO 3.1 生成專屬動畫
                  </p>
                </div>
              )}
              
              {!hasApiKey && (
                <button 
                  onClick={handleSelectKey}
                  className="mt-6 w-full py-3 bg-slate-950 border border-slate-800 text-slate-500 rounded-xl text-[10px] font-orbitron tracking-widest hover:text-cyan-500 hover:border-cyan-500/30 transition-all"
                >
                  <i className="fa-solid fa-key mr-2"></i> VERIFY API ACCESS
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 w-full max-w-7xl py-12 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-8 text-slate-600 text-[10px] font-mono tracking-[0.2em]">
        <div className="flex flex-col gap-2">
          <p>&copy; 2025 PHANTOM SNAKE // CORE_V3.5</p>
          <p className="text-slate-800 font-sans">Developed for High-Precision Interaction</p>
        </div>
        <div className="flex gap-10 items-center">
          <a href="#" className="hover:text-cyan-400 transition-colors uppercase">Security_Protocol</a>
          <a href="#" className="hover:text-cyan-400 transition-colors uppercase">Deep_Link</a>
          <a href="https://ai.google.dev/gemini-api/docs/billing" className="px-5 py-2 bg-slate-900 rounded-full border border-slate-800 hover:text-cyan-400 hover:border-cyan-500/50 transition-all" target="_blank" rel="noopener">
            BILLING_INFO
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;
