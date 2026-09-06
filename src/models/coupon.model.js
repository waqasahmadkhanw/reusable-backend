import mongoose from "mongoose";
const couponSchema = new mongoose.Schema({
  code:{type:String,required:true,unique:true,uppercase:true,trim:true,minlength:2,maxlength:50,index:true},
  discountType:{type:String,enum:["percentage","fixed"],required:true},
  discountValue:{type:Number,required:true,min:0},
  minOrderAmount:{type:Number,default:0,min:0},
  applicableTo:{type:[mongoose.Schema.Types.ObjectId],ref:"User",default:[]},
  itemTypes:{type:[String],default:[]},
  startDate:{type:Date,default:Date.now},
  expiryDate:{type:Date,required:true},
  maxUses:{type:Number,default:0,min:0},
  usedCount:{type:Number,default:0,min:0},
  maxUsesPerUser:{type:Number,default:1,min:1},
  isActive:{type:Boolean,default:true},
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
},{timestamps:true});
couponSchema.pre("validate",function(next){
  if(this.discountType==="percentage"&&this.discountValue>100)this.invalidate("discountValue","Percentage cannot exceed 100");
  if(this.maxUses>0 && this.usedCount>this.maxUses)this.invalidate("maxUses","maxUses cannot be below usedCount");
  if(this.maxUsesPerUser<1)this.invalidate("maxUsesPerUser","maxUsesPerUser must be at least 1");
  if(this.expiryDate<=this.startDate)this.invalidate("expiryDate","Expiry must be after start");
  this.applicableTo=[...new Set(this.applicableTo.map(String))];
  next();
});
couponSchema.methods.isWithinValidity=function(){const now=new Date();return this.isActive&&now>=this.startDate&&now<=this.expiryDate;};
couponSchema.methods.calculateDiscount=function(amount){return this.discountType==="percentage"?Math.min(amount* this.discountValue/100,amount):Math.min(this.discountValue,amount);};
export const Coupon=mongoose.model("Coupon",couponSchema);
