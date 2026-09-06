import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: {
    type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
  },
  password: { type: String, required: true, minlength: 8, maxlength: 128, select: false },
  avatar: { type: String, default: "", trim: true },
  avatarPublicId: { type: String, default: "", trim: true },
  bio: { type: String, default: "", trim: true, maxlength: 1000 },
  phone: { type: String, default: "", trim: true, maxlength: 30 },
  profession: { type: String, default: "", trim: true, maxlength: 100 },
  address: { type: String, default: "", trim: true, maxlength: 500 },
  socials: {
    linkedin: { type: String, default: "", trim: true, maxlength: 500 },
    github: { type: String, default: "", trim: true, maxlength: 500 },
    twitter: { type: String, default: "", trim: true, maxlength: 500 },
    website: { type: String, default: "", trim: true, maxlength: 500 },
  },
  permissions: { type: [String], default: [] },
  role: { type: String, default: "user", lowercase: true, trim: true, maxlength: 50, index: true },
  isActivated: { type: Boolean, default: true, index: true },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
}, { timestamps: true });

// Mongoose 9: hooks are promise-based — do not use `next` callback parameters.
userSchema.pre("validate", function () {
  this.permissions = [...new Set((this.permissions || []).map(String))];
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.isPasswordCorrect = function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  return resetToken;
};

export const User = mongoose.model("User", userSchema);
