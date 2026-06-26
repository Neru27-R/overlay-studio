export type SlotShape = "rect" | "rounded" | "circle";

export type PhotoSlot = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: SlotShape;
};

export type TemplateOutput = {
  width: number;
  height: number;
};

export type TemplateVariant = {
  id: string;
  name: string;
  overlayUrl: string;
  overlayFileName?: string;
  output: TemplateOutput;
  slots: PhotoSlot[];
};

export type DistributionFile = {
  id: string;
  label: string;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

export type PhotoTemplate = {
  id: string;
  name: string;
  variants: TemplateVariant[];
  downloads: DistributionFile[];

  /**
   * Legacy mirror of the first variant. Kept so older saved data and a few
   * shared UI surfaces can survive migration without a breaking reset.
   */
  overlayUrl: string;
  overlayFileName?: string;
  output: TemplateOutput;
  slots: PhotoSlot[];
};

export type TextAlign = "left" | "center" | "right";

export type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing: number;
  lineHeight: number;
  align: TextAlign;
};
