import mongoose from "mongoose";
const auditLogSchema=new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:"User",default:null,index:true},
  userRole:{type:String,default:"system",trim:true,maxlength:50},
  action:{type:String,required:true,trim:true,maxlength:200,index:true},
  resource:{type:String,default:"",trim:true,maxlength:100,index:true},
  resourceId:{type:mongoose.Schema.Types.ObjectId,default:null},
  ip:{type:String,default:"",maxlength:100},method:{type:String,default:"",maxlength:10},
  url:{type:String,default:"",maxlength:4000},statusCode:{type:Number,default:0,min:0,max:599},
  details:{type:mongoose.Schema.Types.Mixed,default:()=>({})},userAgent:{type:String,default:"",maxlength:2000},
},{timestamps:true});
auditLogSchema.index({createdAt:-1});auditLogSchema.index({user:1,createdAt:-1});auditLogSchema.index({action:1,createdAt:-1});
export const AuditLog=mongoose.model("AuditLog",auditLogSchema);
