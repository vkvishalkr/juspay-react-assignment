import { Block, BlockKind, Stack, nextId } from "./types";

export type DropTarget = {
  type: "after" | "insideRepeat" | "top";
  blockId: string;
};

export function containsId(blocks: Block[], id: string): boolean {
  return blocks.some(
    (b) => b.id === id || (b.kind.type === "repeat" && containsId(b.kind.body, id))
  );
}

function removeFromList(blocks: Block[], id: string): { blocks: Block[]; removed: Block[] | null } {
  const index = blocks.findIndex((b) => b.id === id);
  if (index >= 0) {
    return { blocks: blocks.slice(0, index), removed: blocks.slice(index) };
  }

  let removed: Block[] | null = null;
  const result = blocks.map((b) => {
    if (removed || b.kind.type !== "repeat") return b;
    const inner = removeFromList(b.kind.body, id);
    if (!inner.removed) return b;
    removed = inner.removed;
    return { ...b, kind: { ...b.kind, body: inner.blocks } };
  });
  return { blocks: result, removed };
}

export function removeBlock(stacks: Stack[], id: string): { stacks: Stack[]; removed: Block[] | null } {
  let removed: Block[] | null = null;
  const result = stacks.map((s) => {
    if (removed) return s;
    const inner = removeFromList(s.blocks, id);
    if (!inner.removed) return s;
    removed = inner.removed;
    return { ...s, blocks: inner.blocks };
  });
  return { stacks: result.filter((s) => s.blocks.length > 0), removed };
}

function insertInList(blocks: Block[], target: DropTarget, newBlocks: Block[]): Block[] | null {
  let found = false;
  const result: Block[] = [];

  for (const b of blocks) {
    let block = b;
    if (!found && b.kind.type === "repeat") {
      if (target.type === "insideRepeat" && target.blockId === b.id) {
        found = true;
        block = { ...b, kind: { ...b.kind, body: [...newBlocks, ...b.kind.body] } };
      } else {
        const body = insertInList(b.kind.body, target, newBlocks);
        if (body) {
          found = true;
          block = { ...b, kind: { ...b.kind, body } };
        }
      }
    }
    result.push(block);
    if (!found && target.type === "after" && target.blockId === b.id) {
      found = true;
      result.push(...newBlocks);
    }
  }

  return found ? result : null;
}

export function insertBlocks(
  stacks: Stack[],
  target: DropTarget,
  newBlocks: Block[],
  x: number,
  y: number
): Stack[] | null {
  if (target.type === "top") {
    const stack = stacks.find((s) => s.blocks[0]?.id === target.blockId);
    if (!stack) return null;
    return stacks.map((s) =>
      s === stack ? { ...s, x, y, blocks: [...newBlocks, ...s.blocks] } : s
    );
  }

  let found = false;
  const result = stacks.map((s) => {
    if (found) return s;
    const blocks = insertInList(s.blocks, target, newBlocks);
    if (!blocks) return s;
    found = true;
    return { ...s, blocks };
  });
  return found ? result : null;
}

export function addStack(stacks: Stack[], x: number, y: number, blocks: Block[]): Stack[] {
  return [...stacks, { id: nextId("s"), x, y, blocks }];
}

function updateInList(blocks: Block[], id: string, kind: BlockKind): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return { ...b, kind };
    if (b.kind.type === "repeat") {
      return { ...b, kind: { ...b.kind, body: updateInList(b.kind.body, id, kind) } };
    }
    return b;
  });
}

export function updateBlock(stacks: Stack[], id: string, kind: BlockKind): Stack[] {
  return stacks.map((s) => ({ ...s, blocks: updateInList(s.blocks, id, kind) }));
}
