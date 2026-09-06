import { Order } from "../models/order.model.js";
import { Coupon } from "../models/coupon.model.js";
import { CouponUsage } from "../models/couponUsage.model.js";
import { v4 as uuidv4 } from "uuid";

const generateOrderNumber=()=>`ORD-${Date.now()}-${uuidv4().slice(0,8).toUpperCase()}`;

/**
 * Creates an order from server-validated item snapshots.
 * IMPORTANT: callers must resolve prices from their own database/domain
 * before calling this service. Never trust browser-supplied prices.
 */
export const createOrderFromItems = async ({
  customerId, items, currency="USD", couponCode="",
}) => {
  if(!customerId)throw new Error("customerId is required");
  if(!Array.isArray(items)||!items.length)throw new Error("At least one item is required");

  const normalized=items.map(item=>({
    itemId:item.itemId,
    itemType:String(item.itemType||"item"),
    name:String(item.name||"Item"),
    price:Number(item.price),
    quantity:Number(item.quantity||1),
  }));

  const valid=normalized.every(i=>i.itemId&&Number.isFinite(i.price)&&i.price>=0&&Number.isInteger(i.quantity)&&i.quantity>0);
  if(!valid)throw new Error("Invalid server-validated order item");

  const subtotal=normalized.reduce((sum,item)=>sum+item.price*item.quantity,0);
  let discount=0;
  let coupon=null;

  if(couponCode){
    coupon=await Coupon.findOne({code:String(couponCode).trim().toUpperCase(),isActive:true});
    if(!coupon||!coupon.isWithinValidity())throw new Error("Invalid or expired coupon");
    if(coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses)throw new Error("Coupon usage limit reached");
    const userUsage=await CouponUsage.countDocuments({coupon:coupon._id,customer:customerId});
    if(userUsage>=coupon.maxUsesPerUser)throw new Error("Coupon usage limit for this user was reached");
    if(subtotal<coupon.minOrderAmount)throw new Error("Minimum order amount not met");
    if(coupon.itemTypes.length&&normalized.some(item=>!coupon.itemTypes.includes(item.itemType)))throw new Error("Coupon is not valid for one or more items");
    if(coupon.applicableTo.length&&!coupon.applicableTo.some(id=>id.toString()===customerId.toString()))throw new Error("Coupon is not available to this user");
    discount=coupon.calculateDiscount(subtotal);
  }

  return Order.create({
    orderNumber:generateOrderNumber(),customer:customerId,items:normalized,
    subtotal,discount,total:Math.max(subtotal-discount,0),currency,
    coupon:coupon?coupon._id:null,couponCode:coupon?coupon.code:""
  });
};
