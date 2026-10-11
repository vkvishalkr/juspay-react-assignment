import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import MidArea from "./components/MidArea";
import PreviewArea from "./components/PreviewArea";
import { BlockKind, DragPayload, DragState, Sprite, Stack, newBlock, nextId } from "./types";
import { DropTarget, addStack, containsId, insertBlocks, removeBlock, updateBlock } from "./scriptOps";
import {
  Thread,
  clampToStage,
  createThread,
  findFreeSpot,
  normalizeDirection,
  stepThread,
  touchingPairs,
} from "./engine";

const COLORS = [0, 140, 260, 60, 200, 310, 100];

function createSprite(index: number, x: number, y: number, stacks: Stack[] = []): Sprite {
  return {
    id: nextId("sprite"),
    name: `Sprite ${index + 1}`,
    hue: COLORS[index % COLORS.length],
    x,
    y,
    direction: 90,
    bubble: null,
    stacks,
  };
}

function createDemoSprites() {
  const script = (steps: string): Stack[] => [
    {
      id: nextId("s"),
      x: 40,
      y: 40,
      blocks: [newBlock({ type: "repeat", times: "40", body: [newBlock({ type: "move", steps })] })],
    },
  ];
  return [createSprite(0, -150, 0, script("10")), createSprite(1, 150, 0, script("-10"))];
}

function threadsForSprite(spriteId: string, stacks: Stack[]) {
  return stacks.map((stack) => createThread(spriteId, stack.id, stack.blocks));
}

function pairKeys(sprites: Sprite[]) {
  return new Set(touchingPairs(sprites).map(([a, b]) => a.id + "|" + b.id));
}

