import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempOutDir = resolve(root, ".standalone-build");
const standalonePath = resolve(root, "open.html");

await rm(tempOutDir, { recursive: true, force: true });

await build({
  root,
  base: "./",
  configFile: false,
  plugins: [react()],
  logLevel: "silent",
  build: {
    outDir: tempOutDir,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, "standalone.html")
    }
  }
});

const builtHtmlPath = resolve(tempOutDir, "standalone.html");
let html = await readFile(builtHtmlPath, "utf8");

html = await inlineStyles(html);
html = await inlineScripts(html);
html = html.replace(/<link rel="modulepreload"[^>]+>\s*/g, "");

await writeFile(standalonePath, html, "utf8");
await rm(tempOutDir, { recursive: true, force: true });

async function inlineStyles(htmlContent) {
  const stylesheetPattern = /<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/g;
  let nextHtml = htmlContent;
  const matches = [...htmlContent.matchAll(stylesheetPattern)];

  for (const match of matches) {
    const css = await readFile(resolve(tempOutDir, match[1]), "utf8");
    const safeCss = css.replace(/<\/style/gi, "<\\/style");
    nextHtml = nextHtml.replace(match[0], `<style>${safeCss}</style>`);
  }

  return nextHtml;
}

async function inlineScripts(htmlContent) {
  const scriptPattern = /<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/g;
  let nextHtml = htmlContent;
  const matches = [...htmlContent.matchAll(scriptPattern)];

  for (const match of matches) {
    const js = await readFile(resolve(tempOutDir, match[1]), "utf8");
    const safeJs = js.replace(/<\/script/gi, "<\\/script");
    nextHtml = nextHtml.replace(match[0], `<script>${safeJs}</script>`);
  }

  return nextHtml;
}
