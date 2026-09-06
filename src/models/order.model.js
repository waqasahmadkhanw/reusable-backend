import mongoose from "mongoose";
const orderItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemType: { type: String, required: true, trim: true, maxlength: 100 },
  name: { type: String, required: true, trim: true, maxlength: 300 },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  discountAmount: { type: Number, default: 0, min: 0 },
}, {_id:false});
const orderSchema = new mongoose.Schema({
  orderNumber: { type:String, unique:true, required:true, index:true },
  customer: { type:mongoose.Schema.Types.ObjectId, ref:"User", required:true, index:true },
  items: { type:[orderItemSchema], required:true, validate:v=>v.length>0 },
  subtotal: { type:Number, required:true, min:0 },
  discount: { type:Number, default:0, min:0 },
  total: { type:Number, required:true, min:0 },
  currency: { type:String, default:"USD", uppercase:true, minlength:3, maxlength:3 },
  coupon: { type:mongoose.Schema.Types.ObjectId, ref:"Coupon", default:null },
  couponCode: { type:String, default:"", uppercase:true, trim:true, maxlength:50 },
  payment: { type:mongoose.Schema.Types.ObjectId, ref:"Payment", default:null },
  paymentStatus: { type:String, enum:["pending","paid","failed","refunded"], default:"pending" },
  status: { type:String, enum:["pending","completed","cancelled"], default:"pending" },
  paidAt: Date, cancelledAt: Date,
}, {timestamps:true});
orderSchema.pre("validate",function(next){
  const subtotal=this.items.reduce((s,i)=>s+Number(i.price||0)*Number(i.quantity||1),0);
  if(Math.abs(subtotal-this.subtotal)>0.01)this.invalidate("subtotal","Subtotal does not match items");
  if(this.discount>this.subtotal)this.invalidate("discount","Discount cannot exceed subtotal");
  if(Math.abs(this.total-(this.subtotal-this.discount))>0.01)this.invalidate("total","Total mismatch");
  if(this.status==="cancelled"&&!this.cancelledAt)this.cancelledAt=new Date();
  if(this.paymentStatus==="paid"&&!this.paidAt)this.paidAt=new Date();
  next();
});
orderSchema.index({customer:1,createdAt:-1});
export const Order=mongoose.model("Order",orderSchema);
