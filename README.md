# 余白工坊

余白工坊 is a static photo-template tool. Visitors choose a template, upload photos into the frames, adjust crop/position, and download the finished image at the original template size.

## Local Preview

```bash
pnpm install
pnpm run dev
```

Public client pages:

```text
http://127.0.0.1:5173
http://127.0.0.1:5173/client.html
```

The admin page is intentionally not linked from the public UI. Keep its private URL out of public docs and shared messages.

## Standalone File

After building, `open.html` can be opened directly in a browser. It defaults to the client experience.

## Build

```bash
pnpm run build
```

The publishable files are generated in `dist/`.

## GitHub Pages

This project deploys with GitHub Actions. Push to the `main` branch, then set:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

Public client page:

```text
https://YOUR-GITHUB-NAME.github.io/YOUR-REPO-NAME/
```

Private admin page:

```text
https://YOUR-GITHUB-NAME.github.io/YOUR-REPO-NAME/atelier-vault-7291.html
```
