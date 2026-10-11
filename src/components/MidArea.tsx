import React, { useRef, useState } from "react";
import { Block, BlockKind, DragPayload, DragState, Sprite } from "../types";
import { DropTarget } from "../scriptOps";
import BlockView, { ARM, BUMP } from "./Block";

const SNAP_DISTANCE = 36;

interface Props {
  sprite: Sprite;
  activeStackIds: string[];
  dragRef: React.MutableRefObject<DragState | null>;
  onStartDrag: (e: React.DragEvent, payload: DragPayload) => void;
  onEndDrag: () => void;
  onDropOnTarget: (target: DropTarget, x: number, y: number) => void;
  onDropOnCanvas: (x: number, y: number) => void;
  onChangeBlock: (id: string, kind: BlockKind) => void;
  onRunStack: (stackId: string) => void;
}

export default function MidArea({
  sprite,
  activeStackIds,
  dragRef,
  onStartDrag,
  onEndDrag,
  onDropOnTarget,
  onDropOnCanvas,
  onChangeBlock,
  onRunStack,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<{ x: number; y: number } | null>(null);

  const getDropPosition = (e: React.DragEvent) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - drag.grabX - canvasRect.left;
    const y = e.clientY - drag.grabY - canvasRect.top;

    let snap: { target: DropTarget; x: number; y: number } | null = null;
    let closest = SNAP_DISTANCE;

    for (const el of Array.from(canvas.querySelectorAll<HTMLElement>("[data-snap]"))) {
      const blockId = el.dataset.blockId!;
      if (drag.element.contains(el)) continue;
      if (drag.payload.from === "script" && drag.payload.blockId === blockId) continue;

      const type = el.dataset.snap as DropTarget["type"];
      const rect = el.getBoundingClientRect();
      let snapX = rect.left - canvasRect.left;
      let snapY = rect.bottom - BUMP - canvasRect.top;
      if (type === "insideRepeat") snapX += ARM;
      if (type === "top") snapY = rect.top - canvasRect.top - drag.height + BUMP;

      const distance = Math.hypot(snapX - x, snapY - y);
      if (distance < closest) {
        closest = distance;
        snap = { target: { type, blockId }, x: snapX, y: snapY };
      }
    }

    return { x, y, snap };
  };

  const renderBlock = (block: Block) => {
    const onChange = (kind: BlockKind) => onChangeBlock(block.id, kind);
    if (block.kind.type === "repeat") {
      return (
        <BlockView
          kind={block.kind}
          onChange={onChange}
          topProps={{ "data-snap": "insideRepeat", "data-block-id": block.id }}
          bottomProps={{ "data-snap": "after", "data-block-id": block.id }}
        >
          {renderBlocks(block.kind.body, 0)}
        </BlockView>
      );
    }
    return (
      <BlockView kind={block.kind} onChange={onChange} topProps={{ "data-snap": "after", "data-block-id": block.id }} />
    );
  };

  const renderBlocks = (blocks: Block[], index: number): React.ReactNode => {
    if (index >= blocks.length) return null;
    const block = blocks[index];
    return (
      <div
        draggable
        style={{ marginTop: index > 0 ? -BUMP : 0 }}
        onDragStart={(e) => onStartDrag(e, { from: "script", blockId: block.id })}
        onDragEnd={() => {
          setShadow(null);
          onEndDrag();
        }}
      >
        {renderBlock(block)}
        {renderBlocks(blocks, index + 1)}
      </div>
    );
  };

  return (
    <div className="flex-1 h-full overflow-auto relative bg-gray-50">
      <div className="sticky top-0 left-0 z-10 px-3 py-2 text-sm text-gray-600 bg-gray-50 border-b border-gray-200">
        <span className="font-semibold text-gray-800">{sprite.name}</span>
        {" · drop blocks near each other to snap · click a script to run it"}
      </div>
      <div
        ref={canvasRef}
        className="relative"
        style={{ width: 2000, height: 2000 }}
        onDragOver={(e) => {
          e.preventDefault();
          const snap = getDropPosition(e)?.snap;
          if (snap?.x !== shadow?.x || snap?.y !== shadow?.y) {
            setShadow(snap ? { x: snap.x, y: snap.y } : null);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setShadow(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setShadow(null);
          const drop = getDropPosition(e);
          if (!drop) return;
          if (drop.snap) onDropOnTarget(drop.snap.target, drop.snap.x, drop.snap.y);
          else onDropOnCanvas(drop.x, drop.y);
        }}
      >
        {sprite.stacks.map((stack) => (
          <div
            key={stack.id}
            className="absolute"
            style={{
              left: stack.x,
              top: stack.y,
              filter: activeStackIds.includes(stack.id)
                ? "drop-shadow(0 0 4px #FFD500) drop-shadow(0 0 2px #FFD500)"
                : "drop-shadow(0 1px 1px rgba(0,0,0,0.3))",
            }}
            data-snap="top"
            data-block-id={stack.blocks[0]?.id}
            onClick={() => onRunStack(stack.id)}
          >
            {renderBlocks(stack.blocks, 0)}
          </div>
        ))}
        {shadow && dragRef.current && (
          <div
            className="absolute rounded bg-gray-500 bg-opacity-30 pointer-events-none"
            style={{
              left: shadow.x,
              top: shadow.y,
              width: dragRef.current.width,
              height: dragRef.current.height,
            }}
          />
        )}
      </div>
    </div>
  );
}
