# Figma 串接與前端修改方式

這個專案先預留 Figma 友善的前端結構，之後可以用兩種方式接 Figma。

## 建議方式

### 方式一：Figma 設計稿人工同步

適合初期：

- Figma 裡定義顏色、字級、間距、按鈕、欄位、面板。
- 前端把這些值放進 `src/design/tokens.ts`。
- 元件樣式集中在 `src/styles/global.css` 和各 component class。

### 方式二：Figma API 同步 tokens

適合後期：

- 在 `.env` 放：

```text
VITE_FIGMA_FILE_KEY=
VITE_FIGMA_ACCESS_TOKEN=
```

- 從 Figma API 讀取設計 tokens。
- 將結果轉成 `src/design/tokens.ts` 或 CSS variables。

## 前端區塊對應

- 管理員模板建立：`src/features/admin`
- 使用者套圖下載：`src/features/composer`
- Figma 設計 tokens：`src/design`
- Canvas 合成邏輯：`src/lib/canvas`
- 模板資料型別：`src/lib/template`
