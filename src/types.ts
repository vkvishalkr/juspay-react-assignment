export type BlockKind =
  | { type: "move"; steps: string }
  | { type: "turnRight"; degrees: string }
  | { type: "turnLeft"; degrees: string }
  | { type: "goTo"; x: string; y: string }
  | { type: "say"; message: string; seconds: string }
  | { type: "think"; message: string; seconds: string }
  | { type: "repeat"; times: string; body: Block[] };

export interface Block {
  id: string;
  kind: BlockKind;
}

export interface Stack {
  id: string;
  x: number;
  y: number;
  blocks: Block[];
}

export interface Bubble {
  kind: "say" | "think";
  text: string;
}

export interface Sprite {
  id: string;
  name: string;
  hue: number;
  x: number;
  y: number;
  direction: number;
  bubble: Bubble | null;
  stacks: Stack[];
}

export type DragPayload =
  | { from: "palette"; kind: BlockKind }
  | { from: "script"; blockId: string };

export interface DragState {
  payload: DragPayload;
  element: HTMLElement;
  grabX: number;
  grabY: number;
  width: number;
  height: number;
}

export const STAGE_WIDTH = 480;
export const STAGE_HEIGHT = 360;
export const SPRITE_SCALE = 0.7;
export const SPRITE_WIDTH = 95 * SPRITE_SCALE;
export const SPRITE_HEIGHT = 100 * SPRITE_SCALE;

let lastId = 0;
export const nextId = (prefix: string) => prefix + ++lastId;

export const toNumber = (value: string) => {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
};

export function newBlock(kind: BlockKind): Block {
  if (kind.type === "repeat") {
    return { id: nextId("b"), kind: { ...kind, body: kind.body.map((b) => newBlock(b.kind)) } };
  }
  return { id: nextId("b"), kind: { ...kind } };
}
