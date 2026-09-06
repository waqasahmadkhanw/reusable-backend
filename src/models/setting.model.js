import mongoose from "mongoose";
const settingSchema=new mongoose.Schema({
  key:{type:String,required:true,unique:true,trim:true,lowercase:true,match:[/^[a-z0-9_.-]+$/,"Invalid setting key"]},
  value:{type:mongoose.Schema.Types.Mixed,default:null},
  label:{type:String,default:"",trim:true,maxlength:200},
  group:{type:String,default:"general",trim:true,maxlength:100},
  valueType:{type:String,enum:["string","number","boolean","json","array"],default:"string"},
  isSensitive:{type:Boolean,default:false},
  isPublic:{type:Boolean,default:false},
  isActive:{type:Boolean,default:true},
  updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
},{timestamps:true});
settingSchema.pre("validate",function(next){
  const valid={string:typeof this.value==="string",number:typeof this.value==="number"&&Number.isFinite(this.value),boolean:typeof this.value==="boolean",array:Array.isArray(this.value),json:this.value!==null&&typeof this.value==="object"};
  if(this.value!==null&&this.value!==undefined&&!valid[this.valueType])this.invalidate("value",`Value must match valueType '${this.valueType}'`);
  if(this.isSensitive&&this.isPublic)this.invalidate("isPublic","Sensitive settings cannot be public");
  next();
});
export const Setting=mongoose.model("Setting",settingSchema);
