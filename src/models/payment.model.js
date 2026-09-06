import mongoose from "mongoose";
const paymentItemSchema = new mongoose.Schema({
  itemId:{type:mongoose.Schema.Types.ObjectId,required:true},
  itemType:{type:String,required:true,trim:true,maxlength:100},
  itemName:{type:String,required:true,trim:true,maxlength:300},
  amount:{type:Number,required:true,min:0},
  quantity:{type:Number,default:1,min:1},
},{_id:false});
const paymentSchema = new mongoose.Schema({
  customer:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true,index:true},
  order:{type:mongoose.Schema.Types.ObjectId,ref:"Order",default:null,index:true},
  coupon:{type:mongoose.Schema.Types.ObjectId,ref:"Coupon",default:null},
  couponCode:{type:String,default:"",uppercase:true,trim:true,maxlength:50},
  couponUsageClaimed:{type:Boolean,default:false},
  items:{type:[paymentItemSchema],default:[]},
  subtotal:{type:Number,default:0,min:0},
  discount:{type:Number,default:0,min:0},
  amount:{type:Number,required:true,min:0},
  currency:{type:String,default:"USD",uppercase:true,minlength:3,maxlength:3},
  paymentMethod:{type:String,enum:["stripe","easypaisa","jazzcash","free","other"],default:"stripe"},
  status:{type:String,enum:["pending","completed","failed","refunded"],default:"pending"},
  stripeSessionId:{type:String,unique:true,sparse:true},
  stripePaymentIntentId:{type:String,unique:true,sparse:true},
  easypaisaTransactionId:{type:String,unique:true,sparse:true,index:true},
  easypaisaOrderReference:{type:String,default:""},
  jazzcashTxnRefNo:{type:String,unique:true,sparse:true,index:true},
  jazzcashBillReference:{type:String,default:"",unique:true,sparse:true,index:true},
  jazzcashMerchantId:{type:String,default:""},
  refundId:{type:String,default:""},
  refundAmount:{type:Number,default:0,min:0},
  refundedAt:Date,
  refundReason:{type:String,default:"",maxlength:500},
  paidAt:Date,
  metadata:{type:Map,of:String,default:{}},
},{timestamps:true});
paymentSchema.index({ order: 1 }, { unique: true, partialFilterExpression: { status: "pending" }, name: "one_pending_payment_per_order" });
paymentSchema.pre("validate",function(next){
  if(this.discount>this.subtotal)this.invalidate("discount","Discount cannot exceed subtotal");
  if(this.refundAmount>this.amount)this.invalidate("refundAmount","Refund cannot exceed payment amount");
  if(this.status==="completed"&&!this.paidAt)this.paidAt=new Date();
  if(this.status==="refunded"&&!this.refundedAt)this.refundedAt=new Date();
  next();
});
paymentSchema.methods.markCompleted=function(){this.status="completed";this.paidAt=new Date();return this.save();};
paymentSchema.methods.markFailed=function(){if(!["completed","refunded"].includes(this.status)){this.status="failed";}return this.save();};
export const Payment=mongoose.model("Payment",paymentSchema);
