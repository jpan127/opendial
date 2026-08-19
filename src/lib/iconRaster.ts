export const ICON_RASTER_SIZE = 256;

export function isSvgDataUrl(value: string): boolean {
  return value.startsWith('data:image/svg+xml');
}

export async function rasterizeSvgDataUrl(dataUrl: string): Promise<string> {
  return rasterizeSvgToPng(svgTextFromDataUrl(dataUrl));
}

/** Draw SVG markup via a blob: URL. NTP blocks data:image/svg+xml as <img> src. */
export async function rasterizeSvgToPng(
  svgText: string,
  size = ICON_RASTER_SIZE,
): Promise<string> {
  const prepared = prepareSvg(svgText, size);
  const objectUrl = URL.createObjectURL(
    new Blob([prepared], { type: 'image/svg+xml;charset=utf-8' }),
  );
  try {
    const image = await loadImage(objectUrl);
    return drawPng(image, size);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Draw an HTTPS SVG into a canvas. `crossOrigin = anonymous` is required so
 * the canvas is not tainted and toDataURL('image/png') is allowed.
 */
export async function rasterizeRemoteToPng(
  url: string,
  size = ICON_RASTER_SIZE,
): Promise<string> {
  const image = await loadImage(url, 'anonymous');
  return drawPng(image, size);
}

function drawPng(image: HTMLImageElement, size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not draw the suggested logo');
  ctx.drawImage(image, 0, 0, size, size);
  return canvas.toDataURL('image/png');
}

function prepareSvg(svgText: string, size: number): string {
  let svg = svgText.trim();
  if (!/\sxmlns=/.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/<svg[^>]*\bwidth=/i.test(svg)) {
    svg = svg.replace(/<svg\b/i, `<svg width="${size}" height="${size}"`);
  }
  return svg;
}

function svgTextFromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : '';
  if (/;base64,/i.test(dataUrl)) {
    const binary = atob(payload);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return decodeURIComponent(payload);
}

function loadImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Must set crossOrigin before src, or the first request is a no-CORS load.
    if (crossOrigin) image.crossOrigin = crossOrigin;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not draw the suggested logo'));
    image.src = src;
  });
}
