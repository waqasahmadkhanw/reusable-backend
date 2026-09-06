import mongoose from "mongoose";
const mediaSchema = new mongoose.Schema({
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  publicId: { type: String, required: true, unique: true, index: true },
  url: { type: String, required: true, trim: true },
  secureUrl: { type: String, required: true, trim: true },
  filename: { type: String, default: "", trim: true, maxlength: 255 },
  format: { type: String, default: "", trim: true, maxlength: 50 },
  resourceType: { type: String, enum: ["image", "video", "raw"], default: "image" },
  size: { type: Number, default: 0, min: 0 },
  width: { type: Number, default: 0, min: 0 },
  height: { type: Number, default: 0, min: 0 },
  mimeType: { type: String, default: "", trim: true, maxlength: 100 },
  mediaType: { type: String, enum: ["image", "video", "document", "audio", "other"], default: "other" },
  usage: { type: String, default: "", trim: true, maxlength: 100 },
  altText: { type: String, default: "", trim: true, maxlength: 500 },
  isPublic: { type: Boolean, default: true },
  status: { type: String, enum: ["active", "deleted"], default: "active" },
}, { timestamps: true });
mediaSchema.pre("validate", function (next) {
  if (this.status === "deleted") this.isPublic = false;
  next();
});
mediaSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaSchema.index({ mediaType: 1, status: 1 });
export const Media = mongoose.model("Media", mediaSchema);
