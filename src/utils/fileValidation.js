import fs from "fs/promises";
import path from "path";
import { ApiError } from "./ApiError.js";

const SIGNATURES = [
  { mime: "image/jpeg", ext: ".jpg", match: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: ".png", match: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
  { mime: "image/gif", ext: ".gif", match: (b) => b.subarray(0, 6).toString("ascii") === "GIF87a" || b.subarray(0, 6).toString("ascii") === "GIF89a" },
  { mime: "image/webp", ext: ".webp", match: (b) => b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { mime: "application/pdf", ext: ".pdf", match: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
  { mime: "audio/mpeg", ext: ".mp3", match: (b) => b.subarray(0, 3).toString("ascii") === "ID3" || (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { mime: "audio/wav", ext: ".wav", match: (b) => b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WAVE" },
  { mime: "video/mp4", ext: ".mp4", match: (b) => b.length >= 12 && b.subarray(4, 8).toString("ascii") === "ftyp" },
  { mime: "video/quicktime", ext: ".mov", match: (b) => b.length >= 12 && b.subarray(4, 8).toString("ascii") === "ftyp" },
];

export const FILE_PROFILES = {
  image: new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]),
  document: new Set(["application/pdf"]),
  audio: new Set(["audio/mpeg", "audio/wav"]),
  video: new Set(["video/mp4", "video/quicktime"]),
  all: new Set(SIGNATURES.map((item) => item.mime)),
};

export const EXTENSION_BY_MIME = new Map(SIGNATURES.map((item) => [item.mime, item.ext]));

const readHead = async (filePath) => fs.open(filePath, "r").then(async (handle) => {
  try {
    const buffer = Buffer.alloc(4100);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
});

export const detectFileType = async (filePath) => {
  const header = await readHead(filePath);
  return SIGNATURES.find((signature) => signature.match(header)) || null;
};

export const validateUploadedFile = async (file, { allowedTypes = "all" } = {}) => {
  if (!file?.path) throw new ApiError(400, "File is required");

  const maxSize = Number(process.env.MAX_UPLOAD_SIZE || 10 * 1024 * 1024);
  const stat = await fs.stat(file.path).catch(() => null);
  if (!stat?.isFile()) throw new ApiError(400, "Uploaded file is unavailable");
  if (stat.size <= 0) throw new ApiError(400, "Uploaded file is empty");
  if (stat.size > maxSize) throw new ApiError(413, "Uploaded file exceeds the maximum allowed size");

  const detected = await detectFileType(file.path);
  if (!detected) throw new ApiError(415, "Unsupported or invalid file content");

  const allowed = FILE_PROFILES[allowedTypes] || new Set(allowedTypes);
  if (!allowed.has(detected.mime)) {
    throw new ApiError(415, `File type is not allowed. Detected: ${detected.mime}`);
  }

  const declaredMime = String(file.mimetype || "").toLowerCase();
  if (declaredMime && declaredMime !== detected.mime) {
    throw new ApiError(415, "File MIME type does not match its actual content");
  }

  return { ...detected, size: stat.size, originalExtension: path.extname(file.originalname || "").toLowerCase() };
};
