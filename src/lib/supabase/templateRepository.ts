import { TEMPLATE_ASSET_BUCKET, TEMPLATE_DOWNLOAD_BUCKET } from "../../config/supabase";
import { normalizeTemplate } from "../template/storage";
import type { PhotoTemplate } from "../template/types";
import { supabase } from "./client";

export type UploadBucket = typeof TEMPLATE_ASSET_BUCKET | typeof TEMPLATE_DOWNLOAD_BUCKET;

type TemplateRow = {
  id: string;
  name: string;
  data: unknown;
  updated_at?: string;
};

function safeFileName(fileName: string) {
  const [baseName, ...extensions] = fileName.split(".");
  const extension = extensions.length > 0 ? `.${extensions.pop()}` : "";
  const safeBase = (baseName || "file").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
  return `${safeBase}${extension}`.toLowerCase();
}

function makePath(folder: string, file: File) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
  return `${folder}/${id}-${safeFileName(file.name)}`;
}

export async function fetchRemoteTemplates() {
  const { data, error } = await supabase
    .from("templates")
    .select("id,name,data,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data as TemplateRow[])
    .map((row) => {
      const templateData = row.data && typeof row.data === "object" ? row.data : {};
      return normalizeTemplate({ ...templateData, id: row.id, name: row.name });
    })
    .filter((template): template is PhotoTemplate => !!template);
}

export async function saveRemoteTemplate(template: PhotoTemplate) {
  const { error } = await supabase.from("templates").upsert(
    {
      id: template.id,
      name: template.name,
      data: template,
      published: true
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

export async function deleteRemoteTemplate(templateId: string) {
  const { error } = await supabase.from("templates").delete().eq("id", templateId);
  if (error) throw error;
}

export async function uploadRemoteFile(bucket: UploadBucket, file: File, folder: string) {
  const path = makePath(folder, file);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
