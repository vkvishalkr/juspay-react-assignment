import React, { useRef, useState } from "react";
import CatSprite from "./CatSprite";
import Icon from "./Icon";
import { Sprite, SPRITE_HEIGHT, SPRITE_SCALE, SPRITE_WIDTH, STAGE_HEIGHT, STAGE_WIDTH } from "../types";

function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [text, setText] = useState<string | null>(null);

  const save = () => {
    if (text !== null && !isNaN(parseFloat(text))) onChange(parseFloat(text));
    setText(null);
  };

  return (
    <input
      className="w-14 ml-1 px-1 py-0.5 text-center border border-gray-300 rounded"
      value={text ?? Math.round(value)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

interface Props {
  sprites: Sprite[];
  selectedId: string;
  running: boolean;
  onPlay: () => void;
  onStop: () => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onMoveSprite: (id: string, x: number, y: number) => void;
  onRename: (id: string, name: string) => void;
  onSetDirection: (id: string, direction: number) => void;
  onLoadDemo: () => void;
}

export default function PreviewArea({
  sprites,
  selectedId,
  running,
  onPlay,
  onStop,
  onSelect,
  onAdd,
  onDelete,
  onMoveSprite,
  onRename,
  onSetDirection,
  onLoadDemo,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const selected = sprites.find((s) => s.id === selectedId);

  const getStagePoint = (e: React.MouseEvent) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - STAGE_WIDTH / 2,
      y: STAGE_HEIGHT / 2 - (e.clientY - rect.top),
    };
  };

  const getLeft = (s: Sprite) => STAGE_WIDTH / 2 + s.x - SPRITE_WIDTH / 2;
  const getTop = (s: Sprite) => STAGE_HEIGHT / 2 - s.y - SPRITE_HEIGHT / 2;

  return (
    <div className="flex-1 h-full overflow-y-auto p-3 flex flex-col">
      <div className="flex items-center mb-2">
        <button
          className="flex items-center px-3 py-1 mr-2 rounded bg-green-500 hover:bg-green-600 text-white text-sm font-semibold shadow"
          onClick={onPlay}
        >
          <Icon name="flag" size={14} className="mr-2" />
          Play
        </button>
        <button
          className={`flex items-center px-3 py-1 rounded text-white text-sm font-semibold shadow ${
            running ? "bg-red-500 hover:bg-red-600" : "bg-gray-300 cursor-default"
          }`}
          disabled={!running}
          onClick={onStop}
        >
          <Icon name="stop" size={12} className="mr-2" />
          Stop
        </button>
        <div className="ml-auto text-xs text-gray-500">{running ? "Running…" : "Collisions swap scripts"}</div>
      </div>

      <div
        ref={stageRef}
        className="relative overflow-hidden flex-none bg-white border-2 border-gray-200 rounded-lg"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
        onMouseMove={(e) => {
          if (!dragging.current) return;
          const point = getStagePoint(e);
          const { id, offsetX, offsetY } = dragging.current;
          onMoveSprite(id, point.x - offsetX, point.y - offsetY);
        }}
        onMouseUp={() => (dragging.current = null)}
        onMouseLeave={() => (dragging.current = null)}
      >
        {sprites.map((s) => (
          <div
            key={s.id}
            className="absolute cursor-move"
            style={{
              left: getLeft(s),
              top: getTop(s),
              width: SPRITE_WIDTH,
              height: SPRITE_HEIGHT,
              transform: `rotate(${s.direction - 90}deg)`,
              filter: `hue-rotate(${s.hue}deg)`,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(s.id);
              const point = getStagePoint(e);
              dragging.current = { id: s.id, offsetX: point.x - s.x, offsetY: point.y - s.y };
            }}
          >
            <CatSprite scale={SPRITE_SCALE} />
          </div>
        ))}

        {sprites
          .filter((s) => s.bubble)
          .map((s) => (
            <div
              key={s.id}
              className="absolute z-20 pointer-events-none"
              style={{
                left: getLeft(s) + SPRITE_WIDTH * 0.7,
                top: getTop(s) + 4,
                transform: "translateY(-100%)",
              }}
            >
              <div
                className={`bg-white border-2 border-gray-300 text-gray-800 text-sm px-3 py-2 shadow ${
                  s.bubble!.kind === "think" ? "rounded-full" : "rounded-2xl"
                }`}
                style={{ maxWidth: "12rem", wordBreak: "break-word" }}
              >
                {s.bubble!.text}
              </div>
              {s.bubble!.kind === "think" ? (
                <div className="relative h-4">
                  <div className="absolute left-3 top-1 w-3 h-3 bg-white border-2 border-gray-300 rounded-full" />
                  <div className="absolute left-1 top-3 w-2 h-2 bg-white border-2 border-gray-300 rounded-full" />
                </div>
              ) : (
                <div className="relative h-3">
                  <div
                    className="absolute left-4 w-3 h-3 bg-white border-b-2 border-r-2 border-gray-300"
                    style={{ top: -7, transform: "rotate(45deg)" }}
                  />
                </div>
              )}
            </div>
          ))}
      </div>

      {selected && (
        <div className="flex items-center flex-wrap text-sm text-gray-600 mt-3 space-x-3">
          <label className="flex items-center">
            Sprite
            <input
              className="ml-2 w-24 px-2 py-0.5 border border-gray-300 rounded"
              value={selected.name}
              onChange={(e) => onRename(selected.id, e.target.value)}
            />
          </label>
          <label className="flex items-center">
            x
            <NumberInput value={selected.x} onChange={(x) => onMoveSprite(selected.id, x, selected.y)} />
          </label>
          <label className="flex items-center">
            y
            <NumberInput value={selected.y} onChange={(y) => onMoveSprite(selected.id, selected.x, y)} />
          </label>
          <label className="flex items-center">
            direction
            <NumberInput value={selected.direction} onChange={(d) => onSetDirection(selected.id, d)} />
          </label>
        </div>
      )}

      <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center mb-2">
          <span className="font-bold text-gray-700">Sprites</span>
          <button
            className="ml-auto text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-white"
            onClick={onLoadDemo}
          >
            Load collision demo
          </button>
          <button
            className="ml-2 flex items-center text-xs px-2 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={onAdd}
          >
            <Icon name="plus" size={10} className="mr-1" />
            Add sprite
          </button>
        </div>
        <div className="flex flex-wrap">
          {sprites.map((s) => (
            <div
              key={s.id}
              className={`relative flex flex-col items-center w-20 p-1 mr-2 mb-2 rounded-lg border-2 bg-white cursor-pointer ${
                s.id === selectedId ? "border-blue-500" : "border-gray-200 hover:border-blue-300"
              }`}
              onClick={() => onSelect(s.id)}
            >
              <div style={{ filter: `hue-rotate(${s.hue}deg)` }}>
                <CatSprite scale={0.4} />
              </div>
              <div className="text-xs truncate w-full text-center">{s.name}</div>
              {sprites.length > 1 && (
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white text-xs"
                  title="Delete sprite"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
