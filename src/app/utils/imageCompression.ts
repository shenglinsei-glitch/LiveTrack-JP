export interface AvatarCompressionResult {
  dataUrl: string;
  sizeBytes: number;
  width: number;
  height: number;
  mimeType: string;
}

export interface AvatarCompressionOptions {
  maxSizePx?: number;
  maxBytes?: number;
  initialQuality?: number;
}

const DEFAULT_MAX_SIZE = 160;
const DEFAULT_MAX_BYTES = 30 * 1024;
const DEFAULT_QUALITY = 0.6;

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    resolve(img);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('画像の読み込みに失敗しました。'));
  };
  img.src = url;
});

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('画像の変換に失敗しました。'));
  reader.readAsDataURL(blob);
});

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('画像の圧縮に失敗しました。'));
      return;
    }
    resolve(blob);
  }, 'image/webp', quality);
});

const drawSquareAvatar = (img: HTMLImageElement, size: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('画像処理を開始できませんでした。');

  const sourceSize = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const sourceX = ((img.naturalWidth || img.width) - sourceSize) / 2;
  const sourceY = ((img.naturalHeight || img.height) - sourceSize) / 2;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
  return canvas;
};

export const getDataUrlByteSize = (dataUrl?: string): number => {
  if (!dataUrl) return 0;
  const base64 = dataUrl.split(',')[1] || '';
  if (!base64) return 0;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(base64.length * 0.75) - padding);
};

export const compressImageFileToAvatarDataUrl = async (
  file: File,
  options: AvatarCompressionOptions = {},
): Promise<AvatarCompressionResult> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください。');
  }

  const maxSizePx = options.maxSizePx ?? DEFAULT_MAX_SIZE;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const initialQuality = options.initialQuality ?? DEFAULT_QUALITY;
  const img = await loadImage(file);

  const attempts = [
    { size: maxSizePx, quality: initialQuality },
    { size: maxSizePx, quality: 0.52 },
    { size: maxSizePx, quality: 0.44 },
    { size: maxSizePx, quality: 0.36 },
    { size: 128, quality: 0.5 },
    { size: 128, quality: 0.42 },
    { size: 128, quality: 0.34 },
    { size: 112, quality: 0.38 },
    { size: 96, quality: 0.34 },
  ].filter((attempt, index, self) => attempt.size > 0 && self.findIndex(item => item.size === attempt.size && item.quality === attempt.quality) === index);

  let best: AvatarCompressionResult | null = null;

  for (const attempt of attempts) {
    const canvas = drawSquareAvatar(img, attempt.size);
    // eslint-disable-next-line no-await-in-loop
    const blob = await canvasToBlob(canvas, attempt.quality);
    // eslint-disable-next-line no-await-in-loop
    const dataUrl = await blobToDataUrl(blob);
    const result: AvatarCompressionResult = {
      dataUrl,
      sizeBytes: blob.size || getDataUrlByteSize(dataUrl),
      width: attempt.size,
      height: attempt.size,
      mimeType: blob.type || 'image/webp',
    };

    if (!best || result.sizeBytes < best.sizeBytes) best = result;
    if (result.sizeBytes <= maxBytes) return result;
  }

  if (!best) throw new Error('画像の圧縮に失敗しました。');
  return best;
};
