import mongoose from "mongoose";
import { Order } from "../models/order.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const id = (v) => { if (!mongoose.Types.ObjectId.isValid(v)) throw new ApiError(400, "Invalid order ID"); };
const canManage = (req) => (req.userPermissions || []).includes("manage_payments");

export const getMyOrders = asyncHandler(async (req,res) => {
  const page=Math.max(Number.parseInt(req.query.page,10)||1,1);
  const limit=Math.min(Math.max(Number.parseInt(req.query.limit,10)||20,1),100);
  const filter={customer:req.user._id};
  if(req.query.status)filter.status=req.query.status;
  if(req.query.paymentStatus)filter.paymentStatus=req.query.paymentStatus;
  const [orders,total]=await Promise.all([
    Order.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit),
    Order.countDocuments(filter)
  ]);
  res.status(200).json(new ApiResponse(200,{orders,pagination:{total,page,pages:Math.ceil(total/limit)}},"Orders fetched"));
});

export const getAllOrders=asyncHandler(async(req,res)=>{
  const page=Math.max(Number.parseInt(req.query.page,10)||1,1);
  const limit=Math.min(Math.max(Number.parseInt(req.query.limit,10)||20,1),100);
  const filter={}; if(req.query.status)filter.status=req.query.status; if(req.query.paymentStatus)filter.paymentStatus=req.query.paymentStatus;
  const [orders,total]=await Promise.all([Order.find(filter).populate("customer","name email").sort({createdAt:-1}).skip((page-1)*limit).limit(limit),Order.countDocuments(filter)]);
  res.status(200).json(new ApiResponse(200,{orders,pagination:{total,page,pages:Math.ceil(total/limit)}},"Orders fetched"));
});

export const getOrderById=asyncHandler(async(req,res)=>{
  id(req.params.id); const order=await Order.findById(req.params.id).populate("customer","name email");
  if(!order)throw new ApiError(404,"Order not found");
  if(!canManage(req)&&order.customer._id.toString()!==req.user._id.toString())throw new ApiError(403,"Not authorized");
  res.status(200).json(new ApiResponse(200,order,"Order fetched"));
});

export const cancelOrder=asyncHandler(async(req,res)=>{
  id(req.params.id);
  const filter={_id:req.params.id, status:"pending", paymentStatus:{ $in:["pending","failed"] }};
  if(!canManage(req))filter.customer=req.user._id;
  const order=await Order.findOneAndUpdate(filter,{$set:{status:"cancelled",cancelledAt:new Date()}},{new:true});
  if(!order){
    const existing=await Order.findById(req.params.id).select("customer status paymentStatus");
    if(!existing)throw new ApiError(404,"Order not found");
    if(!canManage(req)&&existing.customer.toString()!==req.user._id.toString())throw new ApiError(403,"Not authorized");
    throw new ApiError(409,"Order cannot be cancelled in its current state");
  }
  res.status(200).json(new ApiResponse(200,order,"Order cancelled"));
});
