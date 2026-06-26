import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ChevronDown,
  Download,
  LocateFixed,
  RotateCcw,
  Search,
  Trash2,
  Type,
  Undo2,
  X
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GOOGLE_FONTS, loadGoogleFont, preloadDefaultFonts } from "../../config/googleFonts";
import { renderTemplateToCanvas, type SlotPhoto } from "../../lib/canvas/drawTemplate";
import type { PhotoTemplate, TemplateVariant, TextAlign, TextLayer } from "../../lib/template/types";
import { ClientTemplateCanvas } from "./ClientTemplateCanvas";

type Props = {
  template: PhotoTemplate;
  variant: TemplateVariant;
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
};

type ImageSize = {
  naturalWidth: number;
  naturalHeight: number;
};

type CompositionState = {
  photos: SlotPhoto[];
  textLayers: TextLayer[];
};

const HISTORY_LIMIT = 60;

function emptyComposition(): CompositionState {
  return { photos: [], textLayers: [] };
}

function cloneComposition(composition: CompositionState): CompositionState {
  return {
    photos: composition.photos.map((photo) => ({ ...photo })),
    textLayers: composition.textLayers.map((layer) => ({ ...layer }))
  };
}

function readImageSize(url: string): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight
      });
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = url;
  });
}

function sanitizeFilename(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "-") || "frame-atelier";
}

function revokePhotoUrls(photos: SlotPhoto[]) {
  photos.forEach((photo) => URL.revokeObjectURL(photo.url));
}

