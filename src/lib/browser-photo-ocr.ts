/**
 * Tesseract runs WebAssembly in the visitor's browser. The screenshot/File is
 * never posted to our server or an OCR service. The first run downloads the
 * OCR runtime and Chinese/English recognition models from public CDNs.
 */
type OCRWorker = {
  recognize(image: File): Promise<{ data: { text: string } }>;
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

export async function recognizePaymentScreenshot(file: File, onProgress: (message: string) => void): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type))
    throw new Error("只支持 PNG、JPG 或 WebP 图片");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("截图不能超过 10MB");
  const engine = await loadEngine();
  let worker: OCRWorker | undefined;
  try {
    onProgress("正在加载中文与英文识别模型，首次使用可能需要稍等…");
    worker = await engine.createWorker("chi_sim+eng", 1, {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      logger: (event) => {
        if (event.status === "recognizing text") {
          onProgress("正在本机识别文字：" + Math.round((event.progress ?? 0) * 100) + "%");
        }
      },
    });
    const result = await worker.recognize(file);
    return result.data.text;
  } finally {
    await worker?.terminate();
  }
}
