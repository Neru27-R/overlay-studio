import {
  AlignHorizontalDistributeCenter,
  AlignHorizontalSpaceBetween,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  AlignVerticalSpaceBetween,
  Copy,
  CopyPlus,
  Download,
  FileUp,
  ImagePlus,
  Menu,
  Maximize2,
  Plus,
  RotateCcw,
  Save,
  StretchHorizontal,
  StretchVertical,
  Trash2,
  Undo2,
  X
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { TEMPLATE_ASSET_BUCKET, TEMPLATE_DOWNLOAD_BUCKET } from "../../config/supabase";
import type { UploadBucket } from "../../lib/supabase/templateRepository";
import type { DistributionFile, PhotoSlot, PhotoTemplate, SlotShape, TemplateVariant } from "../../lib/template/types";
import { AdminSlotCanvas } from "./AdminSlotCanvas";

type Props = {
  template: PhotoTemplate;
  templates: PhotoTemplate[];
  selectedTemplateId: string | null;
  onTemplateChange: (template: PhotoTemplate) => void;
  onSaveTemplate: (template: PhotoTemplate) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: (templateId: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onUploadFile?: (bucket: UploadBucket, file: File, folder: string) => Promise<string>;
};

type AlignTarget = "canvas" | "selection" | "key";
type AlignAction = "left" | "centerX" | "right" | "top" | "centerY" | "bottom";
type DistributeAxis = "horizontal" | "vertical";
type SizeAction = "width" | "height" | "both";

const HISTORY_LIMIT = 60;

function cloneVariant(variant: TemplateVariant): TemplateVariant {
  return {
    ...variant,
    output: { ...variant.output },
    slots: variant.slots.map((slot) => ({ ...slot }))
  };
}

function withPrimaryMirror(template: PhotoTemplate): PhotoTemplate {
  const primary = template.variants[0];
  return {
    ...template,
    overlayUrl: primary.overlayUrl,
    overlayFileName: primary.overlayFileName,
    output: { ...primary.output },
    slots: primary.slots.map((slot) => ({ ...slot })),
    downloads: template.downloads.map((file) => ({ ...file })),
    variants: template.variants.map(cloneVariant)
  };
}

function getBounds(slots: PhotoSlot[]) {
  const left = Math.min(...slots.map((slot) => slot.x));
  const top = Math.min(...slots.map((slot) => slot.y));
  const right = Math.max(...slots.map((slot) => slot.x + slot.width));
  const bottom = Math.max(...slots.map((slot) => slot.y + slot.height));

  return {
    left,
    top,
    right,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    width: right - left,
    height: bottom - top
  };
}

export function AdminTemplateBuilder({
  template,
  templates,
  selectedTemplateId,
  onTemplateChange,
  onSaveTemplate,
  onCreateTemplate,
  onDeleteTemplate,
  onSelectTemplate,
  onUploadFile
}: Props) {
  const [activeVariantId, setActiveVariantId] = useState(template.variants[0]?.id ?? "");
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [alignTarget, setAlignTarget] = useState<AlignTarget>("canvas");
  const [distributeGap, setDistributeGap] = useState(24);
  const [history, setHistory] = useState<PhotoTemplate[]>([]);

  const activeVariant = useMemo(() => {
    return template.variants.find((variant) => variant.id === activeVariantId) ?? template.variants[0];
  }, [activeVariantId, template.variants]);

  const selectedSlots = activeVariant.slots.filter((slot) => selectedSlotIds.includes(slot.id));
  const keySlot = activeVariant.slots.find((slot) => slot.id === selectedSlotIds[selectedSlotIds.length - 1]) ?? null;

  useEffect(() => {
    setActiveVariantId(template.variants[0]?.id ?? "");
    setHistory([]);
  }, [template.id]);

  useEffect(() => {
    if (!template.variants.some((variant) => variant.id === activeVariantId)) {
      setActiveVariantId(template.variants[0]?.id ?? "");
    }
  }, [activeVariantId, template.variants]);

  useEffect(() => {
    setSelectedSlotIds((currentIds) => {
      const existingIds = currentIds.filter((id) => activeVariant.slots.some((slot) => slot.id === id));
      if (existingIds.length > 0) return existingIds;
      return activeVariant.slots[0]?.id ? [activeVariant.slots[0].id] : [];
    });
  }, [activeVariant.id, activeVariant.slots]);

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

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && !isTyping) {
        event.preventDefault();
        duplicateSlots();
        return;
      }

      if (isTyping || selectedSlotIds.length === 0) return;

      const distance = event.shiftKey ? 10 : 1;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-distance, 0],
        ArrowRight: [distance, 0],
        ArrowUp: [0, -distance],
        ArrowDown: [0, distance]
      };
      const move = moves[event.key];
      if (!move) return;

      event.preventDefault();
      nudgeSelectedSlots(move[0], move[1]);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSlotIds, activeVariant, history]);

  function rememberCurrentTemplate() {
    setHistory((items) => [withPrimaryMirror(template), ...items].slice(0, HISTORY_LIMIT));
  }

  function commit(nextTemplate: PhotoTemplate, remember = true) {
    if (remember) rememberCurrentTemplate();
    onTemplateChange(withPrimaryMirror(nextTemplate));
  }

  function undo() {
    setHistory((items) => {
      const [previous, ...rest] = items;
      if (previous) onTemplateChange(previous);
      return rest;
    });
  }

  function updateTemplate(patch: Partial<PhotoTemplate>, remember = true) {
    commit({ ...template, ...patch }, remember);
  }

  function updateActiveVariant(patch: Partial<TemplateVariant>, remember = true) {
    commit({
      ...template,
      variants: template.variants.map((variant) =>
        variant.id === activeVariant.id ? cloneVariant({ ...variant, ...patch }) : cloneVariant(variant)
      )
    }, remember);
  }

  function updateSlot(slotId: string, patch: Partial<PhotoSlot>, remember = true) {
    updateSlots({ [slotId]: patch }, remember);
  }

  function updateSlots(patches: Record<string, Partial<PhotoSlot>>, remember = true) {
    updateActiveVariant({
      slots: activeVariant.slots.map((slot) => (patches[slot.id] ? { ...slot, ...patches[slot.id] } : slot))
    }, remember);
  }

  function selectSlot(slotId: string, additive = false) {
    setSelectedSlotIds((currentIds) => {
      if (!additive) return [slotId];
      if (currentIds.includes(slotId)) {
        return currentIds.length === 1 ? currentIds : currentIds.filter((id) => id !== slotId);
      }
      return [...currentIds, slotId];
    });
  }

  function addVariant() {
    const nextVariant = {
      ...cloneVariant(activeVariant),
      id: `variant-${Date.now()}`,
      name: `選項 ${template.variants.length + 1}`,
      slots: activeVariant.slots.map((slot) => ({ ...slot, id: `slot-${Date.now()}-${slot.id}` }))
    };

    commit({
      ...template,
      variants: [...template.variants.map(cloneVariant), nextVariant]
    });
    setActiveVariantId(nextVariant.id);
  }

  function removeVariant(variantId: string) {
    if (template.variants.length <= 1) return;
    const nextVariants = template.variants.filter((variant) => variant.id !== variantId).map(cloneVariant);
    commit({ ...template, variants: nextVariants });
    setActiveVariantId(nextVariants[0].id);
  }

  function addSlot() {
    const nextSlot: PhotoSlot = {
      id: `slot-${Date.now()}`,
      label: "pic",
      x: Math.round(activeVariant.output.width * 0.18),
      y: Math.round(activeVariant.output.height * 0.18),
      width: Math.round(activeVariant.output.width * 0.28),
      height: Math.round(activeVariant.output.height * 0.36),
      rotation: 0,
      shape: "rect"
    };

    updateActiveVariant({
      slots: [...activeVariant.slots, nextSlot]
    });
    setSelectedSlotIds([nextSlot.id]);
  }

  function duplicateSlots(slotIds = selectedSlotIds) {
    const sourceSlots = activeVariant.slots.filter((slot) => slotIds.includes(slot.id));
    if (sourceSlots.length === 0) return;

    const now = Date.now();
    const copies = sourceSlots.map((slot, index) => {
      const copy: PhotoSlot = {
        ...slot,
        id: `slot-${now}-${index}`,
        label: slot.label || "pic",
        x: Math.min(slot.x + 24, Math.max(0, activeVariant.output.width - slot.width)),
        y: Math.min(slot.y + 24, Math.max(0, activeVariant.output.height - slot.height))
      };
      return copy;
    });

    updateActiveVariant({
      slots: [...activeVariant.slots, ...copies]
    });
    setSelectedSlotIds(copies.map((slot) => slot.id));
  }

  function removeSlot(slotId: string) {
    setSelectedSlotIds((currentIds) => currentIds.filter((id) => id !== slotId));
    updateActiveVariant({
      slots: activeVariant.slots.filter((slot) => slot.id !== slotId)
    });
  }

  function getAlignmentBounds() {
    if (alignTarget === "canvas" || selectedSlots.length === 1) {
      return {
        left: 0,
        top: 0,
        right: activeVariant.output.width,
        bottom: activeVariant.output.height,
        centerX: activeVariant.output.width / 2,
        centerY: activeVariant.output.height / 2,
        width: activeVariant.output.width,
        height: activeVariant.output.height
      };
    }

    if (alignTarget === "key" && keySlot) {
      return getBounds([keySlot]);
    }

    return getBounds(selectedSlots);
  }

  function clampX(slot: PhotoSlot, x: number) {
    return Math.round(Math.min(Math.max(x, 0), Math.max(0, activeVariant.output.width - slot.width)));
  }

  function clampY(slot: PhotoSlot, y: number) {
    return Math.round(Math.min(Math.max(y, 0), Math.max(0, activeVariant.output.height - slot.height)));
  }

  function alignSelectedSlots(alignment: AlignAction) {
    if (selectedSlots.length === 0) return;

    const bounds = getAlignmentBounds();
    updateSlots(
      Object.fromEntries(
        selectedSlots.map((slot) => {
          const patch: Partial<PhotoSlot> = {};

          if (alignment === "left") patch.x = clampX(slot, bounds.left);
          if (alignment === "centerX") patch.x = clampX(slot, bounds.centerX - slot.width / 2);
          if (alignment === "right") patch.x = clampX(slot, bounds.right - slot.width);
          if (alignment === "top") patch.y = clampY(slot, bounds.top);
          if (alignment === "centerY") patch.y = clampY(slot, bounds.centerY - slot.height / 2);
          if (alignment === "bottom") patch.y = clampY(slot, bounds.bottom - slot.height);

          return [slot.id, patch];
        })
      )
    );
  }

  function distributeSelectedSlots(axis: DistributeAxis, mode: "space" | "gap") {
    const minimumCount = mode === "space" ? 3 : 2;
    if (selectedSlots.length < minimumCount) return;

    const sortedSlots = [...selectedSlots].sort((a, b) => (axis === "horizontal" ? a.x - b.x : a.y - b.y));
    const patches: Record<string, Partial<PhotoSlot>> = {};

    if (mode === "gap") {
      let cursor =
        axis === "horizontal"
          ? sortedSlots[0].x + sortedSlots[0].width + distributeGap
          : sortedSlots[0].y + sortedSlots[0].height + distributeGap;

      for (const slot of sortedSlots.slice(1)) {
        if (axis === "horizontal") {
          patches[slot.id] = { x: clampX(slot, cursor) };
          cursor += slot.width + distributeGap;
        } else {
          patches[slot.id] = { y: clampY(slot, cursor) };
          cursor += slot.height + distributeGap;
        }
      }

      updateSlots(patches);
      return;
    }

    const bounds = getBounds(sortedSlots);
    const totalSize = sortedSlots.reduce((sum, slot) => sum + (axis === "horizontal" ? slot.width : slot.height), 0);
    const availableSpace = (axis === "horizontal" ? bounds.width : bounds.height) - totalSize;
    const spacing = availableSpace / (sortedSlots.length - 1);
    let cursor = axis === "horizontal" ? bounds.left : bounds.top;

    for (const slot of sortedSlots) {
      if (axis === "horizontal") {
        patches[slot.id] = { x: clampX(slot, cursor) };
        cursor += slot.width + spacing;
      } else {
        patches[slot.id] = { y: clampY(slot, cursor) };
        cursor += slot.height + spacing;
      }
    }

    updateSlots(patches);
  }

  function matchSelectedSize(action: SizeAction) {
    if (!keySlot || selectedSlots.length < 2) return;

    updateSlots(
      Object.fromEntries(
        selectedSlots
          .filter((slot) => slot.id !== keySlot.id)
          .map((slot) => {
            const patch: Partial<PhotoSlot> = {};
            if (action === "width" || action === "both") patch.width = keySlot.width;
            if (action === "height" || action === "both") patch.height = keySlot.height;

            return [
              slot.id,
              {
                ...patch,
                x: Math.min(slot.x, Math.max(0, activeVariant.output.width - (patch.width ?? slot.width))),
                y: Math.min(slot.y, Math.max(0, activeVariant.output.height - (patch.height ?? slot.height)))
              }
            ];
          })
      )
    );
  }

  function nudgeSelectedSlots(dx: number, dy: number) {
    if (selectedSlots.length === 0) return;

    updateSlots(
      Object.fromEntries(
        selectedSlots.map((slot) => [
          slot.id,
          {
            x: clampX(slot, slot.x + dx),
            y: clampY(slot, slot.y + dy)
          }
        ])
      )
    );
  }

  async function applyOverlayFile(file: File) {
    if (!file.type.startsWith("image/")) return;

    const previewUrl = URL.createObjectURL(file);
    const image = await loadImage(previewUrl);
    const overlayUrl = onUploadFile
      ? await onUploadFile(TEMPLATE_ASSET_BUCKET, file, `templates/${template.id}/${activeVariant.id}`)
      : await readFileAsDataUrl(file);

    URL.revokeObjectURL(previewUrl);
    setSelectedSlotIds([]);
    updateActiveVariant({
      overlayUrl,
      overlayFileName: file.name,
      output: {
        width: image.naturalWidth,
        height: image.naturalHeight
      },
      slots: []
    });
  }

  async function handleOverlayUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    await applyOverlayFile(file);
    event.target.value = "";
  }

  async function handleDownloadsUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const uploadedFiles: DistributionFile[] = await Promise.all(
      files.map(async (file, index) => ({
        id: `file-${Date.now()}-${index}`,
        label: file.name.replace(/\.[^.]+$/, ""),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: onUploadFile
          ? await onUploadFile(TEMPLATE_DOWNLOAD_BUCKET, file, `templates/${template.id}/downloads`)
          : await readFileAsDataUrl(file)
      }))
    );

    updateTemplate({
      downloads: [...template.downloads, ...uploadedFiles]
    });
    event.target.value = "";
  }

  function updateDownload(fileId: string, patch: Partial<DistributionFile>) {
    updateTemplate({
      downloads: template.downloads.map((file) => (file.id === fileId ? { ...file, ...patch } : file))
    });
  }

  function removeDownload(fileId: string) {
    updateTemplate({
      downloads: template.downloads.filter((file) => file.id !== fileId)
    });
  }

  return (
    <>
      <section className={`template-database-panel ${isDatabaseOpen ? "is-open" : ""}`}>
        <div className="panel-heading">
          <button
            className="library-toggle"
            type="button"
            aria-expanded={isDatabaseOpen}
            onClick={() => setIsDatabaseOpen((isOpen) => !isOpen)}
          >
            {isDatabaseOpen ? <X size={18} /> : <Menu size={18} />}
            <span>模板資料庫</span>
            <small>{templates.length} 份模板</small>
          </button>
          <button className="icon-text-button" type="button" onClick={onCreateTemplate}>
            <Plus size={18} />
            新增
          </button>
        </div>

        {isDatabaseOpen ? (
          <div className="template-menu-grid">
            <div className="database-grid">
              {templates.map((item) => {
                const preview = item.variants[0];
                return (
                  <button
                    className={`database-tile ${selectedTemplateId === item.id ? "is-active" : ""}`}
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(item.id);
                      setActiveVariantId(item.variants[0]?.id ?? "");
                      setIsDatabaseOpen(false);
                    }}
                  >
                    <img draggable={false} src={preview.overlayUrl} alt={item.name} />
                    <strong>{item.name}</strong>
                    <span>{item.variants.length} 個選項</span>
                    <small>{item.downloads.length} 個配布檔</small>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="workspace-grid">
        <aside className="panel">
          <div className="panel-heading">
            <h2>管理設定</h2>
            <button className="icon-text-button" type="button" disabled={history.length === 0} onClick={undo}>
              <Undo2 size={18} />
              復原
            </button>
          </div>

          <label className="field">
            模板名稱
            <input value={template.name} onChange={(event) => updateTemplate({ name: event.target.value })} />
          </label>

          <div className="tool-section">
            <div className="tool-section-heading">
              <h3>版型選項</h3>
              <span>同一份模板可以有不同尺寸、圖層與圖框配置。</span>
            </div>
            <div className="variant-list">
              {template.variants.map((variant) => (
                <button
                  className={`variant-chip ${variant.id === activeVariant.id ? "is-active" : ""}`}
                  key={variant.id}
                  type="button"
                  onClick={() => setActiveVariantId(variant.id)}
                >
                  <img draggable={false} src={variant.overlayUrl} alt={variant.name} />
                  <span>{variant.name}</span>
                </button>
              ))}
            </div>
            <div className="button-row">
              <button className="secondary-button inline" type="button" onClick={addVariant}>
                <Copy size={17} />
                複製選項
              </button>
              <button
                className="danger-button inline"
                type="button"
                disabled={template.variants.length <= 1}
                onClick={() => removeVariant(activeVariant.id)}
              >
                <Trash2 size={17} />
                刪除選項
              </button>
            </div>
          </div>

          <label className="field">
            選項名稱
            <input value={activeVariant.name} onChange={(event) => updateActiveVariant({ name: event.target.value })} />
          </label>

          <div className="readonly-grid">
            <span>寬度</span>
            <strong>{activeVariant.output.width}px</strong>
            <span>高度</span>
            <strong>{activeVariant.output.height}px</strong>
          </div>

          <label className="upload-button full">
            <ImagePlus size={18} />
            上傳去背模板圖
            <input accept="image/png,image/jpeg,image/webp,image/svg+xml" type="file" onChange={handleOverlayUpload} />
          </label>

          <div className="button-row">
            <button className="primary-button inline" type="button" onClick={addSlot}>
              <Plus size={18} />
              新增圖框
            </button>
            <button className="secondary-button inline" type="button" onClick={() => onSaveTemplate(withPrimaryMirror(template))}>
              <Save size={18} />
              儲存
            </button>
            <button className="danger-button inline" type="button" onClick={() => onDeleteTemplate(template.id)}>
              <Trash2 size={18} />
              刪除模板
            </button>
          </div>

          <div className="tool-section">
            <div className="tool-section-heading">
              <h3>配布檔案</h3>
              <span>可上傳多個來源檔或素材檔，客戶端會顯示下載按鈕。</span>
            </div>
            <label className="upload-button full">
              <FileUp size={18} />
              上傳檔案
              <input multiple type="file" onChange={handleDownloadsUpload} />
            </label>
            <div className="download-list">
              {template.downloads.map((file) => (
                <article className="download-item" key={file.id}>
                  <Download size={16} />
                  <input value={file.label} onChange={(event) => updateDownload(file.id, { label: event.target.value })} />
                  <small>{formatFileSize(file.size)}</small>
                  <button aria-label={`刪除 ${file.label}`} type="button" onClick={() => removeDownload(file.id)}>
                    <Trash2 size={15} />
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="tool-section">
            <div className="tool-section-heading">
              <h3>對齊與分散</h3>
              <span>
                {selectedSlotIds.length > 0
                  ? `已選 ${selectedSlotIds.length} 個，關鍵物件：${keySlot?.label ?? "-"}`
                  : "在畫布上選取一個或多個圖框。"}
              </span>
            </div>

            <div className="segmented-control">
              <button
                className={alignTarget === "canvas" ? "is-active" : ""}
                type="button"
                onClick={() => setAlignTarget("canvas")}
              >
                畫布
              </button>
              <button
                className={alignTarget === "selection" ? "is-active" : ""}
                type="button"
                onClick={() => setAlignTarget("selection")}
              >
                選取
              </button>
              <button
                className={alignTarget === "key" ? "is-active" : ""}
                type="button"
                onClick={() => setAlignTarget("key")}
              >
                關鍵
              </button>
            </div>

            <div className="button-row compact">
              <button
                className="secondary-button inline"
                type="button"
                disabled={selectedSlotIds.length === 0}
                onClick={() => duplicateSlots()}
              >
                <CopyPlus size={17} />
                複製選取
              </button>
            </div>

            <div className="alignment-grid">
              <button type="button" disabled={selectedSlotIds.length === 0} onClick={() => alignSelectedSlots("left")}>
                <AlignStartVertical size={17} />
                靠左
              </button>
              <button type="button" disabled={selectedSlotIds.length === 0} onClick={() => alignSelectedSlots("centerX")}>
                <AlignCenterVertical size={17} />
                水平置中
              </button>
              <button type="button" disabled={selectedSlotIds.length === 0} onClick={() => alignSelectedSlots("right")}>
                <AlignEndVertical size={17} />
                靠右
              </button>
              <button type="button" disabled={selectedSlotIds.length === 0} onClick={() => alignSelectedSlots("top")}>
                <AlignStartHorizontal size={17} />
                靠上
              </button>
              <button type="button" disabled={selectedSlotIds.length === 0} onClick={() => alignSelectedSlots("centerY")}>
                <AlignCenterHorizontal size={17} />
                垂直置中
              </button>
              <button type="button" disabled={selectedSlotIds.length === 0} onClick={() => alignSelectedSlots("bottom")}>
                <AlignEndHorizontal size={17} />
                靠下
              </button>
            </div>

            <div className="alignment-grid dense">
              <button type="button" disabled={selectedSlotIds.length < 3} onClick={() => distributeSelectedSlots("horizontal", "space")}>
                <AlignHorizontalSpaceBetween size={17} />
                水平分散
              </button>
              <button type="button" disabled={selectedSlotIds.length < 3} onClick={() => distributeSelectedSlots("vertical", "space")}>
                <AlignVerticalSpaceBetween size={17} />
                垂直分散
              </button>
              <label className="mini-field">
                間距
                <input type="number" value={distributeGap} onChange={(event) => setDistributeGap(Number(event.target.value))} />
              </label>
              <button type="button" disabled={selectedSlotIds.length < 2} onClick={() => distributeSelectedSlots("horizontal", "gap")}>
                <AlignHorizontalDistributeCenter size={17} />
                水平等距
              </button>
              <button type="button" disabled={selectedSlotIds.length < 2} onClick={() => distributeSelectedSlots("vertical", "gap")}>
                <AlignVerticalDistributeCenter size={17} />
                垂直等距
              </button>
            </div>

            <div className="alignment-grid dense">
              <button type="button" disabled={selectedSlotIds.length < 2} onClick={() => matchSelectedSize("width")}>
                <StretchHorizontal size={17} />
                同寬
              </button>
              <button type="button" disabled={selectedSlotIds.length < 2} onClick={() => matchSelectedSize("height")}>
                <StretchVertical size={17} />
                同高
              </button>
              <button type="button" disabled={selectedSlotIds.length < 2} onClick={() => matchSelectedSize("both")}>
                <Maximize2 size={17} />
                同尺寸
              </button>
            </div>
          </div>

          <div className="slot-list">
            {activeVariant.slots.map((slot) => (
              <article
                className={`slot-card ${selectedSlotIds.includes(slot.id) ? "is-selected" : ""} ${
                  keySlot?.id === slot.id && selectedSlotIds.length > 1 ? "is-key-object" : ""
                }`}
                key={slot.id}
                onClick={(event) => selectSlot(slot.id, event.shiftKey || event.ctrlKey || event.metaKey)}
              >
                <div className="slot-title">
                  <input value={slot.label} onChange={(event) => updateSlot(slot.id, { label: event.target.value })} />
                  <button
                    aria-label={`複製 ${slot.label}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      duplicateSlots([slot.id]);
                    }}
                  >
                    <CopyPlus size={16} />
                  </button>
                  <button
                    aria-label={`刪除 ${slot.label}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeSlot(slot.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="field-grid">
                  <NumberField label="W" value={slot.width} onChange={(value) => updateSlot(slot.id, { width: value })} />
                  <NumberField label="H" value={slot.height} onChange={(value) => updateSlot(slot.id, { height: value })} />
                  <NumberField label="角度" value={slot.rotation} onChange={(value) => updateSlot(slot.id, { rotation: value })} />
                  <label className="field compact">
                    形狀
                    <select value={slot.shape} onChange={(event) => updateSlot(slot.id, { shape: event.target.value as SlotShape })}>
                      <option value="rect">直角</option>
                      <option value="rounded">圓角</option>
                      <option value="circle">圓形</option>
                    </select>
                  </label>
                </div>
              </article>
            ))}
          </div>
        </aside>

        <section className="preview-area">
          <div className="canvas-toolbar">
            <div>
              <h2>{activeVariant.name}</h2>
              <span>
                {template.name} / {activeVariant.output.width} x {activeVariant.output.height}
              </span>
            </div>
            <button
              className="ghost-button inline"
              type="button"
              onClick={() => {
                setSelectedSlotIds([]);
                updateActiveVariant({ slots: [] });
              }}
            >
              <RotateCcw size={17} />
              清空圖框
            </button>
          </div>
          <AdminSlotCanvas
            variant={activeVariant}
            selectedSlotIds={selectedSlotIds}
            onSelectSlot={selectSlot}
            onSlotChange={updateSlot}
            onSlotsChange={updateSlots}
            onBeforeInteractiveChange={rememberCurrentTemplate}
            onOverlayDrop={applyOverlayFile}
          />
        </section>
      </section>
    </>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field compact">
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
