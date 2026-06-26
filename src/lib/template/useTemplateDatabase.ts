import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTemplateFromSample,
  deleteTemplateFromDatabase,
  readSelectedTemplateId,
  readTemplateDatabase,
  selectedTemplateStorageKey,
  templateDatabaseKey,
  upsertTemplate,
  writeSelectedTemplateId,
  writeTemplateDatabase
} from "./storage";
import type { PhotoTemplate } from "./types";
import { deleteRemoteTemplate, fetchRemoteTemplates, saveRemoteTemplate, uploadRemoteFile } from "../supabase/templateRepository";
import type { UploadBucket } from "../supabase/templateRepository";

type SyncStatus = "loading" | "ready" | "saving" | "error";

export function useTemplateDatabase() {
  const [templates, setTemplates] = useState<PhotoTemplate[]>(() => readTemplateDatabase());
  const [selectedTemplateId, setSelectedTemplateIdState] = useState<string | null>(() =>
    readSelectedTemplateId(readTemplateDatabase())
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncMessage, setSyncMessage] = useState("正在讀取雲端模板");

  const selectedTemplate = useMemo(() => {
    return (
      templates.find((template) => template.id === selectedTemplateId) ??
      templates[0] ??
      createTemplateFromSample()
    );
  }, [selectedTemplateId, templates]);

  const setSelectedTemplateId = useCallback((templateId: string | null) => {
    setSelectedTemplateIdState(templateId);
    writeSelectedTemplateId(templateId);
  }, []);

  const refreshTemplates = useCallback(async () => {
    setSyncStatus("loading");
    setSyncMessage("正在讀取雲端模板");

    try {
      const remoteTemplates = await fetchRemoteTemplates();
      if (remoteTemplates.length > 0) {
        setTemplates(remoteTemplates);
        writeTemplateDatabase(remoteTemplates);
        setSelectedTemplateIdState((currentId) =>
          currentId && remoteTemplates.some((template) => template.id === currentId)
            ? currentId
            : readSelectedTemplateId(remoteTemplates)
        );
      }
      setSyncStatus("ready");
      setSyncMessage("已連線到 Supabase");
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(error instanceof Error ? error.message : "Supabase 尚未設定完成");
    }
  }, []);

  const saveTemplate = useCallback(
    async (template: PhotoTemplate) => {
      setSyncStatus("saving");
      setSyncMessage("正在儲存模板");

      setTemplates((currentTemplates) => {
        const nextTemplates = upsertTemplate(currentTemplates, template);
        writeTemplateDatabase(nextTemplates);
        return nextTemplates;
      });
      setSelectedTemplateId(template.id);

      try {
        await saveRemoteTemplate(template);
        setSyncStatus("ready");
        setSyncMessage("模板已儲存到 Supabase");
      } catch (error) {
        setSyncStatus("error");
        setSyncMessage(error instanceof Error ? error.message : "模板儲存失敗");
      }
    },
    [setSelectedTemplateId]
  );

  const createTemplate = useCallback(() => {
    const template = createTemplateFromSample(`Template ${templates.length + 1}`);
    void saveTemplate(template);
    return template;
  }, [saveTemplate, templates.length]);

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      setSyncStatus("saving");
      setSyncMessage("正在刪除模板");

      setTemplates((currentTemplates) => {
        const nextTemplates = deleteTemplateFromDatabase(currentTemplates, templateId);
        writeTemplateDatabase(nextTemplates);
        const nextSelectedTemplateId = readSelectedTemplateId(nextTemplates);
        setSelectedTemplateId(nextSelectedTemplateId);
        return nextTemplates;
      });

      try {
        await deleteRemoteTemplate(templateId);
        setSyncStatus("ready");
        setSyncMessage("模板已刪除");
      } catch (error) {
        setSyncStatus("error");
        setSyncMessage(error instanceof Error ? error.message : "模板刪除失敗");
      }
    },
    [setSelectedTemplateId]
  );

  const uploadFile = useCallback((bucket: UploadBucket, file: File, folder: string) => {
    return uploadRemoteFile(bucket, file, folder);
  }, []);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== templateDatabaseKey && event.key !== selectedTemplateStorageKey) return;

      const nextTemplates = readTemplateDatabase();
      setTemplates(nextTemplates);
      setSelectedTemplateIdState(readSelectedTemplateId(nextTemplates));
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return {
    templates,
    selectedTemplate,
    selectedTemplateId,
    syncStatus,
    syncMessage,
    setSelectedTemplateId,
    saveTemplate,
    createTemplate,
    deleteTemplate,
    refreshTemplates,
    uploadFile
  };
}
