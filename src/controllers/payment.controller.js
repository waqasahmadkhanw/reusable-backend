import { Payment } from "../models/payment.model.js";
import { Order } from "../models/order.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createCheckoutSession, createRefund } from "../service/stripe.service.js";
import { createEasyPaisaCheckout, verifyEasyPaisaPayment, refundEasyPaisaPayment } from "../service/easypaisa.service.js";
import { createJazzCashCheckout, verifyJazzCashPayment } from "../service/jazzcash.service.js";
import jazzcashConfig from "../config/jazzcash.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { buildPaymentListFilter } from "../utils/paymentQuery.js";
import { loadPayableOrder, createLinkedPayment, completeFreeOrder, itemSnapshots } from "../service/payment.service.js";
import { finalizeSuccessfulPayment } from "../service/payment-finalization.service.js";
import { beginPaymentIdempotency, completePaymentIdempotency, failPaymentIdempotency } from "../service/payment-idempotency.service.js";

const canManage=req=>(req.userPermissions||[]).includes(PERMISSIONS.MANAGE_PAYMENTS);
const idempotent=async(req,res,operation,work)=>{
  const {record,replay}=await beginPaymentIdempotency({customerId:req.user._id,key:req.get("Idempotency-Key"),operation,request:{body:req.body,params:req.params}});
  if(replay)return res.status(record.responseStatus).json(record.responseBody);
  try{const result=await work();await completePaymentIdempotency(record,result.status,result.body);return res.status(result.status).json(result.body);}catch(error){await failPaymentIdempotency(record,error);throw error;}
};

export const createStripePayment=asyncHandler(async(req,res)=>idempotent(req,res,"stripe_checkout",async()=>{
  const order=await loadPayableOrder(req.body.orderId,req.user._id);
  if(order.total<=0){const payment=await completeFreeOrder(order,req.user._id);return {status:200,body:new ApiResponse(200,{paymentId:payment._id},"Order paid successfully")};}
  const payment=await createLinkedPayment({customer:req.user._id,order:order._id,items:itemSnapshots(order),subtotal:order.subtotal,discount:order.discount,amount:order.total,currency:order.currency,paymentMethod:"stripe",status:"pending",metadata:new Map([["gateway","stripe"],["orderId",order._id.toString()]])},order);
  try{const session=await createCheckoutSession({items:[{itemName:`Order ${order.orderNumber}`,amount:Number(order.total),quantity:1}],customerEmail:req.user.email,currency:order.currency,successUrl:process.env.STRIPE_SUCCESS_URL,cancelUrl:process.env.STRIPE_CANCEL_URL,metadata:{orderId:order._id.toString(),customerId:req.user._id.toString(),paymentId:payment._id.toString()},idempotencyKey:`checkout_${payment._id}`});if(!session?.url)throw new ApiError(502,"Stripe did not return a checkout URL");payment.stripeSessionId=session.id;payment.stripePaymentIntentId=session.payment_intent||undefined;await payment.save();return {status:200,body:new ApiResponse(200,{paymentId:payment._id,checkoutUrl:session.url},"Stripe checkout created")};}catch(error){await Payment.updateOne({_id:payment._id,status:"pending"},{$set:{status:"failed"}});throw error;}
}));

export const createEasyPaisaPayment=asyncHandler(async(req,res)=>idempotent(req,res,"easypaisa_checkout",async()=>{
  const order=await loadPayableOrder(req.body.orderId,req.user._id);if(order.currency!=="PKR")throw new ApiError(400,"EasyPaisa payments require PKR currency");
  const payment=await createLinkedPayment({customer:req.user._id,order:order._id,items:itemSnapshots(order),subtotal:order.subtotal,discount:order.discount,amount:order.total,currency:"PKR",paymentMethod:"easypaisa",status:"pending",metadata:new Map([["gateway","easypaisa"],["orderId",order._id.toString()]])},order);
  try{const checkout=await createEasyPaisaCheckout({orderId:order.orderNumber,amount:order.total,email:req.user.email,mobileNumber:req.body.mobileNumber||req.user.phone||"",customerName:req.user.name,paymentId:payment._id.toString()});if(!checkout.redirectUrl)throw new ApiError(502,"EasyPaisa did not return a checkout URL");payment.easypaisaTransactionId=checkout.transactionId;payment.easypaisaOrderReference=`Ref_${order.orderNumber}_${checkout.transactionId}`;await payment.save();return {status:200,body:new ApiResponse(200,{paymentId:payment._id,redirectUrl:checkout.redirectUrl,transactionId:checkout.transactionId},"EasyPaisa checkout created")};}catch(error){await Payment.updateOne({_id:payment._id,status:"pending"},{$set:{status:"failed"}});throw error;}
}));

