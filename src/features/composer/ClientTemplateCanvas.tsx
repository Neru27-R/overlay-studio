import { Trash2 } from "lucide-react";
import type { CSSProperties, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { SlotPhoto } from "../../lib/canvas/drawTemplate";
import type { PhotoSlot, TemplateVariant, TextLayer } from "../../lib/template/types";

type Props = {
  variant: TemplateVariant;
  photos: SlotPhoto[];
  selectedSlotId: string | null;
  selectedTextId: string | null;
  textLayers: TextLayer[];
  onPhotoChange: (slotId: string, file: File) => void;
  onPhotoTransform: (
    slotId: string,
    patch: Partial<Pick<SlotPhoto, "offsetX" | "offsetY" | "scale">>,
    remember?: boolean
  ) => void;
  onSelectSlot: (slotId: string) => void;
  onTextChange: (textId: string, patch: Partial<TextLayer>, remember?: boolean) => void;
  onTextDelete: (textId: string) => void;
  onSelectText: (textId: string) => void;
  onBeforeInteractiveChange: () => void;
};

type CropInteraction = {
  type: "photo";
  slotId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};

type TextMoveInteraction = {
  type: "text-move";
  textId: string;
  startX: number;
  startY: number;
  layer: TextLayer;
  scale: number;
};

type TextResizeInteraction = {
  type: "text-resize";
  textId: string;
  startX: number;
  startY: number;
  layer: TextLayer;
  scale: number;
};

type CanvasInteraction = CropInteraction | TextMoveInteraction | TextResizeInteraction;

function getPhotoPreviewStyle(photo: SlotPhoto, slot: PhotoSlot, previewScale: number) {
  const naturalWidth = Math.max(1, photo.naturalWidth);
  const naturalHeight = Math.max(1, photo.naturalHeight);
  const coverScale = Math.max(slot.width / naturalWidth, slot.height / naturalHeight);
  const drawWidth = naturalWidth * coverScale * photo.scale;
  const drawHeight = naturalHeight * coverScale * photo.scale;

  return {
    left: ((slot.width - drawWidth) / 2 + photo.offsetX) * previewScale,
    top: ((slot.height - drawHeight) / 2 + photo.offsetY) * previewScale,
    width: drawWidth * previewScale,
    height: drawHeight * previewScale
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ClientTemplateCanvas({
  variant,
  photos,
  selectedSlotId,
  selectedTextId,
  textLayers,
  onPhotoChange,
  onPhotoTransform,
  onSelectSlot,
  onTextChange,
  onTextDelete,
  onSelectText,
  onBeforeInteractiveChange
}: Props) {
  const interactionRef = useRef<CanvasInteraction | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
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

      if (interaction.type === "photo") {
        onPhotoTransform(
          interaction.slotId,
          {
            offsetX: Math.round(interaction.offsetX + dx),
            offsetY: Math.round(interaction.offsetY + dy)
          },
          false
        );
        return;
      }

      if (interaction.type === "text-move") {
        onTextChange(
          interaction.textId,
          {
            x: Math.round(clamp(interaction.layer.x + dx, 0, variant.output.width - interaction.layer.width)),
            y: Math.round(clamp(interaction.layer.y + dy, 0, variant.output.height - interaction.layer.height))
          },
          false
        );
        return;
      }

      onTextChange(
        interaction.textId,
        {
          width: Math.round(Math.max(48, Math.min(interaction.layer.width + dx, variant.output.width - interaction.layer.x))),
          height: Math.round(Math.max(28, Math.min(interaction.layer.height + dy, variant.output.height - interaction.layer.y)))
        },
        false
      );
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
  }, [onPhotoTransform, onTextChange, variant.output.height, variant.output.width]);

  function startCropMove(event: ReactPointerEvent<HTMLDivElement>, photo: SlotPhoto) {
    event.preventDefault();
    onSelectSlot(photo.slotId);
    onBeforeInteractiveChange();
    interactionRef.current = {
      type: "photo",
      slotId: photo.slotId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: photo.offsetX,
      offsetY: photo.offsetY,
      scale
    };
  }

  function startTextMove(event: ReactPointerEvent<HTMLDivElement>, layer: TextLayer) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectText(layer.id);
    onBeforeInteractiveChange();
    interactionRef.current = {
      type: "text-move",
      textId: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      layer,
      scale
    };
  }

  function startTextResize(event: ReactPointerEvent<HTMLButtonElement>, layer: TextLayer) {
    event.preventDefault();
    event.stopPropagation();
    onSelectText(layer.id);
    onBeforeInteractiveChange();
    interactionRef.current = {
      type: "text-resize",
      textId: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      layer,
      scale
    };
  }

  function selectDropSlot(event: ReactDragEvent<HTMLDivElement>) {
    const fallbackSlot =
      variant.slots.find((slot) => slot.id === selectedSlotId) ??
      variant.slots[0] ??
      null;
    const frame = frameRef.current;
    if (!frame) return fallbackSlot;

    const rect = frame.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    return (
      [...variant.slots]
        .reverse()
        .find((slot) => x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height) ??
      fallbackSlot
    );
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
    const slot = file ? selectDropSlot(event) : null;
    if (!file || !slot) return;

    onSelectSlot(slot.id);
    onPhotoChange(slot.id, file);
  }

  return (
    <div className="preview-frame-host" ref={hostRef}>
      <div
        className={`preview-frame client-frame no-save drop-zone ${isDragOver ? "is-drag-over" : ""}`}
        ref={frameRef}
        style={{ width, height }}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {variant.slots.map((slot) => {
          const photo = photos.find((item) => item.slotId === slot.id);
          return (
            <div
              className={`slot-preview photo-layer ${slot.shape} ${photo ? "has-photo" : "is-empty"}`}
              key={slot.id}
              style={{
                left: slot.x * scale,
                top: slot.y * scale,
                width: slot.width * scale,
                height: slot.height * scale,
                transform: `rotate(${slot.rotation}deg)`
              }}
            >
              {photo ? (
                <img
                  draggable={false}
                  src={photo.url}
                  alt={slot.label}
                  style={getPhotoPreviewStyle(photo, slot, scale)}
                />
              ) : null}
            </div>
          );
        })}

        <img draggable={false} className="overlay-image" src={variant.overlayUrl} alt={variant.name} />

        {textLayers.map((layer) => {
          const isSelected = selectedTextId === layer.id;
          const textStyle: CSSProperties = {
            left: layer.x * scale,
            top: layer.y * scale,
            width: layer.width * scale,
            height: layer.height * scale,
            transform: `rotate(${layer.rotation}deg)`
          };
          const contentStyle: CSSProperties = {
            color: layer.color,
            fontFamily: `"${layer.fontFamily}", sans-serif`,
            fontSize: layer.fontSize * scale,
            fontWeight: layer.fontWeight,
            letterSpacing: layer.letterSpacing * scale,
            lineHeight: layer.lineHeight,
            textAlign: layer.align
          };

          return (
            <div
              className={`text-layer-box ${isSelected ? "is-selected" : ""}`}
              key={layer.id}
              role="button"
              tabIndex={0}
              style={textStyle}
              onFocus={() => onSelectText(layer.id)}
              onPointerDown={(event) => startTextMove(event, layer)}
            >
              <div className="text-layer-content" style={contentStyle}>
                {layer.text || "Text"}
              </div>
              {isSelected ? (
                <>
                  <button
                    className="text-delete-button"
                    type="button"
                    aria-label="刪除文字"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onTextDelete(layer.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    className="text-resize-handle"
                    type="button"
                    aria-label="調整文字框大小"
                    onPointerDown={(event) => startTextResize(event, layer)}
                  />
                </>
              ) : null}
            </div>
          );
        })}

        {variant.slots.map((slot) => {
          const photo = photos.find((item) => item.slotId === slot.id);
          const hitStyle = {
            left: slot.x * scale,
            top: slot.y * scale,
            width: slot.width * scale,
            height: slot.height * scale,
            transform: `rotate(${slot.rotation}deg)`
          };

          if (!photo) {
            return (
              <label
                className={`client-slot-hit ${slot.shape}`}
                key={slot.id}
                aria-label={`上傳到 ${slot.label}`}
                style={hitStyle}
                title={`上傳到 ${slot.label}`}
                onClick={() => onSelectSlot(slot.id)}
              >
                <input
                  accept="image/png,image/jpeg,image/webp"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onPhotoChange(slot.id, file);
                    event.target.value = "";
                  }}
                />
                <span aria-hidden="true">+</span>
              </label>
            );
          }

          return (
            <div
              className={`client-slot-hit crop-hit ${slot.shape} ${selectedSlotId === slot.id ? "is-selected" : ""}`}
              key={slot.id}
              role="button"
              tabIndex={0}
              style={hitStyle}
              onFocus={() => onSelectSlot(slot.id)}
              onPointerDown={(event) => startCropMove(event, photo)}
            >
              <label
                className="change-photo-button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  accept="image/png,image/jpeg,image/webp"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onPhotoChange(slot.id, file);
                    event.target.value = "";
                  }}
                />
                更換
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
