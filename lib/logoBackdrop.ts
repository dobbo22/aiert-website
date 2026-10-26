// The plate colour behind a company logo or favicon, chosen from the image's own colours so it is clearly visible:
//  - a logo with its own solid background (a square icon): the plate takes that colour, so no white box shows around it;
//  - a light logo on a transparent background (white lettering): a dark plate, so it does not vanish on white;
//  - anything else (dark or coloured on transparent): white.
// The iPhone and Android apps use the same rules. Browser only (reads pixels through a canvas).

const DARK = "#1c1f26";

/** The image must have been loaded with crossOrigin="anonymous"; returns null if its pixels cannot be read. */
export function plateFor(img: HTMLImageElement): string | null {
  try {
    const n = 24;
    const canvas = document.createElement("canvas");
    canvas.width = n;
    canvas.height = n;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, n, n);
    const px = ctx.getImageData(0, 0, n, n).data; // non-premultiplied RGBA
    const at = (x: number, y: number) => {
      const i = (y * n + x) * 4;
      return { r: px[i] / 255, g: px[i + 1] / 255, b: px[i + 2] / 255, a: px[i + 3] / 255 };
    };
    let er = 0, eg = 0, eb = 0, ea = 0, en = 0;
    for (let k = 0; k < n; k++) {
      for (const [x, y] of [[k, 0], [k, n - 1], [0, k], [n - 1, k]]) {
        const q = at(x, y);
        er += q.r * q.a; eg += q.g * q.a; eb += q.b * q.a; ea += q.a; en++;
      }
    }
    if (en > 0 && ea > 0 && ea / en > 0.85) {
      return `rgb(${Math.round((er / ea) * 255)}, ${Math.round((eg / ea) * 255)}, ${Math.round((eb / ea) * 255)})`;
    }
    let lum = 0, weight = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const q = at(x, y);
        if (q.a <= 0.3) continue;
        lum += (0.2126 * q.r + 0.7152 * q.g + 0.0722 * q.b) * q.a;
        weight += q.a;
      }
    }
    if (weight <= 0) return "#ffffff";
    return lum / weight > 0.72 ? DARK : "#ffffff";
  } catch {
    return null;
  }
}

/** Loads the image again with CORS on, just to read its colours; calls back with the plate colour (never throws). */
export function probePlate(src: string, done: (plate: string) => void) {
  const probe = new Image();
  probe.crossOrigin = "anonymous";
  probe.onload = () => {
    const plate = plateFor(probe);
    if (plate) done(plate);
  };
  probe.src = src;
}
