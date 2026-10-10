/**
 * Local-only OCR. Browser downloads the Tesseract engine/models from public
 * CDNs, but screenshots and OCR results never leave the browser.
 */
import { detectMerchant } from "./purchase-dimensions";

type Recognizable = File | HTMLCanvasElement;
type OCRWorker = {
  recognize(image: Recognizable): Promise<{ data: { text: string } }>;
  setParameters(parameters: Record<string, string>): Promise<unknown>;
  terminate(): Promise<unknown>;
};
type OCRLibrary = {
  createWorker(
    lang: string,
    oem: number,
    options: { logger: (message: { status: string; progress?: number }) => void; workerPath: string; corePath: string; langPath: string },
  ): Promise<OCRWorker>;
};
type OCRWindow = Window & { Tesseract?: OCRLibrary };

const ENGINE = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
let loader: Promise<OCRLibrary> | null = null;

function loadEngine(): Promise<OCRLibrary> {
  if (typeof window === "undefined") return Promise.reject(new Error("请在浏览器中使用截图识别"));
  const global = window as OCRWindow;
  if (global.Tesseract) return Promise.resolve(global.Tesseract);
  if (loader) return loader;
  loader = new Promise<OCRLibrary>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = ENGINE;
    script.crossOrigin = "anonymous";
    script.onload = () => global.Tesseract
      ? resolve(global.Tesseract)
      : reject(new Error("OCR 引擎加载失败"));
    script.onerror = () => {
      script.remove();
      reject(new Error("OCR 引擎下载失败，请检查网络或浏览器拦截设置"));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    loader = null;
    throw error;
  });
  return loader!;
}

/**
 * The full-page layout model can skip very large, bold amounts surrounded by
 * whitespace (e.g. ¥25.74). Recognizing an enlarged, binarized *local crop*
 * separately solves that without sending a screenshot to a server.
 */
async function croppedCanvas(
  file: File,
  rect: { x: number; y: number; w: number; h: number },
  binary = true,
): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    const sx = Math.floor(bitmap.width * rect.x);
    const sy = Math.floor(bitmap.height * rect.y);
    const sw = Math.max(1, Math.min(bitmap.width - sx, Math.floor(bitmap.width * rect.w)));
    const sh = Math.max(1, Math.min(bitmap.height - sy, Math.floor(bitmap.height * rect.h)));
    const scale = Math.min(3, 1800 / sw, 1350 / sh);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("无法创建图片处理画布");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    if (!binary) return canvas;

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    // A global threshold is appropriate for a flat-colored payment UI; decide
    // inversion by background brightness to support dark-mode screenshots.
    let total = 0;
    for (let i = 0; i < data.length; i += 4)
      total += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const dark = total / (data.length / 4) < 110;
    for (let i = 0; i < data.length; i += 4) {
      const luminosity = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const value = (dark ? 255 - luminosity : luminosity) > 170 ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}

function hasAmount(text: string) {
  return /[¥￥]\s*\d+(?:[.,]\d+)?|\d{1,9}\.\d{2}(?!\d)/.test(text);
}

export async function recognizePaymentScreenshot(
  file: File,
  onProgress: (message: string) => void,
): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type))
    throw new Error("只支持 PNG、JPG 或 WebP 图片");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("截图不能超过 10MB");
  const engine = await loadEngine();
  let worker: OCRWorker | undefined;
  try {
    onProgress("正在加载中英文识别模型，首次使用可能需要稍等…");
    worker = await engine.createWorker("chi_sim+eng", 1, {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      logger: (event) => {
        if (event.status === "recognizing text")
          onProgress("正在本机识别文字：" + Math.round((event.progress ?? 0) * 100) + "%");
      },
    });
    const fullText = (await worker.recognize(file)).data.text;
    const results = [fullText];

    // PSM 7 often mistakes short Chinese merchant text beside an app logo
    // for Latin characters. A focused top-left crop with text-block PSM 6
    // successfully recovered the merchant in the supplied payment example.
    if (!detectMerchant(fullText)) {
      const trials = [
        { region: { x: 0.03, y: 0.015, w: 0.62, h: 0.18 }, binary: false, psm: "6" },
        { region: { x: 0.03, y: 0.015, w: 0.62, h: 0.18 }, binary: true, psm: "6" },
        { region: { x: 0, y: 0, w: 1, h: 0.25 }, binary: false, psm: "11" },
      ];
      for (const [index, trial] of trials.entries()) {
        if (detectMerchant(results.join("\n"))) break;
        try {
          onProgress("正在单独识别中文商家（" + (index + 1) + "/" + trials.length + "）…");
          await worker.setParameters({ tessedit_pageseg_mode: trial.psm });
          const header = await croppedCanvas(file, trial.region, trial.binary);
          const recognized = (await worker.recognize(header)).data.text.trim();
          if (recognized) results.push("商家区域识别" + (index + 1) + ":\n" + recognized);
        } catch {
          // Keep full-page OCR. Missing details require manual confirmation.
        }
      }
    }
    if (!hasAmount(results.join("\n"))) {
      try {
        onProgress("正在放大识别支付金额…");
        await worker.setParameters({ tessedit_pageseg_mode: "6" });
        const amountRegion = await croppedCanvas(file, { x: 0.08, y: 0.22, w: 0.84, h: 0.58 });
        results.push((await worker.recognize(amountRegion)).data.text);
      } catch {
        // The user can still supply the missing amount manually.
      }
    }
    return results.filter(Boolean).join("\n");
  } finally {
    await worker?.terminate();
  }
}
