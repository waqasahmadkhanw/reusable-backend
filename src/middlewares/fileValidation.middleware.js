import fs from "fs/promises";
import { ApiError } from "../utils/ApiError.js";
import { validateUploadedFile } from "../utils/fileValidation.js";

const cleanup = async (files) => {
  for (const file of files || []) {
    if (file?.path) await fs.unlink(file.path).catch(() => {});
  }
};

export const validateUploadedFileMiddleware = ({ allowedTypes = "all", required = true } = {}) => async (req, _res, next) => {
  try {
    if (!req.file) {
      if (required) throw new ApiError(400, "File is required");
      return next();
    }
    await validateUploadedFile(req.file, { allowedTypes });
    next();
  } catch (error) {
    await cleanup([req.file]);
    next(error);
  }
};