export const handleEasyPaisaConfirmation=asyncHandler(async(req,res)=>{
  const transactionId=String(req.body?.transactionId||"").trim();if(!transactionId)return res.status(400).json({success:false,message:"Transaction ID is required"});
  const payment=await Payment.findOne({easypaisaTransactionId:transactionId});if(!payment)return res.status(404).json({success:false,message:"Payment not found"});
  const result=await verifyEasyPaisaPayment({transactionId,orderRef:payment.easypaisaOrderReference});
  if(result.isSuccess){await finalizeSuccessfulPayment(payment._id,{},result.amount===null?null:result.amount);}else if(payment.status==="pending")await Payment.updateOne({_id:payment._id,status:"pending"},{$set:{status:"failed"}});
  const current=await Payment.findById(payment._id).select("status");return res.status(200).json(new ApiResponse(200,{status:current.status},"EasyPaisa confirmation handled"));
});

export const createJazzCashPayment=asyncHandler(async(req,res)=>idempotent(req,res,"jazzcash_checkout",async()=>{
  const order=await loadPayableOrder(req.body.orderId,req.user._id);if(order.currency!=="PKR")throw new ApiError(400,"JazzCash payments require PKR currency");
  const payment=await createLinkedPayment({customer:req.user._id,order:order._id,items:itemSnapshots(order),subtotal:order.subtotal,discount:order.discount,amount:order.total,currency:"PKR",paymentMethod:"jazzcash",status:"pending",metadata:new Map([["gateway","jazzcash"],["orderId",order._id.toString()]])},order);
  try{const checkout=await createJazzCashCheckout({orderId:order.orderNumber,paymentId:payment._id.toString(),amount:order.total,email:req.user.email,mobileNumber:req.body.mobileNumber||req.user.phone||"",customerName:req.user.name,successUrl:process.env.JAZZCASH_SUCCESS_URL||`${process.env.WEB_URL||""}/payment-success`,cancelUrl:process.env.JAZZCASH_CANCEL_URL||`${process.env.WEB_URL||""}/payment-cancel`});payment.jazzcashBillReference=checkout.transactionId;payment.jazzcashMerchantId=checkout.formFields.pp_MerchantID||"";await payment.save();return {status:200,body:new ApiResponse(200,{paymentId:payment._id,gatewayUrl:checkout.gatewayUrl,formFields:checkout.formFields,secureHash:checkout.secureHash,transactionId:checkout.transactionId},"JazzCash checkout created")};}catch(error){await Payment.updateOne({_id:payment._id,status:"pending"},{$set:{status:"failed"}});throw error;}
}));

export const handleJazzCashReturn=asyncHandler(async(req,res)=>{
  const data=req.body&&Object.keys(req.body).length?req.body:req.query;const result=verifyJazzCashPayment(data);
  if(!result.merchantId||result.merchantId!==jazzcashConfig.merchantId||!result.hashValid)return res.status(400).json({success:false,message:"Invalid payment signature"});
  const payment=await Payment.findOne({jazzcashBillReference:String(data.pp_BillReference||"")});if(!payment)return res.status(404).json({success:false,message:"Payment not found"});
  if(result.approved){await finalizeSuccessfulPayment(payment._id,{jazzcashTxnRefNo:result.transactionRef||""},result.amount);return res.redirect(process.env.JAZZCASH_SUCCESS_REDIRECT||`${process.env.WEB_URL||""}/payment-success`);}
  if(payment.status==="pending")await Payment.updateOne({_id:payment._id,status:"pending"},{$set:{status:"failed"}});return res.redirect(process.env.JAZZCASH_CANCEL_REDIRECT||`${process.env.WEB_URL||""}/payment-cancel`);
});

