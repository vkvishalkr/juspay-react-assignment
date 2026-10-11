import React from "react";
import Icon from "./Icon";
import { BlockKind } from "../types";

export const BUMP = 5;
export const ARM = 14;

export function blockColor(kind: BlockKind) {
  if (kind.type === "say" || kind.type === "think") return "#9966FF";
  if (kind.type === "repeat") return "#FFAB19";
  return "#4C97FF";
}

const notch = (left: number) =>
  `${left + 10}px 0, ${left + 14}px ${BUMP}px, ${left + 26}px ${BUMP}px, ${left + 30}px 0`;
const bump = (left: number) =>
  `${left + 30}px calc(100% - ${BUMP}px), ${left + 26}px 100%, ${left + 14}px 100%, ${left + 10}px calc(100% - ${BUMP}px)`;
const right = `calc(100% - 3px) 0, 100% 3px, 100% calc(100% - ${BUMP + 3}px), calc(100% - 3px) calc(100% - ${BUMP}px)`;
const bottomLeft = `3px calc(100% - ${BUMP}px), 0 calc(100% - ${BUMP + 3}px)`;

const blockShape = `polygon(0 3px, 3px 0, ${notch(0)}, ${right}, ${bump(0)}, ${bottomLeft})`;
const repeatTopShape = `polygon(0 3px, 3px 0, ${notch(0)}, ${right}, ${bump(ARM)}, ${ARM}px calc(100% - ${BUMP}px), ${ARM}px 100%, 0 100%)`;
const repeatBottomShape = `polygon(0 0, ${notch(ARM)}, ${right}, ${bump(0)}, ${bottomLeft})`;

const rowClass =
  "flex items-center whitespace-nowrap text-white text-sm px-2 cursor-pointer select-none";
const rowPadding = { paddingTop: 7, paddingBottom: 5 + BUMP };

function Field({ value, onChange, wide }: { value: string; onChange: (value: string) => void; wide?: boolean }) {
  return (
    <input
      className={`text-gray-800 text-center rounded-full px-1 mx-1 outline-none ${wide ? "w-20" : "w-10"}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      draggable
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
}

function BlockText({ kind, onChange }: { kind: BlockKind; onChange: (kind: BlockKind) => void }) {
  switch (kind.type) {
    case "move":
      return (
        <>
          move
          <Field value={kind.steps} onChange={(steps) => onChange({ ...kind, steps })} />
          steps
        </>
      );
    case "turnLeft":
    case "turnRight":
      return (
        <>
          turn
          <Icon name={kind.type === "turnRight" ? "redo" : "undo"} size={15} className="text-white mx-1" />
          <Field value={kind.degrees} onChange={(degrees) => onChange({ ...kind, degrees })} />
          degrees
        </>
      );
    case "goTo":
      return (
        <>
          go to x:
          <Field value={kind.x} onChange={(x) => onChange({ ...kind, x })} />
          y:
          <Field value={kind.y} onChange={(y) => onChange({ ...kind, y })} />
        </>
      );
    case "say":
    case "think":
      return (
        <>
          {kind.type}
          <Field wide value={kind.message} onChange={(message) => onChange({ ...kind, message })} />
          for
          <Field value={kind.seconds} onChange={(seconds) => onChange({ ...kind, seconds })} />
          seconds
        </>
      );
    case "repeat":
      return (
        <>
          repeat
          <Field value={kind.times} onChange={(times) => onChange({ ...kind, times })} />
          times
        </>
      );
  }
}

type DataProps = { [key: `data-${string}`]: string };

interface Props {
  kind: BlockKind;
  onChange: (kind: BlockKind) => void;
  children?: React.ReactNode;
  topProps?: DataProps;
  bottomProps?: DataProps;
}

export default function BlockView({ kind, onChange, children, topProps, bottomProps }: Props) {
  const background = blockColor(kind);

  if (kind.type !== "repeat") {
    return (
      <div className={`w-max ${rowClass}`} style={{ ...rowPadding, background, clipPath: blockShape }} {...topProps}>
        <BlockText kind={kind} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="w-max flex flex-col">
      <div className={rowClass} style={{ ...rowPadding, background, clipPath: repeatTopShape }} {...topProps}>
        <BlockText kind={kind} onChange={onChange} />
      </div>
      <div className="flex">
        <div style={{ width: ARM, background }} />
        <div style={{ marginTop: -BUMP, minHeight: 22 + BUMP, minWidth: 80 }}>{children}</div>
      </div>
      <div
        className="flex items-center justify-end pr-2"
        style={{
          height: 22 + BUMP,
          paddingBottom: BUMP,
          marginTop: -BUMP,
          background,
          clipPath: repeatBottomShape,
        }}
        {...bottomProps}
      >
        <Icon name="redo" size={12} className="block text-white" />
      </div>
    </div>
  );
}
