// Optimized image processing with compression
export const processImageForOCR = async (
  file: File,
  maxWidth = 1200,
  maxHeight = 1600,
  quality = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64 with compression
      const base64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
      resolve(base64);
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};
