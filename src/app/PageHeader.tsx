import { ImageDown } from "lucide-react";
import type { ReactNode } from "react";
import type { PhotoTemplate } from "../lib/template/types";

const logoMark = new URL("../assets/yohaku-mark.svg", import.meta.url).href;

type Props = {
  eyebrow?: string;
  title: string;
  template: PhotoTemplate;
  actions?: ReactNode;
  showStatus?: boolean;
};

export function PageHeader({ eyebrow, title, template, actions, showStatus = true }: Props) {
  return (
    <>
      <header className="topbar">
        <div className="brand-lockup">
          <img className="brand-mark" src={logoMark} alt="" draggable={false} aria-hidden="true" />
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
        </div>
        {actions}
      </header>

      {showStatus ? (
        <section className="status-bar">
          <span>模板：{template.name}</span>
          <span>
            尺寸：{template.output.width} x {template.output.height}
          </span>
          <span>圖框：{template.slots.length}</span>
          <span className="status-icon">
            <ImageDown size={16} />
            成品會依模板原始尺寸輸出
          </span>
        </section>
      ) : null}
    </>
  );
}