export const getMyPayments=asyncHandler(async(req,res)=>{const page=Math.max(Number.parseInt(req.query.page,10)||1,1),limit=Math.min(Math.max(Number.parseInt(req.query.limit,10)||20,1),100);const filter={customer:req.user._id};const [payments,total]=await Promise.all([Payment.find(filter).populate("order","orderNumber total currency").sort({createdAt:-1}).skip((page-1)*limit).limit(limit),Payment.countDocuments(filter)]);res.status(200).json(new ApiResponse(200,{payments,pagination:{total,page,pages:Math.ceil(total/limit)}},"Payments fetched"));});
export const getAllPayments=asyncHandler(async(req,res)=>{const page=Math.max(Number.parseInt(req.query.page,10)||1,1),limit=Math.min(Math.max(Number.parseInt(req.query.limit,10)||20,1),100);const filter=await buildPaymentListFilter(req.query);const [payments,total]=await Promise.all([Payment.find(filter).populate("customer","name email").populate("order","orderNumber total").sort({createdAt:-1,_id:-1}).skip((page-1)*limit).limit(limit),Payment.countDocuments(filter)]);res.status(200).json(new ApiResponse(200,{payments,pagination:{total,page,pages:Math.max(1,Math.ceil(total/limit))},filters:{status:req.query.status||null,paymentMethod:req.query.paymentMethod||null,search:req.query.search||null,customer:req.query.customer||null,order:req.query.order||null,from:req.query.from||null,to:req.query.to||null}},"Payments fetched"));});
export const getPaymentById=asyncHandler(async(req,res)=>{const p=await Payment.findById(req.params.id).populate("customer","name email").populate("order","orderNumber total currency");if(!p)throw new ApiError(404,"Payment not found");if(!canManage(req)&&p.customer._id.toString()!==req.user._id.toString())throw new ApiError(403,"Not authorized");res.status(200).json(new ApiResponse(200,p,"Payment fetched"));});

export const refundPayment=asyncHandler(async(req,res)=>idempotent(req,res,"refund",async()=>{
  const reason=req.body.reason||"requested_by_customer";
  const updated=await (async()=>{const payment=await Payment.findById(req.params.id);if(!payment)throw new ApiError(404,"Payment not found");if(payment.status!=="completed")throw new ApiError(400,"Only completed payments can be refunded");
    if(payment.paymentMethod==="stripe"&&!payment.stripePaymentIntentId)throw new ApiError(409,"Stripe payment intent ID is missing");
    if(payment.paymentMethod==="easypaisa"&&!payment.easypaisaTransactionId)throw new ApiError(409,"EasyPaisa transaction ID missing");
    if(!["stripe","easypaisa"].includes(payment.paymentMethod))throw new ApiError(400,"Refund is not implemented for this gateway");
    const refundId=payment.paymentMethod==="stripe"?((await createRefund({paymentIntentId:payment.stripePaymentIntentId,amount:payment.amount,reason,idempotencyKey:`refund_${payment._id}`})).id):((await refundEasyPaisaPayment({transactionId:payment.easypaisaTransactionId,amount:payment.amount,idempotencyKey:`refund_${payment._id}`}))?.transactionId||"");
    if(!refundId)throw new ApiError(502,"Gateway did not return a refund reference");
    const changed=await Payment.findOneAndUpdate({_id:payment._id,status:"completed"},{$set:{status:"refunded",refundId,refundAmount:payment.amount,refundReason:reason,refundedAt:new Date()}},{new:true});if(!changed)throw new ApiError(409,"Payment was already changed");if(changed.order)await Order.updateOne({_id:changed.order,payment:changed._id},{$set:{paymentStatus:"refunded",status:"cancelled",cancelledAt:new Date()}});return changed;})();
  return {status:200,body:new ApiResponse(200,updated,"Payment refunded successfully")};
}));
