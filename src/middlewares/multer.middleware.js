import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { FILE_PROFILES } from "../utils/fileValidation.js";

const tempDir = path.resolve("public/temp");
fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${crypto.randomBytes(16).toString("hex")}`;
    cb(null, `${safeName}.upload`);
  },
});

const allowedMimes = FILE_PROFILES.all;

export const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_SIZE || 10 * 1024 * 1024),
    files: Number(process.env.MAX_UPLOAD_FILES || 10),
    fields: Number(process.env.MAX_UPLOAD_FIELDS || 20),
    parts: Number(process.env.MAX_UPLOAD_PARTS || 30),
  },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    if (!allowedMimes.has(mime)) return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
    cb(null, true);
  },
});
