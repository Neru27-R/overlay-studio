import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UserComposer } from "../features/composer/UserComposer";
import { useAssetProtection } from "../lib/security/useAssetProtection";
import { useTemplateDatabase } from "../lib/template/useTemplateDatabase";
import { PageHeader } from "./PageHeader";

export function ClientApp() {
  useAssetProtection();

  const { templates, selectedTemplate, selectedTemplateId, setSelectedTemplateId } = useTemplateDatabase();
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(selectedTemplate.variants[0]?.id ?? "");

  useEffect(() => {
    setSelectedVariantId(selectedTemplate.variants[0]?.id ?? "");
  }, [selectedTemplate.id]);

  const selectedVariant = useMemo(() => {
    return selectedTemplate.variants.find((variant) => variant.id === selectedVariantId) ?? selectedTemplate.variants[0];
  }, [selectedTemplate, selectedVariantId]);

  return (
    <main className="app-shell">
      <PageHeader title="余白工坊" template={selectedTemplate} showStatus={false} />

      <section className={`template-picker ${isTemplatePickerOpen ? "is-open" : ""}`}>
        <div className="panel-heading">
          <button
            className="library-toggle"
            type="button"
            aria-expanded={isTemplatePickerOpen}
            onClick={() => setIsTemplatePickerOpen((isOpen) => !isOpen)}
          >
            {isTemplatePickerOpen ? <X size={18} /> : <Menu size={18} />}
            <span>選擇模板</span>
            <small>{selectedTemplate.name}</small>
          </button>
        </div>
        {isTemplatePickerOpen ? (
          <div className="template-menu-grid">
            <div className="template-card-grid">
              {templates.map((template) => {
                const preview = template.variants[0];
                return (
                  <button
                    className={`template-card ${selectedTemplateId === template.id ? "is-active" : ""}`}
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      setIsTemplatePickerOpen(false);
                    }}
                  >
                    <img draggable={false} src={preview.overlayUrl} alt={template.name} />
                    <span>{template.name}</span>
                    <small>{template.variants.length} 個選項</small>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {selectedVariant ? (
        <UserComposer
          template={selectedTemplate}
          variant={selectedVariant}
          selectedVariantId={selectedVariant.id}
          onSelectVariant={setSelectedVariantId}
        />
      ) : null}
    </main>
  );
}
