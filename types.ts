
export type Point = {
  x: number;
  y: number;
};

export enum GameState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface GameTheme {
  backgroundUrl: string | null;
  snakeColor: string;
  foodColor: string;
}

export interface AIStatus {
  loading: boolean;
  message: string;
  error: string | null;
}
