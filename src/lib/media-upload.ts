/**
 * Universal Client-Side Media Upload Utility for MOSA.
 * Handles photo compression and short video loading to Data URLs,
 * enabling real device-level file uploads with direct persistence in Neon PostgreSQL.
 */

export interface ProcessedMedia {
  url: string;
  mediaType: "IMAGE" | "VIDEO" | "FILE";
  fileName: string;
  fileSize: number;
}

/**
 * Checks whether a given URL or data string represents a video.
 */
export function isVideoMedia(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.startsWith("data:video/") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov") ||
    lower.includes("video")
  );
}

/**
 * Checks whether a cover image string is the legacy bag placeholder.
 */
export function isLegacyBagPlaceholder(url?: string | null): boolean {
  if (!url) return false;
  return url.includes("photo-1544816155-12df9643f363");
}

/**
 * Processes a File selected from the user's device.
 * For images: optimizes and compresses via canvas to max 1600px width/height.
 * For videos: validates size (max 20MB) and reads as Data URL.
 */
export async function processDeviceUpload(file: File): Promise<ProcessedMedia> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  if (isVideo) {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("Video file size must be 20MB or less.");
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          url: e.target?.result as string,
          mediaType: "VIDEO",
          fileName: file.name,
          fileSize: file.size,
        });
      };
      reader.onerror = () => reject(new Error("Failed to read video file."));
      reader.readAsDataURL(file);
    });
  }

  if (isImage) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target?.result as string;

        // If file is already small (< 300KB), return as-is
        if (file.size < 300 * 1024) {
          return resolve({
            url: rawDataUrl,
            mediaType: "IMAGE",
            fileName: file.name,
            fileSize: file.size,
          });
        }

        // Compress large photos using canvas
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve({
              url: rawDataUrl,
              mediaType: "IMAGE",
              fileName: file.name,
              fileSize: file.size,
            });
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          resolve({
            url: compressed,
            mediaType: "IMAGE",
            fileName: file.name,
            fileSize: Math.round((compressed.length * 3) / 4),
          });
        };
        img.onerror = () => {
          resolve({
            url: rawDataUrl,
            mediaType: "IMAGE",
            fileName: file.name,
            fileSize: file.size,
          });
        };
        img.src = rawDataUrl;
      };
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });
  }

  // Non-image, non-video document (e.g. PDF)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        url: e.target?.result as string,
        mediaType: "FILE",
        fileName: file.name,
        fileSize: file.size,
      });
    };
    reader.onerror = () => reject(new Error("Failed to read document file."));
    reader.readAsDataURL(file);
  });
}
