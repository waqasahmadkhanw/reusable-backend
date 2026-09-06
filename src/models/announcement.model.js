import mongoose from "mongoose";
const attachmentSchema = new mongoose.Schema({
  url: { type: String, default: "" }, filename: { type: String, default: "" }, publicId: { type: String, default: "" },
}, { _id: false });
const announcementSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true, maxlength: 20000 },
  link: { type: String, default: "", maxlength: 2000 },
  attachments: { type: [attachmentSchema], default: [] },
  audience: { type: String, enum: ["all", "authenticated", "role"], default: "all" },
  audienceRole: { type: String, default: "", trim: true, maxlength: 50 },
  isPinned: { type: Boolean, default: false },
  status: { type: String, enum: ["draft", "published", "archived"], default: "published" },
  publishedAt: Date,
}, { timestamps: true });
announcementSchema.pre("validate", function(next) {
  if (this.audience === "role" && !this.audienceRole) this.invalidate("audienceRole", "audienceRole is required for role audience");
  if (this.status === "published" && !this.publishedAt) this.publishedAt = new Date();
  next();
});
announcementSchema.index({ status: 1, createdAt: -1 });
export const Announcement = mongoose.model("Announcement", announcementSchema);
