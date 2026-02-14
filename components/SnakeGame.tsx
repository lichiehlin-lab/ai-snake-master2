
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Point, GameState, Direction, GameTheme } from '../types';

interface SnakeGameProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  theme: GameTheme;
  lives: number;
  isAutoPlay: boolean;
  onLifeLost: () => void;
  onScoreUpdate: (score: number) => void;
  onAnimate: (canvasDataUrl: string) => void;
}

const GRID_SIZE = 22;
const INITIAL_SNAKE: Point[] = [
  { x: 11, y: 11 },
  { x: 11, y: 12 },
  { x: 11, y: 13 },
];
const INITIAL_DIRECTION = Direction.UP;
const MANUAL_SPEED = 600;
const AUTO_SPEED = 100;

const SnakeGame: React.FC<SnakeGameProps> = ({ gameState, setGameState, theme, lives, isAutoPlay, onLifeLost, onScoreUpdate, onAnimate }) => {
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

  // AI 尋路邏輯 (BFS)
  const getAiNextDirection = useCallback((head: Point, currentSnake: Point[], target: Point): Direction | null => {
    const queue: { point: Point; path: Direction[] }[] = [{ point: head, path: [] }];
    const visited = new Set<string>();
    visited.add(`${head.x},${head.y}`);

    const directions = [
      { dir: Direction.UP, dx: 0, dy: -1 },
      { dir: Direction.DOWN, dx: 0, dy: 1 },
      { dir: Direction.LEFT, dx: -1, dy: 0 },
      { dir: Direction.RIGHT, dx: 1, dy: 0 }
    ];

    while (queue.length > 0) {
      const { point, path } = queue.shift()!;

      if (point.x === target.x && point.y === target.y) {
        return path[0];
      }

      for (const { dir, dx, dy } of directions) {
        const next = { x: point.x + dx, y: point.y + dy };
        const key = `${next.x},${next.y}`;

        if (
          next.x >= 0 && next.x < GRID_SIZE &&
          next.y >= 0 && next.y < GRID_SIZE &&
          !currentSnake.some(s => s.x === next.x && s.y === next.y) &&
          !visited.has(key)
        ) {
          visited.add(key);
          queue.push({ point: next, path: [...path, dir] });
        }
      }
    }

    // 若找不到通往食物的路徑，隨機選擇一個安全的方向避難
    for (const { dir, dx, dy } of directions) {
      const next = { x: head.x + dx, y: head.y + dy };
      if (
        next.x >= 0 && next.x < GRID_SIZE &&
        next.y >= 0 && next.y < GRID_SIZE &&
        !currentSnake.some(s => s.x === next.x && s.y === next.y)
      ) {
        return dir;
      }
    }

    return null;
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isAutoPlay) return;
    switch (e.key) {
      case 'ArrowUp': if (direction !== Direction.DOWN) setNextDirection(Direction.UP); break;
      case 'ArrowDown': if (direction !== Direction.UP) setNextDirection(Direction.DOWN); break;
      case 'ArrowLeft': if (direction !== Direction.RIGHT) setNextDirection(Direction.LEFT); break;
      case 'ArrowRight': if (direction !== Direction.LEFT) setNextDirection(Direction.RIGHT); break;
    }
  }, [direction, isAutoPlay]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const moveSnake = useCallback(() => {
    let currentNextDir = nextDirection;
    
    if (isAutoPlay) {
      const aiDir = getAiNextDirection(snake[0], snake, food);
      if (aiDir) {
        currentNextDir = aiDir;
        setNextDirection(aiDir);
      }
    }

    setDirection(currentNextDir);
    setSnake(prev => {
      const head = prev[0];
      const newHead = { ...head };

      switch (currentNextDir) {
        case Direction.UP: newHead.y -= 1; break;
        case Direction.DOWN: newHead.y += 1; break;
        case Direction.LEFT: newHead.x -= 1; break;
        case Direction.RIGHT: newHead.x += 1; break;
      }

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
        onScoreUpdate((prev.length - 2) * (isAutoPlay ? 5 : 20));
        generateFood(newSnake);
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [nextDirection, food, generateFood, onScoreUpdate, setGameState, lives, onLifeLost, resetSnakeOnly, isAutoPlay, getAiNextDirection, snake]);

  const render = useCallback((timestamp: number) => {
    if (gameState !== GameState.PLAYING) return;

    const currentSpeed = isAutoPlay ? AUTO_SPEED : MANUAL_SPEED;

    if (timestamp - lastUpdateRef.current > currentSpeed) {
      moveSnake();
      lastUpdateRef.current = timestamp;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width / GRID_SIZE;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (backgroundImageRef.current) {
      ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = flash ? 'rgba(239, 68, 68, 0.4)' : 'rgba(10, 15, 30, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = flash ? '#450a0a' : '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = flash ? '#ef4444' : isAutoPlay ? '#4c1d95' : '#1e293b';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * size, 0); ctx.lineTo(i * size, canvas.height); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * size); ctx.lineTo(canvas.width, i * size); ctx.stroke();
      }
    }

    // AI 運算邊框特效
    if (isAutoPlay) {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    const scanlineY = (timestamp % 2000) / 2000 * canvas.height;
    ctx.fillRect(0, scanlineY, canvas.width, 2);

    // 繪製食物
    ctx.shadowBlur = 20;
    ctx.shadowColor = theme.foodColor;
    ctx.fillStyle = theme.foodColor;
    ctx.beginPath();
    ctx.arc(food.x * size + size / 2, food.y * size + size / 2, size / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 繪製蛇
    snake.forEach((segment, i) => {
      const isHead = i === 0;
      const baseColor = isAutoPlay ? '#a855f7' : theme.snakeColor;
      
      if (isHead) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 30;
        ctx.shadowColor = baseColor;
      } else {
        const opacity = 1 - (i / snake.length) * 0.6;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = opacity;
        ctx.shadowBlur = 10;
        ctx.shadowColor = baseColor;
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
        if (isAutoPlay) {
          // AI 掃描光圈
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x + w/2, y + h/2, (size/2) * (1 + Math.sin(timestamp/100)*0.2), 0, Math.PI*2);
          ctx.stroke();
        }
        ctx.fillStyle = '#000';
        const eyeSize = size / 7;
        const eyeOffset = size / 4;
        ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
        ctx.fillRect(x + w - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
      }
    });

    gameLoopRef.current = requestAnimationFrame(render);
  }, [gameState, moveSnake, snake, food, theme, isAutoPlay, flash]);

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
      <div className={`relative p-1.5 rounded-3xl transition-all duration-500 overflow-hidden ${
        isAutoPlay ? 'bg-purple-600 shadow-[0_0_50px_rgba(168,85,247,0.4)]' : 
        flash ? 'bg-red-500 scale-[1.03] shadow-[0_0_50px_rgba(239,68,68,0.8)]' : 
        'bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 shadow-2xl'
      }`}>
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={600} 
          className="max-w-full h-auto rounded-2xl shadow-inner bg-black block"
        />
      </div>
      
      <div className="mt-8 flex gap-6 items-center">
        {!isAutoPlay && gameState === GameState.PLAYING && (
          <div className="flex gap-2">
            <button onClick={() => setNextDirection(Direction.UP)} className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-lg text-cyan-400 active:scale-90 transition-all"><i className="fa-solid fa-chevron-up"></i></button>
            <button onClick={() => setNextDirection(Direction.LEFT)} className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-lg text-cyan-400 active:scale-90 transition-all"><i className="fa-solid fa-chevron-left"></i></button>
            <button onClick={() => setNextDirection(Direction.DOWN)} className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-lg text-cyan-400 active:scale-90 transition-all"><i className="fa-solid fa-chevron-down"></i></button>
            <button onClick={() => setNextDirection(Direction.RIGHT)} className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-lg text-cyan-400 active:scale-90 transition-all"><i className="fa-solid fa-chevron-right"></i></button>
          </div>
        )}
        
        {gameState === GameState.PLAYING && (
          <button 
            onClick={handleCaptureAndAnimate}
            className="group flex items-center gap-3 px-8 py-3 bg-slate-950 hover:bg-slate-900 text-purple-400 rounded-xl border border-purple-500/30 font-orbitron text-[10px] uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] active:scale-95"
          >
            <i className="fa-solid fa-satellite-dish animate-pulse"></i> 截取影像
          </button>
        )}
      </div>
    </div>
  );
};

export default SnakeGame;
