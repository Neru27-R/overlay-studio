import { sampleTemplate } from "./sampleTemplate";
import type { DistributionFile, PhotoSlot, PhotoTemplate, TemplateOutput, TemplateVariant } from "./types";

const LEGACY_TEMPLATE_KEY = "photo-template-studio.template.v1";
const DATABASE_KEY = "photo-template-studio.templates.v1";
const SELECTED_TEMPLATE_KEY = "photo-template-studio.selectedTemplateId.v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isOutput(value: unknown): value is TemplateOutput {
  return isObject(value) && typeof value.width === "number" && typeof value.height === "number";
}

function isSlot(value: unknown): value is PhotoSlot {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    typeof value.rotation === "number" &&
    (value.shape === "rect" || value.shape === "rounded" || value.shape === "circle")
  );
}

function cloneSlots(slots: unknown): PhotoSlot[] {
  return Array.isArray(slots) ? slots.filter(isSlot).map((slot) => ({ ...slot })) : [];
}

function isVariant(value: unknown): value is TemplateVariant {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.overlayUrl === "string" &&
    isOutput(value.output) &&
    Array.isArray(value.slots)
  );
}

function cloneVariant(variant: TemplateVariant): TemplateVariant {
  return {
    ...variant,
    output: { ...variant.output },
    slots: cloneSlots(variant.slots)
  };
}

function isDistributionFile(value: unknown): value is DistributionFile {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.fileName === "string" &&
    typeof value.mimeType === "string" &&
    typeof value.size === "number" &&
    typeof value.dataUrl === "string"
  );
}

function mirrorPrimaryVariant(template: Omit<PhotoTemplate, "overlayUrl" | "overlayFileName" | "output" | "slots">): PhotoTemplate {
  const primary = template.variants[0] ?? sampleTemplate.variants[0];

  return {
    ...template,
    overlayUrl: primary.overlayUrl,
    overlayFileName: primary.overlayFileName,
    output: { ...primary.output },
    slots: cloneSlots(primary.slots)
  };
}

export function normalizeTemplate(value: unknown): PhotoTemplate | null {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.name !== "string") return null;

  const rawVariants = Array.isArray(value.variants) ? value.variants : [];
  let variants = rawVariants.filter(isVariant).map(cloneVariant);

  if (variants.length === 0 && typeof value.overlayUrl === "string" && isOutput(value.output)) {
    variants = [
      {
        id: "variant-default",
        name: "Default",
        overlayUrl: value.overlayUrl,
        overlayFileName: typeof value.overlayFileName === "string" ? value.overlayFileName : undefined,
        output: { ...value.output },
        slots: cloneSlots(value.slots)
      }
    ];
  }

  if (variants.length === 0) return null;

  return mirrorPrimaryVariant({
    id: value.id,
    name: value.name,
    variants,
    downloads: Array.isArray(value.downloads) ? value.downloads.filter(isDistributionFile).map((file) => ({ ...file })) : []
  });
}

function cloneTemplate(template: PhotoTemplate): PhotoTemplate {
  return mirrorPrimaryVariant({
    id: template.id,
    name: template.name,
    variants: template.variants.map(cloneVariant),
    downloads: template.downloads.map((file) => ({ ...file }))
  });
}

function normalizeTemplates(value: unknown): PhotoTemplate[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeTemplate).filter((template): template is PhotoTemplate => !!template);
}

function fallbackTemplates() {
  return [cloneTemplate(sampleTemplate)];
}

export function createTemplateFromSample(name = "New template"): PhotoTemplate {
  return {
    ...cloneTemplate(sampleTemplate),
    id: `template-${Date.now()}`,
    name,
    variants: sampleTemplate.variants.map((variant, index) => ({
      ...cloneVariant(variant),
      id: `variant-${Date.now()}-${index}`
    }))
  };
}

export function readTemplateDatabase(): PhotoTemplate[] {
  if (typeof window === "undefined") return fallbackTemplates();

  try {
    const raw = window.localStorage.getItem(DATABASE_KEY);
    if (raw) {
      const templates = normalizeTemplates(JSON.parse(raw));
      if (templates.length > 0) {
        writeTemplateDatabase(templates);
        return templates;
      }
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_TEMPLATE_KEY);
    if (!legacyRaw) return fallbackTemplates();
    const legacyTemplate = normalizeTemplate(JSON.parse(legacyRaw));
    if (!legacyTemplate) return fallbackTemplates();

    const migrated = [cloneTemplate(legacyTemplate)];
    writeTemplateDatabase(migrated);
    return migrated;
  } catch {
    return fallbackTemplates();
  }
}

export function writeTemplateDatabase(templates: PhotoTemplate[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(DATABASE_KEY, JSON.stringify(templates.map(cloneTemplate)));
}

export function readSelectedTemplateId(templates: PhotoTemplate[]) {
  if (typeof window === "undefined") return templates[0]?.id ?? null;

  const storedId = window.localStorage.getItem(SELECTED_TEMPLATE_KEY);
  if (storedId && templates.some((template) => template.id === storedId)) {
    return storedId;
  }

  return templates[0]?.id ?? null;
}

export function writeSelectedTemplateId(templateId: string | null) {
  if (typeof window === "undefined") return;

  if (!templateId) {
    window.localStorage.removeItem(SELECTED_TEMPLATE_KEY);
    return;
  }

  window.localStorage.setItem(SELECTED_TEMPLATE_KEY, templateId);
}

export function upsertTemplate(templates: PhotoTemplate[], template: PhotoTemplate) {
  const normalized = normalizeTemplate(template) ?? cloneTemplate(sampleTemplate);
  const exists = templates.some((item) => item.id === normalized.id);

  if (!exists) {
    return [...templates, normalized];
  }

  return templates.map((item) => (item.id === normalized.id ? normalized : item));
}

export function deleteTemplateFromDatabase(templates: PhotoTemplate[], templateId: string) {
  const remaining = templates.filter((template) => template.id !== templateId);
  return remaining.length > 0 ? remaining : fallbackTemplates();
}

export const templateDatabaseKey = DATABASE_KEY;
export const selectedTemplateStorageKey = SELECTED_TEMPLATE_KEY;
