
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Point, GameState, Direction, GameTheme } from '../types';

interface SnakeGameProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  theme: GameTheme;
  lives: number;
  onLifeLost: () => void;
  onScoreUpdate: (score: number) => void;
  onAnimate: (canvasDataUrl: string) => void;
}

const GRID_SIZE = 22; // 稍微增加網格密度，配合慢速
const INITIAL_SNAKE: Point[] = [
  { x: 11, y: 11 },
  { x: 11, y: 12 },
  { x: 11, y: 13 },
];
const INITIAL_DIRECTION = Direction.UP;
// 調整速度：極慢模式 (600ms)，每秒不到兩格，適合精確操作
const SPEED = 600;

const SnakeGame: React.FC<SnakeGameProps> = ({ gameState, setGameState, theme, lives, onLifeLost, onScoreUpdate, onAnimate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [nextDirection, setNextDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [flash, setFlash] = useState<boolean>(false);
  
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (theme.backgroundUrl) {
      const img = new Image();
      img.src = theme.backgroundUrl;
      img.onload = () => {
        backgroundImageRef.current = img;
      };
    }
  }, [theme.backgroundUrl]);

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      if (!currentSnake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
    }
    setFood(newFood);
  }, []);

  const resetSnakeOnly = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setNextDirection(INITIAL_DIRECTION);
    // 觸發數位干擾效果
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
  }, []);

  const resetGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setNextDirection(INITIAL_DIRECTION);
    generateFood(INITIAL_SNAKE);
  }, [generateFood]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && lives === 3) {
      resetGame();
    }
  }, [gameState, lives, resetGame]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        if (direction !== Direction.DOWN) setNextDirection(Direction.UP);
        break;
      case 'ArrowDown':
        if (direction !== Direction.UP) setNextDirection(Direction.DOWN);
        break;
      case 'ArrowLeft':
        if (direction !== Direction.RIGHT) setNextDirection(Direction.LEFT);
        break;
      case 'ArrowRight':
        if (direction !== Direction.LEFT) setNextDirection(Direction.RIGHT);
        break;
    }
  }, [direction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const moveSnake = useCallback(() => {
    setDirection(nextDirection);
    setSnake(prev => {
      const head = prev[0];
      const newHead = { ...head };

      switch (nextDirection) {
        case Direction.UP: newHead.y -= 1; break;
        case Direction.DOWN: newHead.y += 1; break;
        case Direction.LEFT: newHead.x -= 1; break;
        case Direction.RIGHT: newHead.x += 1; break;
      }

      // 檢查碰撞邏輯
      if (
        newHead.x < 0 || newHead.x >= GRID_SIZE || 
        newHead.y < 0 || newHead.y >= GRID_SIZE ||
        prev.some(s => s.x === newHead.x && s.y === newHead.y)
      ) {
        if (lives > 1) {
          onLifeLost();
          resetSnakeOnly();
          return prev;
        } else {
          onLifeLost();
          setGameState(GameState.GAME_OVER);
          return prev;
        }
      }

      const newSnake = [newHead, ...prev];
      if (newHead.x === food.x && newHead.y === food.y) {
        onScoreUpdate((prev.length - 2) * 20); // 慢速下分數加倍獎勵
        generateFood(newSnake);
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [nextDirection, food, generateFood, onScoreUpdate, setGameState, lives, onLifeLost, resetSnakeOnly]);

  const render = useCallback((timestamp: number) => {
    if (gameState !== GameState.PLAYING) return;

    if (timestamp - lastUpdateRef.current > SPEED) {
      moveSnake();
      lastUpdateRef.current = timestamp;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width / GRID_SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景繪製與閃爍效果
    if (backgroundImageRef.current) {
      ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = flash ? 'rgba(239, 68, 68, 0.4)' : 'rgba(10, 15, 30, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = flash ? '#450a0a' : '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 科技感網格
      ctx.strokeStyle = flash ? '#ef4444' : '#1e293b';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * size, 0); ctx.lineTo(i * size, canvas.height); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * size); ctx.lineTo(canvas.width, i * size); ctx.stroke();
      }
    }

    // 動態掃描線
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    const scanlineY = (timestamp % 2000) / 2000 * canvas.height;
    ctx.fillRect(0, scanlineY, canvas.width, 2);

    // 繪製食物 (發光數位果實)
    ctx.shadowBlur = 20;
    ctx.shadowColor = theme.foodColor;
    ctx.fillStyle = theme.foodColor;
    ctx.beginPath();
    ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // 食物中心點
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 繪製蛇
    snake.forEach((segment, i) => {
      const isHead = i === 0;
      
      if (isHead) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 30;
        ctx.shadowColor = theme.snakeColor;
      } else {
        const opacity = 1 - (i / snake.length) * 0.6;
        ctx.fillStyle = theme.snakeColor;
        ctx.globalAlpha = opacity;
        ctx.shadowBlur = 10;
        ctx.shadowColor = theme.snakeColor;
      }
      
      const r = isHead ? size / 2.5 : size / 4;
      const x = segment.x * size + 2;
      const y = segment.y * size + 2;
      const w = size - 4;
      const h = size - 4;

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;

      if (isHead) {
        // 核心運算核心 (電子眼)
        ctx.fillStyle = '#000';
        const eyeSize = size / 7;
        const eyeOffset = size / 4;
        if (direction === Direction.UP || direction === Direction.DOWN) {
          ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
          ctx.fillRect(x + w - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
        } else {
          ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
          ctx.fillRect(x + eyeOffset, y + h - eyeOffset - eyeSize, eyeSize, eyeSize);
        }
      }
    });

    gameLoopRef.current = requestAnimationFrame(render);
  }, [gameState, moveSnake, snake, food, theme, direction, flash]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(render);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [render]);

  const handleCaptureAndAnimate = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onAnimate(dataUrl);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className={`relative p-1.5 rounded-3xl transition-all duration-500 overflow-hidden ${flash ? 'bg-red-500 scale-[1.03] shadow-[0_0_50px_rgba(239,68,68,0.8)]' : 'bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 shadow-2xl'}`}>
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={600} 
          className="max-w-full h-auto rounded-2xl shadow-inner bg-black block"
        />
      </div>
      
      <div className="mt-10 flex flex-col md:flex-row gap-8 items-center justify-center w-full">
        {/* 移動控制區 (針對觸控優化) */}
        <div className="grid grid-cols-3 gap-4 md:hidden">
          <div />
          <button onClick={() => setNextDirection(Direction.UP)} className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-cyan-400 active:bg-cyan-900 active:scale-90 transition-all shadow-xl"><i className="fa-solid fa-chevron-up text-2xl"></i></button>
          <div />
          <button onClick={() => setNextDirection(Direction.LEFT)} className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-cyan-400 active:bg-cyan-900 active:scale-90 transition-all shadow-xl"><i className="fa-solid fa-chevron-left text-2xl"></i></button>
          <button onClick={() => setNextDirection(Direction.DOWN)} className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-cyan-400 active:bg-cyan-900 active:scale-90 transition-all shadow-xl"><i className="fa-solid fa-chevron-down text-2xl"></i></button>
          <button onClick={() => setNextDirection(Direction.RIGHT)} className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-cyan-400 active:bg-cyan-900 active:scale-90 transition-all shadow-xl"><i className="fa-solid fa-chevron-right text-2xl"></i></button>
        </div>
        
        {gameState === GameState.PLAYING && (
          <button 
            onClick={handleCaptureAndAnimate}
            className="group flex items-center gap-4 px-10 py-4 bg-slate-950 hover:bg-slate-900 text-purple-400 rounded-xl border border-purple-500/30 font-orbitron text-xs uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:border-purple-500 active:scale-95"
          >
            <i className="fa-solid fa-satellite animate-bounce"></i> 截取數據影像
          </button>
        )}
      </div>
    </div>
  );
};

export default SnakeGame;
