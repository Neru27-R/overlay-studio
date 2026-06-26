export const GOOGLE_FONTS = [
  "Zen Maru Gothic",
  "Noto Sans TC",
  "Noto Serif TC",
  "Inter",
  "DM Sans",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "Cormorant Garamond",
  "Lora",
  "Oswald",
  "Roboto",
  "Roboto Condensed",
  "Libre Baskerville",
  "Bodoni Moda",
  "Space Grotesk",
  "Space Mono",
  "IBM Plex Sans",
  "IBM Plex Serif",
  "Source Serif 4"
];

const loadedFonts = new Set<string>();

export function getFontHref(fontFamily: string) {
  const family = fontFamily.trim().replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@300;400;500;600;700;800;900&display=swap`;
}

export function loadGoogleFont(fontFamily: string) {
  if (typeof document === "undefined") return;
  if (!GOOGLE_FONTS.includes(fontFamily) || loadedFonts.has(fontFamily)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = getFontHref(fontFamily);
  link.dataset.fontFamily = fontFamily;
  document.head.appendChild(link);
  loadedFonts.add(fontFamily);
}

export function preloadDefaultFonts() {
  ["Zen Maru Gothic", "Noto Sans TC", "Inter"].forEach(loadGoogleFont);
}
