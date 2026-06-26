import { LockKeyhole, LogOut } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AdminTemplateBuilder } from "../features/admin/AdminTemplateBuilder";
import { useAssetProtection } from "../lib/security/useAssetProtection";
import { supabase } from "../lib/supabase/client";
import { useTemplateDatabase } from "../lib/template/useTemplateDatabase";

export function AdminApp() {
  useAssetProtection();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const {
    templates,
    selectedTemplate,
    selectedTemplateId,
    setSelectedTemplateId,
    saveTemplate,
    createTemplate,
    deleteTemplate,
    uploadFile,
    syncStatus,
    syncMessage
  } = useTemplateDatabase();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsCheckingSession(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsCheckingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      setError("登入失敗，請確認 email 和密碼是否正確。");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (isCheckingSession) {
    return (
      <main className="app-shell admin-lock-shell">
        <div className="admin-lock-panel">
          <div className="admin-lock-icon">
            <LockKeyhole size={22} />
          </div>
          <h1>正在確認管理員登入狀態</h1>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-shell admin-lock-shell">
        <form className="admin-lock-panel" onSubmit={handleLogin}>
          <div className="admin-lock-icon">
            <LockKeyhole size={22} />
          </div>
          <div>
            <h1>管理端登入</h1>
            <p>請使用你在 Supabase Auth 建立的管理員帳號。</p>
          </div>
          <label className="field">
            Email
            <input
              autoFocus
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            密碼
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit">
            進入管理端
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <p className={`sync-toast ${syncStatus}`}>{syncMessage}</p>
      <button className="admin-session-button" type="button" onClick={handleLogout}>
        <LogOut size={16} />
        登出
      </button>
      <AdminTemplateBuilder
        template={selectedTemplate}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onTemplateChange={saveTemplate}
        onSaveTemplate={saveTemplate}
        onCreateTemplate={createTemplate}
        onDeleteTemplate={deleteTemplate}
        onSelectTemplate={setSelectedTemplateId}
        onUploadFile={uploadFile}
      />
    </main>
  );
}
