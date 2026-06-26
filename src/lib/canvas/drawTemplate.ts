import type { PhotoSlot, TemplateVariant, TextLayer } from "../template/types";

export type SlotPhoto = {
  slotId: string;
  url: string;
  naturalWidth: number;
  naturalHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("圖片載入失敗"));
    image.src = src;
  });
}

function clipSlot(ctx: CanvasRenderingContext2D, shape: PhotoSlot["shape"], width: number, height: number) {
  if (shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.clip();
    return;
  }

  if (shape === "rounded") {
    const radius = Math.min(width, height) * 0.08;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.clip();
    return;
  }

  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  transform?: Pick<SlotPhoto, "offsetX" | "offsetY" | "scale">
) {
  const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const userScale = transform?.scale ?? 1;
  const drawWidth = image.naturalWidth * coverScale * userScale;
  const drawHeight = image.naturalHeight * coverScale * userScale;
  const x = (width - drawWidth) / 2 + (transform?.offsetX ?? 0);
  const y = (height - drawHeight) / 2 + (transform?.offsetY ?? 0);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer) {
  const lines = layer.text.split("\n");
  const lineHeightPx = layer.fontSize * layer.lineHeight;
  const canvasWithLetterSpacing = ctx as CanvasRenderingContext2D & { letterSpacing?: string };

  ctx.save();
  ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.translate(-layer.width / 2, -layer.height / 2);
  ctx.font = `${layer.fontWeight} ${layer.fontSize}px "${layer.fontFamily}", sans-serif`;
  ctx.fillStyle = layer.color;
  ctx.textBaseline = "top";
  ctx.textAlign = layer.align;
  canvasWithLetterSpacing.letterSpacing = `${layer.letterSpacing}px`;

  const x = layer.align === "center" ? layer.width / 2 : layer.align === "right" ? layer.width : 0;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, index * lineHeightPx, layer.width);
  });

  ctx.restore();
}

export async function renderTemplateToCanvas(
  variant: TemplateVariant,
  photos: SlotPhoto[],
  textLayers: TextLayer[] = []
) {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = variant.output.width;
  canvas.height = variant.output.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("瀏覽器不支援 Canvas");
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const slot of variant.slots) {
    const photo = photos.find((item) => item.slotId === slot.id);
    if (!photo) continue;

    const image = await loadImage(photo.url);

    ctx.save();
    ctx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
    ctx.rotate((slot.rotation * Math.PI) / 180);
    ctx.translate(-slot.width / 2, -slot.height / 2);
    clipSlot(ctx, slot.shape, slot.width, slot.height);
    drawImageCover(ctx, image, slot.width, slot.height, photo);
    ctx.restore();
  }

  const overlay = await loadImage(variant.overlayUrl);
  ctx.drawImage(overlay, 0, 0, variant.output.width, variant.output.height);

  for (const textLayer of textLayers) {
    drawTextLayer(ctx, textLayer);
  }

  return canvas;
}
