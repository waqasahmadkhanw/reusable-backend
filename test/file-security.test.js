import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { detectFileType, validateUploadedFile } from "../src/utils/fileValidation.js";

test("detects supported PNG content", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-test-"));
  const filePath = path.join(dir, "fake.exe");
  await fs.writeFile(filePath, Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]));
  const detected = await detectFileType(filePath);
  assert.equal(detected.mime, "image/png");
  await fs.rm(dir, { recursive: true, force: true });
});

test("rejects MIME/content mismatch", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-test-"));
  const filePath = path.join(dir, "image.png.upload");
  await fs.writeFile(filePath, Buffer.from("%PDF-1.7\n"));

  await assert.rejects(
    () => validateUploadedFile({ path: filePath, mimetype: "image/png", originalname: "image.png" }, { allowedTypes: "image" }),
    /File type is not allowed|does not match/
  );

  await fs.rm(dir, { recursive: true, force: true });
});

test("rejects unsupported executable content even with an allowed-looking extension", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-test-"));
  const filePath = path.join(dir, "image.png.upload");
  await fs.writeFile(filePath, Buffer.from("MZ\x90\x00\x03\x00\x00\x00"));

  await assert.rejects(
    () => validateUploadedFile({ path: filePath, mimetype: "image/png", originalname: "image.png" }, { allowedTypes: "image" }),
    /Unsupported or invalid file content/
  );

  await fs.rm(dir, { recursive: true, force: true });
});
