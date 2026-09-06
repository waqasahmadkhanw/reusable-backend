import mongoose from "mongoose";
const schema=new mongoose.Schema({provider:{type:String,required:true,enum:["stripe","easypaisa","jazzcash"]},eventId:{type:String,required:true,trim:true,maxlength:255},eventType:{type:String,default:"",maxlength:255},status:{type:String,enum:["processing","processed","failed"],default:"processing"},processedAt:Date,errorMessage:{type:String,default:"",maxlength:500},expiresAt:{type:Date,required:true}},{timestamps:true});
schema.index({provider:1,eventId:1},{unique:true}); schema.index({expiresAt:1},{expireAfterSeconds:0});
export const WebhookEvent=mongoose.model("WebhookEvent",schema);
