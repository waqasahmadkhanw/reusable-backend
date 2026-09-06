import mongoose from "mongoose";
import { ALL_PERMISSIONS } from "../constants/permissions.js";

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 50 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 50 },
  description: { type: String, default: "", trim: true, maxlength: 500 },
  permissions: { type: [String], enum: ALL_PERMISSIONS, default: [] },
  isSystem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

roleSchema.pre("validate", function () {
  this.permissions = [...new Set(this.permissions || [])];
  if (this.isSystem && !this.permissions.length) this.invalidate("permissions", "System roles must have permissions");
});
roleSchema.methods.hasPermission = function (permission) {
  return this.isActive && this.permissions.includes(permission);
};
export const Role = mongoose.model("Role", roleSchema);
