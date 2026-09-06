import mongoose from "mongoose";
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, default: null, trim: true },
  type: { type: String, default: "system", trim: true, maxlength: 100 },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, default: "", trim: true, maxlength: 5000 },
  link: { type: String, default: "", maxlength: 2000 },
  refModel: { type: String, default: "", trim: true, maxlength: 100 },
  refId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isRead: { type: Boolean, default: false },
  readAt: Date,
}, { timestamps: true });
notificationSchema.pre("validate", function(next) {
  if (this.refId && !this.refModel) this.invalidate("refModel", "refModel is required with refId");
  if (this.isRead && !this.readAt) this.readAt = new Date();
  if (!this.isRead) this.readAt = undefined;
  next();
});
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
export const Notification = mongoose.model("Notification", notificationSchema);
