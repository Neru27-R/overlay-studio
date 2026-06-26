import type { PhotoTemplate, TemplateVariant } from "./types";

const squareVariant: TemplateVariant = {
  id: "variant-square",
  name: "Square",
  overlayUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1080' height='1080' viewBox='0 0 1080 1080'%3E%3Crect width='1080' height='1080' fill='none'/%3E%3Crect x='64' y='64' width='952' height='952' rx='24' fill='none' stroke='%23171717' stroke-width='28'/%3E%3Ctext x='96' y='990' font-size='42' font-family='Arial' fill='%23171717'%3EFRAME ATELIER%3C/text%3E%3C/svg%3E",
  overlayFileName: "sample-square.svg",
  output: {
    width: 1080,
    height: 1080
  },
  slots: [
    {
      id: "slot-1",
      label: "Main image",
      x: 150,
      y: 150,
      width: 780,
      height: 700,
      rotation: 0,
      shape: "rounded"
    }
  ]
};

const portraitVariant: TemplateVariant = {
  id: "variant-portrait",
  name: "Portrait",
  overlayUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350' viewBox='0 0 1080 1350'%3E%3Crect width='1080' height='1350' fill='none'/%3E%3Crect x='64' y='64' width='952' height='1222' rx='24' fill='none' stroke='%23171717' stroke-width='28'/%3E%3Ctext x='96' y='1270' font-size='42' font-family='Arial' fill='%23171717'%3EFRAME ATELIER%3C/text%3E%3C/svg%3E",
  overlayFileName: "sample-portrait.svg",
  output: {
    width: 1080,
    height: 1350
  },
  slots: [
    {
      id: "slot-portrait-1",
      label: "Portrait image",
      x: 150,
      y: 150,
      width: 780,
      height: 940,
      rotation: 0,
      shape: "rounded"
    }
  ]
};

export const sampleTemplate: PhotoTemplate = {
  id: "sample-template",
  name: "Editorial Starter",
  variants: [squareVariant, portraitVariant],
  downloads: [],
  overlayUrl: squareVariant.overlayUrl,
  overlayFileName: squareVariant.overlayFileName,
  output: squareVariant.output,
  slots: squareVariant.slots
};
