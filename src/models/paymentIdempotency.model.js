import mongoose from "mongoose";
const schema = new mongoose.Schema({
 customer:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true}, key:{type:String,required:true,trim:true,minlength:8,maxlength:128}, operation:{type:String,required:true,enum:["stripe_checkout","easypaisa_checkout","jazzcash_checkout","refund"]}, requestHash:{type:String,required:true,maxlength:128}, status:{type:String,enum:["processing","completed","failed"],default:"processing",index:true}, responseStatus:{type:Number,default:null}, responseBody:{type:mongoose.Schema.Types.Mixed,default:null}, errorMessage:{type:String,default:"",maxlength:500}, expiresAt:{type:Date,required:true,index:true}
},{timestamps:true});
schema.index({customer:1,key:1},{unique:true}); schema.index({expiresAt:1},{expireAfterSeconds:0});
export const PaymentIdempotency=mongoose.model("PaymentIdempotency",schema);
