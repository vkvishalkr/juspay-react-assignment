import React, { useState } from "react";
import { BlockKind, DragPayload } from "../types";
import BlockView, { blockColor } from "./Block";

const SECTIONS: { title: string; blocks: BlockKind[] }[] = [
  {
    title: "Motion",
    blocks: [
      { type: "move", steps: "10" },
      { type: "turnLeft", degrees: "15" },
      { type: "turnRight", degrees: "15" },
      { type: "goTo", x: "0", y: "0" },
    ],
  },
  {
    title: "Looks",
    blocks: [
      { type: "say", message: "Hello!", seconds: "2" },
      { type: "think", message: "Hmm...", seconds: "2" },
    ],
  },
  {
    title: "Control",
    blocks: [{ type: "repeat", times: "10", body: [] }],
  },
];

interface Props {
  onStartDrag: (e: React.DragEvent, payload: DragPayload) => void;
  onDropDelete: () => void;
  onRunBlock: (kind: BlockKind) => void;
}

export default function Sidebar({ onStartDrag, onDropDelete, onRunBlock }: Props) {
  const [sections, setSections] = useState(SECTIONS);
  const [isOver, setIsOver] = useState(false);

  const changeBlock = (sectionIndex: number, blockIndex: number, kind: BlockKind) => {
    setSections(
      sections.map((section, i) =>
        i === sectionIndex
          ? { ...section, blocks: section.blocks.map((b, j) => (j === blockIndex ? kind : b)) }
          : section
      )
    );
  };

  return (
    <div
      className={`w-72 flex-none h-full overflow-y-auto p-3 border-r border-gray-200 ${isOver ? "bg-red-50" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        onDropDelete();
      }}
    >
      {sections.map((section, i) => (
        <div key={section.title} className="mb-3">
          <div className="flex items-center font-bold text-gray-700 mb-1">
            <span
              className="inline-block w-3 h-3 rounded-full mr-2"
              style={{ background: blockColor(section.blocks[0]) }}
            />
            {section.title}
          </div>
          {section.blocks.map((kind, j) => (
            <div
              key={j}
              className="my-2 w-max"
              style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}
              draggable
              onDragStart={(e) => onStartDrag(e, { from: "palette", kind })}
              onClick={() => onRunBlock(kind)}
              title="Drag into the code area, or click to run on the selected sprite"
            >
              <BlockView kind={kind} onChange={(k) => changeBlock(i, j, k)} />
            </div>
          ))}
        </div>
      ))}
      <div className="mt-2 text-xs text-gray-400">To delete a block from a script, drag it back here.</div>
    </div>
  );
}