export function UserComposer({ template, variant, selectedVariantId, onSelectVariant }: Props) {
  const [composition, setComposition] = useState<CompositionState>(() => emptyComposition());
  const compositionRef = useRef(composition);
  const [history, setHistory] = useState<CompositionState[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [fontQuery, setFontQuery] = useState("");
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    compositionRef.current = composition;
  }, [composition]);

  useEffect(() => {
    preloadDefaultFonts();
  }, []);

  useEffect(() => {
    setComposition((current) => {
      revokePhotoUrls(current.photos);
      compositionRef.current = emptyComposition();
      return compositionRef.current;
    });
    setHistory((current) => {
      current.forEach((item) => revokePhotoUrls(item.photos));
      return [];
    });
    setSelectedSlotId(null);
    setSelectedTextId(null);
  }, [template.id, variant.id]);

  const selectedPhoto = composition.photos.find((photo) => photo.slotId === selectedSlotId);
  const selectedSlot = variant.slots.find((slot) => slot.id === selectedSlotId);
  const selectedText = composition.textLayers.find((layer) => layer.id === selectedTextId) ?? null;
  const filteredFonts = useMemo(() => {
    const query = fontQuery.trim().toLowerCase();
    return GOOGLE_FONTS.filter((font) => font.toLowerCase().includes(query));
  }, [fontQuery]);

  function applyComposition(next: CompositionState, remember = true) {
    const current = compositionRef.current;
    if (remember) {
      setHistory((items) => [cloneComposition(current), ...items].slice(0, HISTORY_LIMIT));
    }

    compositionRef.current = next;
    setComposition(next);
  }

  function updateComposition(updater: (current: CompositionState) => CompositionState, remember = true) {
    applyComposition(updater(compositionRef.current), remember);
  }

  function rememberCurrentState() {
    setHistory((items) => [cloneComposition(compositionRef.current), ...items].slice(0, HISTORY_LIMIT));
  }

  function undo() {
    setHistory((items) => {
      const [previous, ...rest] = items;
      if (previous) {
        compositionRef.current = previous;
        setComposition(previous);
      }
      return rest;
    });
  }

  async function setSlotPhoto(slotId: string, file: File) {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);

    try {
      const size = await readImageSize(url);
      updateComposition((current) => ({
        ...current,
        photos: [
          ...current.photos.filter((item) => item.slotId !== slotId),
          {
            slotId,
            url,
            naturalWidth: size.naturalWidth,
            naturalHeight: size.naturalHeight,
            offsetX: 0,
            offsetY: 0,
            scale: 1
          }
        ]
      }));
      setSelectedSlotId(slotId);
      setSelectedTextId(null);
    } catch {
      URL.revokeObjectURL(url);
    }
  }

  function updatePhotoTransform(
    slotId: string,
    patch: Partial<Pick<SlotPhoto, "offsetX" | "offsetY" | "scale">>,
    remember = true
  ) {
    updateComposition(
      (current) => ({
        ...current,
        photos: current.photos.map((photo) => (photo.slotId === slotId ? { ...photo, ...patch } : photo))
      }),
      remember
    );
  }

  function addTextLayer() {
    const width = Math.round(variant.output.width * 0.54);
    const height = Math.round(variant.output.height * 0.12);
    const nextLayer: TextLayer = {
      id: `text-${Date.now()}`,
      text: "Your text",
      x: Math.round((variant.output.width - width) / 2),
      y: Math.round((variant.output.height - height) / 2),
      width,
      height,
      rotation: 0,
      fontFamily: "Zen Maru Gothic",
      fontSize: Math.max(28, Math.round(variant.output.width * 0.055)),
      fontWeight: 700,
      color: "#111111",
      letterSpacing: 0,
      lineHeight: 1.2,
      align: "center"
    };

    loadGoogleFont(nextLayer.fontFamily);
    updateComposition((current) => ({ ...current, textLayers: [...current.textLayers, nextLayer] }));
    setSelectedTextId(nextLayer.id);
    setSelectedSlotId(null);
  }

  function updateTextLayer(textId: string, patch: Partial<TextLayer>, remember = true) {
    if (patch.fontFamily) loadGoogleFont(patch.fontFamily);
    updateComposition(
      (current) => ({
        ...current,
        textLayers: current.textLayers.map((layer) => (layer.id === textId ? { ...layer, ...patch } : layer))
      }),
      remember
    );
  }

  function deleteTextLayer(textId: string) {
    updateComposition((current) => ({
      ...current,
      textLayers: current.textLayers.filter((layer) => layer.id !== textId)
    }));
    setSelectedTextId(null);
  }

  function centerSelectedPhoto() {
    if (!selectedSlotId) return;
    updatePhotoTransform(selectedSlotId, {
      offsetX: 0,
      offsetY: 0
    });
  }

  function resetSelectedPhoto() {
    if (!selectedSlotId) return;
    updatePhotoTransform(selectedSlotId, {
      offsetX: 0,
      offsetY: 0,
      scale: 1
    });
  }

  async function downloadImage() {
    setIsRendering(true);
    try {
      const canvas = await renderTemplateToCanvas(variant, composition.photos, composition.textLayers);
      const link = document.createElement("a");
      link.download = `${sanitizeFilename(template.name)}-${sanitizeFilename(variant.name)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setIsRendering(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "SELECT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !isTyping) {
        event.preventDefault();
        undo();
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedTextId && !isTyping) {
        event.preventDefault();
        deleteTextLayer(selectedTextId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTextId, history]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && fontMenuRef.current?.contains(target)) return;
      setIsFontMenuOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsFontMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setIsFontMenuOpen(false);
    setFontQuery("");
  }, [selectedTextId]);

  return (
    <section className="workspace-grid">
      <section className="preview-area">
        <div className="canvas-toolbar">
          <div>
            <h2>{variant.name}</h2>
            <span>
              {template.name} / {variant.output.width} x {variant.output.height}
            </span>
          </div>
          <div className="toolbar-actions">
            <button className="ghost-button inline" type="button" disabled={history.length === 0} onClick={undo}>
              <Undo2 size={17} />
              復原
            </button>
            <button
              className="primary-button inline"
              type="button"
              disabled={isRendering || (composition.photos.length === 0 && composition.textLayers.length === 0)}
              onClick={downloadImage}
            >
              <Download size={17} />
              {isRendering ? "製作中" : "下載"}
            </button>
          </div>
        </div>
        <ClientTemplateCanvas
          variant={variant}
          photos={composition.photos}
          selectedSlotId={selectedSlotId}
          selectedTextId={selectedTextId}
          textLayers={composition.textLayers}
          onPhotoChange={setSlotPhoto}
          onPhotoTransform={updatePhotoTransform}
          onSelectSlot={(slotId) => {
            setSelectedSlotId(slotId);
            setSelectedTextId(null);
          }}
          onTextChange={updateTextLayer}
          onTextDelete={deleteTextLayer}
          onSelectText={(textId) => {
            setSelectedTextId(textId);
            setSelectedSlotId(null);
          }}
          onBeforeInteractiveChange={rememberCurrentState}
        />
      </section>

      <aside className="panel">
        <div className="tool-section">
          <div className="tool-section-heading">
            <h3>版型選項</h3>
            <span>選擇這份模板裡的不同尺寸或構圖。</span>
          </div>
          <div className="variant-list">
            {template.variants.map((item) => (
              <button
                className={`variant-chip ${selectedVariantId === item.id ? "is-active" : ""}`}
                key={item.id}
                type="button"
                onClick={() => onSelectVariant(item.id)}
              >
                <img draggable={false} src={item.overlayUrl} alt={item.name} />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        {template.downloads.length > 0 ? (
          <div className="tool-section">
            <div className="tool-section-heading">
              <h3>配布檔案</h3>
              <span>管理員提供的原始檔或素材。</span>
            </div>
            <div className="download-list client-downloads">
              {template.downloads.map((file) => (
                <a className="download-link" key={file.id} href={file.dataUrl} download={file.fileName}>
                  <Download size={16} />
                  <span>{file.label}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className="tool-section">
          <div className="tool-section-heading">
            <h3>圖片圖框</h3>
            <span>點擊畫面上的圖框也可以直接上傳圖片。</span>
          </div>
          <div className="slot-list">
            {variant.slots.map((slot) => (
              <button
                className={`upload-row readonly selectable ${selectedSlotId === slot.id ? "is-active" : ""}`}
                key={slot.id}
                type="button"
                onClick={() => {
                  setSelectedSlotId(slot.id);
                  setSelectedTextId(null);
                }}
              >
                <span>{slot.label}</span>
                <strong>{composition.photos.some((photo) => photo.slotId === slot.id) ? "已上傳" : "待上傳"}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="crop-controls">
          <div className="tool-section-heading">
            <h3>{selectedSlot?.label ?? "圖片調整"}</h3>
            <span>{selectedPhoto ? "拖曳圖片可調整位置，縮放只影響圖片本身。" : "選一個已上傳的圖框來調整。"}</span>
          </div>

          <label className="range-field">
            縮放
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              disabled={!selectedPhoto}
              value={selectedPhoto?.scale ?? 1}
              onChange={(event) =>
                selectedSlotId
                  ? updatePhotoTransform(selectedSlotId, { scale: Number(event.target.value) }, false)
                  : undefined
              }
              onPointerDown={() => (selectedPhoto ? rememberCurrentState() : undefined)}
            />
          </label>

          <div className="crop-button-row">
            <button type="button" disabled={!selectedPhoto} onClick={centerSelectedPhoto}>
              <LocateFixed size={17} />
              置中
            </button>
            <button type="button" disabled={!selectedPhoto} onClick={resetSelectedPhoto}>
              <RotateCcw size={17} />
              還原
            </button>
          </div>
        </div>

        <div className="tool-section">
          <div className="tool-section-heading">
            <h3>文字工具</h3>
            <span>文字可以拖曳、縮放，右上角可直接刪除。</span>
          </div>
          <button className="primary-button inline full" type="button" onClick={addTextLayer}>
            <Type size={17} />
            新增文字
          </button>

          {selectedText ? (
            <div className="text-editor">
              <label className="field">
                文字內容
                <textarea value={selectedText.text} onChange={(event) => updateTextLayer(selectedText.id, { text: event.target.value })} />
              </label>

              <div className="font-picker" ref={fontMenuRef}>
                <span className="field-label">字型</span>
                <button
                  className="font-picker-trigger"
                  type="button"
                  aria-expanded={isFontMenuOpen}
                  aria-haspopup="listbox"
                  onClick={() => setIsFontMenuOpen((isOpen) => !isOpen)}
                >
                  <span style={{ fontFamily: `"${selectedText.fontFamily}", sans-serif` }}>
                    {selectedText.fontFamily}
                  </span>
                  <ChevronDown size={16} />
                </button>

                {isFontMenuOpen ? (
                  <div className="font-picker-menu">
                    <div className="font-search-field">
                      <Search size={15} />
                      <input
                        autoFocus
                        value={fontQuery}
                        onChange={(event) => setFontQuery(event.target.value)}
                        placeholder="搜尋字型"
                      />
                      {fontQuery ? (
                        <button type="button" aria-label="清除搜尋" onClick={() => setFontQuery("")}>
                          <X size={14} />
                        </button>
                      ) : null}
                    </div>

                    <div className="font-menu-list" role="listbox" aria-label="字型清單">
                      {filteredFonts.length > 0 ? (
                        filteredFonts.map((font) => (
                          <button
                            className={selectedText.fontFamily === font ? "is-active" : ""}
                            key={font}
                            type="button"
                            role="option"
                            aria-selected={selectedText.fontFamily === font}
                            style={{ fontFamily: `"${font}", sans-serif` }}
                            onClick={() => {
                              updateTextLayer(selectedText.id, { fontFamily: font });
                              setFontQuery("");
                              setIsFontMenuOpen(false);
                            }}
                          >
                            <span>{font}</span>
                            {selectedText.fontFamily === font ? <Check size={15} /> : null}
                          </button>
                        ))
                      ) : (
                        <p className="font-empty-state">找不到符合的字型</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="text-control-grid">
                <NumberField label="字級" value={selectedText.fontSize} min={8} onChange={(value) => updateTextLayer(selectedText.id, { fontSize: value })} />
                <NumberField label="字距" value={selectedText.letterSpacing} onChange={(value) => updateTextLayer(selectedText.id, { letterSpacing: value })} />
                <NumberField label="行距" value={selectedText.lineHeight} step={0.05} onChange={(value) => updateTextLayer(selectedText.id, { lineHeight: value })} />
                <NumberField label="旋轉" value={selectedText.rotation} onChange={(value) => updateTextLayer(selectedText.id, { rotation: value })} />
                <NumberField label="寬" value={selectedText.width} min={48} onChange={(value) => updateTextLayer(selectedText.id, { width: value })} />
                <NumberField label="高" value={selectedText.height} min={28} onChange={(value) => updateTextLayer(selectedText.id, { height: value })} />
              </div>

              <div className="text-control-grid compact">
                <label className="field compact">
                  字重
                  <select
                    value={selectedText.fontWeight}
                    onChange={(event) => updateTextLayer(selectedText.id, { fontWeight: Number(event.target.value) })}
                  >
                    <option value={300}>Light</option>
                    <option value={400}>Regular</option>
                    <option value={500}>Medium</option>
                    <option value={700}>Bold</option>
                    <option value={900}>Black</option>
                  </select>
                </label>
                <label className="field compact">
                  顏色
                  <input type="color" value={selectedText.color} onChange={(event) => updateTextLayer(selectedText.id, { color: event.target.value })} />
                </label>
              </div>

              <div className="text-align-row">
                <AlignButton icon={<AlignLeft size={16} />} label="靠左" value="left" selected={selectedText.align} onClick={(value) => updateTextLayer(selectedText.id, { align: value })} />
                <AlignButton icon={<AlignCenter size={16} />} label="置中" value="center" selected={selectedText.align} onClick={(value) => updateTextLayer(selectedText.id, { align: value })} />
                <AlignButton icon={<AlignRight size={16} />} label="靠右" value="right" selected={selectedText.align} onClick={(value) => updateTextLayer(selectedText.id, { align: value })} />
              </div>

              <button className="danger-button inline full" type="button" onClick={() => deleteTextLayer(selectedText.id)}>
                <Trash2 size={17} />
                刪除文字
              </button>
            </div>
          ) : (
            <p className="muted-note">新增或選取一個文字框後，可以在這裡調整細項。</p>
          )}
        </div>
      </aside>
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field compact">
      {label}
      <input
        min={min}
        step={step}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function AlignButton({
  icon,
  label,
  value,
  selected,
  onClick
}: {
  icon: ReactNode;
  label: string;
  value: TextAlign;
  selected: TextAlign;
  onClick: (value: TextAlign) => void;
}) {
  return (
    <button className={selected === value ? "is-active" : ""} type="button" onClick={() => onClick(value)}>
      {icon}
      {label}
    </button>
  );
}
