import {
  Block,
  BlockKind,
  Sprite,
  SPRITE_HEIGHT,
  SPRITE_WIDTH,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  toNumber,
} from "./types";

interface Animation {
  dx: number;
  dy: number;
  turn: number;
  duration: number;
  elapsed: number;
  progress: number;
  isSpeech: boolean;
}

export interface Thread {
  spriteId: string;
  stackId: string;
  steps: Generator<BlockKind | null>;
  animation: Animation | null;
  done: boolean;
}

function* runBlocks(blocks: Block[]): Generator<BlockKind | null> {
  for (const block of blocks) {
    if (block.kind.type === "repeat") {
      const times = Math.floor(toNumber(block.kind.times));
      for (let i = 0; i < times; i++) {
        yield* runBlocks(block.kind.body);
        yield null;
      }
    } else {
      yield block.kind;
    }
  }
}

export function createThread(spriteId: string, stackId: string, blocks: Block[]): Thread {
  return { spriteId, stackId, steps: runBlocks(blocks), animation: null, done: false };
}

export function clampToStage(sprite: Sprite): Sprite {
  const maxX = (STAGE_WIDTH - SPRITE_WIDTH) / 2;
  const maxY = (STAGE_HEIGHT - SPRITE_HEIGHT) / 2;
  return {
    ...sprite,
    x: Math.max(-maxX, Math.min(maxX, sprite.x)),
    y: Math.max(-maxY, Math.min(maxY, sprite.y)),
  };
}

export function normalizeDirection(direction: number) {
  const d = ((((direction + 180) % 360) + 360) % 360) - 180;
  return d === -180 ? 180 : d;
}

function startStep(thread: Thread, sprite: Sprite, kind: BlockKind): Sprite {
  const animation: Animation = {
    dx: 0,
    dy: 0,
    turn: 0,
    duration: 250,
    elapsed: 0,
    progress: 0,
    isSpeech: false,
  };
  thread.animation = animation;

  switch (kind.type) {
    case "move": {
      const steps = toNumber(kind.steps);
      const angle = (sprite.direction * Math.PI) / 180;
      animation.dx = steps * Math.sin(angle);
      animation.dy = steps * Math.cos(angle);
      return sprite;
    }
    case "turnRight":
      animation.turn = toNumber(kind.degrees);
      return sprite;
    case "turnLeft":
      animation.turn = -toNumber(kind.degrees);
      return sprite;
    case "goTo": {
      const target = clampToStage({ ...sprite, x: toNumber(kind.x), y: toNumber(kind.y) });
      animation.dx = target.x - sprite.x;
      animation.dy = target.y - sprite.y;
      animation.duration = 400;
      return sprite;
    }
    case "say":
    case "think":
      animation.duration = Math.max(0, toNumber(kind.seconds) * 1000);
      animation.isSpeech = true;
      return { ...sprite, bubble: { kind: kind.type, text: kind.message } };
    default:
      return sprite;
  }
}

export function stepThread(thread: Thread, sprite: Sprite, dt: number): Sprite {
  if (thread.done) return sprite;

  if (!thread.animation) {
    const next = thread.steps.next();
    if (next.done) {
      thread.done = true;
      return sprite;
    }
    if (!next.value) return sprite;
    sprite = startStep(thread, sprite, next.value);
  }

  const animation = thread.animation!;
  animation.elapsed += dt;
  const progress = animation.duration > 0 ? Math.min(animation.elapsed / animation.duration, 1) : 1;
  const delta = progress - animation.progress;
  animation.progress = progress;

  sprite = clampToStage({
    ...sprite,
    x: sprite.x + animation.dx * delta,
    y: sprite.y + animation.dy * delta,
    direction: normalizeDirection(sprite.direction + animation.turn * delta),
  });

  if (progress === 1) {
    thread.animation = null;
    if (animation.isSpeech) sprite = { ...sprite, bubble: null };
  }
  return sprite;
}

export function touchingPairs(sprites: Sprite[]) {
  const pairs: [Sprite, Sprite][] = [];
  for (let i = 0; i < sprites.length; i++) {
    for (let j = i + 1; j < sprites.length; j++) {
      const a = sprites[i];
      const b = sprites[j];
      if (Math.abs(a.x - b.x) < SPRITE_WIDTH * 0.8 && Math.abs(a.y - b.y) < SPRITE_HEIGHT * 0.8) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

export function findFreeSpot(sprites: Sprite[]) {
  const maxX = (STAGE_WIDTH - SPRITE_WIDTH) / 2;
  const maxY = (STAGE_HEIGHT - SPRITE_HEIGHT) / 2;
  let spot = { x: 0, y: 0 };
  for (let i = 0; i < 100; i++) {
    spot = {
      x: Math.round((Math.random() * 2 - 1) * maxX),
      y: Math.round((Math.random() * 2 - 1) * maxY),
    };
    const isFree = sprites.every(
      (s) => Math.abs(s.x - spot.x) > SPRITE_WIDTH * 1.1 || Math.abs(s.y - spot.y) > SPRITE_HEIGHT * 1.1
    );
    if (isFree) break;
  }
  return spot;
}
