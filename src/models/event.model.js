import mongoose from "mongoose";
const eventSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: "", trim: true, maxlength: 10000 },
  type: { type: String, default: "general", trim: true, maxlength: 50 },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  allDay: { type: Boolean, default: false },
  recurrence: { type: String, enum: ["none","daily","weekly","monthly"], default: "none" },
  recurrenceEnd: Date,
  location: { type: String, default: "", maxlength: 1000 },
  meetingLink: { type: String, default: "", maxlength: 2000 },
  visibility: { type: String, enum: ["public","authenticated","private"], default: "private" },
  attendees: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
  status: { type: String, enum: ["scheduled","completed","cancelled"], default: "scheduled" },
}, { timestamps:true });
eventSchema.pre("validate",function(next){
  if(this.endTime<=this.startTime)this.invalidate("endTime","End time must be after start time");
  if(this.recurrence !== "none" && !this.recurrenceEnd)this.invalidate("recurrenceEnd","recurrenceEnd is required for recurring events");
  if(this.recurrenceEnd && this.recurrenceEnd<=this.startTime)this.invalidate("recurrenceEnd","recurrenceEnd must be after start time");
  this.attendees=[...new Set(this.attendees.map(String))];
  next();
});
eventSchema.index({createdBy:1,startTime:1});
export const Event=mongoose.model("Event",eventSchema);
