# 架構說明

## Template

模板不是單一圖片，而是：

- 管理員上傳的透明 PNG/JPG/WebP 模板圖
- 由模板圖原始寬高決定的輸出尺寸
- 多個可放使用者照片的 slots

## 輸出尺寸

成品 canvas 會使用：

```ts
canvas.width = template.width;
canvas.height = template.height;
```

其中 `template.width` 和 `template.height` 來自管理員上傳圖片的 `naturalWidth` / `naturalHeight`。

## 圖層順序

基本合成順序：

1. 使用者照片 slots
2. 管理員模板 overlay

如果未來需要照片蓋在模板上方，可在 slot 增加 `zIndex` 或 template 增加 layer 設定。
