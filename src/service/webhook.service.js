import {WebhookEvent} from "../models/webhookEvent.model.js";
const TTL_MS=7*24*60*60*1000;
export const claimWebhookEvent=async(provider,eventId,eventType="")=>{try{return {event:await WebhookEvent.create({provider,eventId,eventType,expiresAt:new Date(Date.now()+TTL_MS)}),duplicate:false};}catch(error){if(error?.code!==11000)throw error;const existing=await WebhookEvent.findOne({provider,eventId});return {event:existing,duplicate:true};}};
export const markWebhookProcessed=event=>WebhookEvent.updateOne({_id:event._id},{$set:{status:"processed",processedAt:new Date(),errorMessage:""}});
export const markWebhookFailed=(event,error)=>WebhookEvent.updateOne({_id:event._id},{$set:{status:"failed",errorMessage:String(error?.message||"Webhook failed").slice(0,500)}});
