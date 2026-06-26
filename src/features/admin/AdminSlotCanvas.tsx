import { useEffect, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from "react";
import type { PhotoSlot, TemplateVariant } from "../../lib/template/types";

type Props = {
  variant: TemplateVariant;
  selectedSlotIds: string[];
  onSelectSlot: (slotId: string, additive?: boolean) => void;
  onSlotChange: (slotId: string, patch: Partial<PhotoSlot>, remember?: boolean) => void;
  onSlotsChange: (patches: Record<string, Partial<PhotoSlot>>, remember?: boolean) => void;
  onBeforeInteractiveChange: () => void;
  onOverlayDrop: (file: File) => void;
};

type ResizeHandle = "nw" | "ne" | "sw" | "se";

type Interaction = {
  type: "move" | "resize";
  handle?: ResizeHandle;
  slot: PhotoSlot;
  movingSlots: PhotoSlot[];
  startX: number;
  startY: number;
  scale: number;
  remembered: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function AdminSlotCanvas({
  variant,
  selectedSlotIds,
  onSelectSlot,
  onSlotChange,
  onSlotsChange,
  onBeforeInteractiveChange,
  onOverlayDrop
}: Props) {
  const interactionRef = useRef<Interaction | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hostSize, setHostSize] = useState({ width: 720, height: 640 });
  const [isDragOver, setIsDragOver] = useState(false);
  const scale = Math.max(
    0.05,
    Math.min(hostSize.width / variant.output.width, hostSize.height / variant.output.height)
  );
  const width = variant.output.width * scale;
  const height = variant.output.height * scale;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measuredHost = host;

    function syncSize() {
      setHostSize({
        width: Math.max(280, measuredHost.clientWidth),
        height: Math.max(280, measuredHost.clientHeight)
      });
    }

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(measuredHost);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const interaction = interactionRef.current;
      if (!interaction) return;

      const dx = (event.clientX - interaction.startX) / interaction.scale;
      const dy = (event.clientY - interaction.startY) / interaction.scale;
      const slot = interaction.slot;
      const moved = Math.abs(event.clientX - interaction.startX) + Math.abs(event.clientY - interaction.startY) > 2;
      if (!moved) return;

      if (!interaction.remembered) {
        onBeforeInteractiveChange();
        interaction.remembered = true;
      }

      if (interaction.type === "move") {
        const patches = Object.fromEntries(
          interaction.movingSlots.map((movingSlot) => [
            movingSlot.id,
            {
              x: Math.round(clamp(movingSlot.x + dx, 0, Math.max(0, variant.output.width - movingSlot.width))),
              y: Math.round(clamp(movingSlot.y + dy, 0, Math.max(0, variant.output.height - movingSlot.height)))
            }
          ])
        );
        onSlotsChange(patches, false);
        return;
      }

      const minSize = 40;
      let nextX = slot.x;
      let nextY = slot.y;
      let nextWidth = slot.width;
      let nextHeight = slot.height;

      if (interaction.handle?.includes("e")) {
        nextWidth = clamp(slot.width + dx, minSize, variant.output.width - slot.x);
      }

      if (interaction.handle?.includes("s")) {
        nextHeight = clamp(slot.height + dy, minSize, variant.output.height - slot.y);
      }

      if (interaction.handle?.includes("w")) {
        nextX = clamp(slot.x + dx, 0, slot.x + slot.width - minSize);
        nextWidth = slot.x + slot.width - nextX;
      }

      if (interaction.handle?.includes("n")) {
        nextY = clamp(slot.y + dy, 0, slot.y + slot.height - minSize);
        nextHeight = slot.y + slot.height - nextY;
      }

      onSlotChange(slot.id, {
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: Math.round(nextWidth),
        height: Math.round(nextHeight)
      }, false);
    }

    function handlePointerUp() {
      interactionRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [onBeforeInteractiveChange, onSlotChange, onSlotsChange, variant]);

  function startMove(event: ReactPointerEvent<HTMLDivElement>, slot: PhotoSlot) {
    event.preventDefault();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    const isAlreadySelected = selectedSlotIds.includes(slot.id);
    const nextSelectedIds = additive
      ? isAlreadySelected
        ? selectedSlotIds.filter((id) => id !== slot.id)
        : [...selectedSlotIds, slot.id]
      : isAlreadySelected
        ? selectedSlotIds
        : [slot.id];

    onSelectSlot(slot.id, additive);
    interactionRef.current = {
      type: "move",
      slot,
      movingSlots:
        isAlreadySelected && !additive && selectedSlotIds.length > 1
          ? variant.slots.filter((item) => selectedSlotIds.includes(item.id))
          : variant.slots.filter((item) => nextSelectedIds.includes(item.id)),
      startX: event.clientX,
      startY: event.clientY,
      scale,
      remembered: false
    };
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>, slot: PhotoSlot, handle: ResizeHandle) {
    event.preventDefault();
    event.stopPropagation();
    onSelectSlot(slot.id);
    interactionRef.current = {
      type: "resize",
      handle,
      slot,
      movingSlots: [slot],
      startX: event.clientX,
      startY: event.clientY,
      scale,
      remembered: false
    };
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
    if (file) onOverlayDrop(file);
  }

  return (
    <div
      className={`preview-frame-host drop-zone ${isDragOver ? "is-drag-over" : ""}`}
      ref={hostRef}
      onDragLeave={() => setIsDragOver(false)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="preview-frame editor-frame no-save" style={{ width, height }}>
        <img className="overlay-image editor-overlay" src={variant.overlayUrl} alt={variant.name} draggable={false} />

        {variant.slots.map((slot) => {
          const isSelected = selectedSlotIds.includes(slot.id);
          const isKeyObject = selectedSlotIds[selectedSlotIds.length - 1] === slot.id && selectedSlotIds.length > 1;
          return (
            <div
              className={`slot-editor ${slot.shape} ${isSelected ? "is-selected" : ""} ${isKeyObject ? "is-key-object" : ""}`}
              key={slot.id}
              role="button"
              tabIndex={0}
              onPointerDown={(event) => startMove(event, slot)}
              onFocus={() => {
                if (!interactionRef.current && !selectedSlotIds.includes(slot.id)) onSelectSlot(slot.id);
              }}
              style={{
                left: slot.x * scale,
                top: slot.y * scale,
                width: slot.width * scale,
                height: slot.height * scale,
                transform: `rotate(${slot.rotation}deg)`
              }}
            >
              <span>{slot.label}</span>
              {(["nw", "ne", "sw", "se"] as ResizeHandle[]).map((handle) => (
                <button
                  aria-label={`Resize ${slot.label}`}
                  className={`resize-handle ${handle}`}
                  key={handle}
                  type="button"
                  onPointerDown={(event) => startResize(event, slot, handle)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