export default function App() {
  const [sprites, setSprites] = useState<Sprite[]>(() => [createSprite(0, 0, 0)]);
  const [selectedId, setSelectedId] = useState(sprites[0].id);
  const [activeStackIds, setActiveStackIds] = useState<string[]>([]);

  const spritesRef = useRef(sprites);
  const threadsRef = useRef<Thread[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const touchingRef = useRef(new Set<string>());
  const dragRef = useRef<DragState | null>(null);

  const saveSprites = (newSprites: Sprite[]) => {
    spritesRef.current = newSprites;
    setSprites(newSprites);
  };

  const updateSprite = (id: string, update: (s: Sprite) => Sprite) => {
    saveSprites(spritesRef.current.map((s) => (s.id === id ? update(s) : s)));
  };

  const setThreads = (threads: Thread[]) => {
    threadsRef.current = threads;
    setActiveStackIds(threads.map((t) => t.stackId));
  };

  const swapOnCollision = (list: Sprite[]) => {
    const isRunning = (id: string) => threadsRef.current.some((t) => t.spriteId === id);
    const touching = new Set<string>();
    let result = list;

    for (const [a, b] of touchingPairs(list)) {
      const key = a.id + "|" + b.id;
      touching.add(key);
      if (touchingRef.current.has(key)) continue;
      if (!isRunning(a.id) && !isRunning(b.id)) continue;

      result = result.map((s) => {
        if (s.id === a.id) return { ...s, stacks: b.stacks, bubble: null };
        if (s.id === b.id) return { ...s, stacks: a.stacks, bubble: null };
        return s;
      });
      threadsRef.current = [
        ...threadsRef.current.filter((t) => t.spriteId !== a.id && t.spriteId !== b.id),
        ...threadsForSprite(a.id, b.stacks),
        ...threadsForSprite(b.id, a.stacks),
      ];
    }

    touchingRef.current = touching;
    return result;
  };

  const tick = (time: number) => {
    const dt = Math.min(time - lastTimeRef.current, 50);
    lastTimeRef.current = time;

    let newSprites = spritesRef.current.map((sprite) => {
      for (const thread of threadsRef.current) {
        if (thread.spriteId === sprite.id) sprite = stepThread(thread, sprite, dt);
      }
      return sprite;
    });
    newSprites = swapOnCollision(newSprites);
    saveSprites(newSprites);
    setThreads(threadsRef.current.filter((t) => !t.done));

    frameRef.current = threadsRef.current.length > 0 ? requestAnimationFrame(tick) : null;
  };

  const startThreads = (threads: Thread[]) => {
    const isIdle = frameRef.current === null;
    if (isIdle) touchingRef.current = pairKeys(spritesRef.current);
    setThreads([...threadsRef.current, ...threads]);
    if (isIdle) {
      lastTimeRef.current = performance.now();
      frameRef.current = requestAnimationFrame(tick);
    }
  };

  const stopAll = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setThreads([]);
    saveSprites(spritesRef.current.map((s) => ({ ...s, bubble: null })));
  };

  const play = () => {
    stopAll();
    startThreads(spritesRef.current.flatMap((s) => threadsForSprite(s.id, s.stacks)));
  };

  const runStack = (stackId: string) => {
    if (threadsRef.current.some((t) => t.stackId === stackId)) {
      setThreads(threadsRef.current.filter((t) => t.stackId !== stackId));
      return;
    }
    const stack = spritesRef.current.find((s) => s.id === selectedId)?.stacks.find((s) => s.id === stackId);
    if (stack) startThreads([createThread(selectedId, stack.id, stack.blocks)]);
  };

  const runBlock = (kind: BlockKind) => {
    startThreads([createThread(selectedId, nextId("palette"), [newBlock(kind)])]);
  };

  const startDrag = (e: React.DragEvent, payload: DragPayload) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", "block");
    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    dragRef.current = {
      payload,
      element,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const updateStacks = (update: (stacks: Stack[]) => Stack[]) => {
    updateSprite(selectedId, (s) => ({ ...s, stacks: update(s.stacks) }));
  };

  const dropOnTarget = (target: DropTarget, x: number, y: number) => {
    const payload = dragRef.current?.payload;
    x = Math.max(0, x);
    y = Math.max(0, y);

    if (payload?.from === "palette") {
      updateStacks((stacks) => insertBlocks(stacks, target, [newBlock(payload.kind)], x, y) || stacks);
    }
    if (payload?.from === "script") {
      updateStacks((stacks) => {
        const { stacks: rest, removed } = removeBlock(stacks, payload.blockId);
        if (!removed || containsId(removed, target.blockId)) return stacks;
        return insertBlocks(rest, target, removed, x, y) || stacks;
      });
    }
    endDrag();
  };

  const dropOnCanvas = (x: number, y: number) => {
    const payload = dragRef.current?.payload;
    x = Math.max(0, x);
    y = Math.max(0, y);

    if (payload?.from === "palette") {
      updateStacks((stacks) => addStack(stacks, x, y, [newBlock(payload.kind)]));
    }
    if (payload?.from === "script") {
      updateStacks((stacks) => {
        const { stacks: rest, removed } = removeBlock(stacks, payload.blockId);
        return removed ? addStack(rest, x, y, removed) : stacks;
      });
    }
    endDrag();
  };

  const dropOnSidebar = () => {
    const payload = dragRef.current?.payload;
    if (payload?.from === "script") {
      updateStacks((stacks) => removeBlock(stacks, payload.blockId).stacks);
    }
    endDrag();
  };

  const changeBlock = (id: string, kind: BlockKind) => {
    updateStacks((stacks) => updateBlock(stacks, id, kind));
  };

  const addSprite = () => {
    const spot = findFreeSpot(spritesRef.current);
    const sprite = createSprite(spritesRef.current.length, spot.x, spot.y);
    saveSprites([...spritesRef.current, sprite]);
    setSelectedId(sprite.id);
  };

  const deleteSprite = (id: string) => {
    setThreads(threadsRef.current.filter((t) => t.spriteId !== id));
    saveSprites(spritesRef.current.filter((s) => s.id !== id));
    if (id === selectedId) setSelectedId(spritesRef.current[0].id);
  };

  const loadDemo = () => {
    stopAll();
    const demo = createDemoSprites();
    saveSprites(demo);
    setSelectedId(demo[0].id);
  };

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const selected = sprites.find((s) => s.id === selectedId) || sprites[0];

  return (
    <div className="bg-blue-100 pt-6 font-sans">
      <div className="h-screen overflow-hidden flex flex-row">
        <div className="flex-1 h-screen overflow-hidden flex flex-row bg-white border-t border-r border-gray-200 rounded-tr-xl mr-2">
          <Sidebar onStartDrag={startDrag} onDropDelete={dropOnSidebar} onRunBlock={runBlock} />
          <MidArea
            sprite={selected}
            activeStackIds={activeStackIds}
            dragRef={dragRef}
            onStartDrag={startDrag}
            onEndDrag={endDrag}
            onDropOnTarget={dropOnTarget}
            onDropOnCanvas={dropOnCanvas}
            onChangeBlock={changeBlock}
            onRunStack={runStack}
          />
        </div>
        <div
          className="flex-none h-screen overflow-hidden flex flex-row bg-white border-t border-l border-gray-200 rounded-tl-xl ml-2"
          style={{ width: 512 }}
        >
          <PreviewArea
            sprites={sprites}
            selectedId={selected.id}
            running={activeStackIds.length > 0}
            onPlay={play}
            onStop={stopAll}
            onSelect={setSelectedId}
            onAdd={addSprite}
            onDelete={deleteSprite}
            onMoveSprite={(id, x, y) => updateSprite(id, (s) => clampToStage({ ...s, x, y }))}
            onRename={(id, name) => updateSprite(id, (s) => ({ ...s, name }))}
            onSetDirection={(id, direction) =>
              updateSprite(id, (s) => ({ ...s, direction: normalizeDirection(direction) }))
            }
            onLoadDemo={loadDemo}
          />
        </div>
      </div>
    </div>
  );
}
