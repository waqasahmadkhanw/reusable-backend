import "dotenv/config";
import mongoose from "mongoose";
import "../src/models/announcement.model.js";
import "../src/models/auditLog.model.js";
import "../src/models/coupon.model.js";
import "../src/models/couponCustomerUsage.model.js";
import "../src/models/event.model.js";
import "../src/models/media.model.js";
import "../src/models/notification.model.js";
import "../src/models/order.model.js";
import "../src/models/webhookEvent.model.js";
import "../src/models/paymentIdempotency.model.js";
import "../src/models/operationLock.model.js";
import "../src/models/payment.model.js";
import "../src/models/role.model.js";
import "../src/models/setting.model.js";
import "../src/models/user.model.js";

try{
  if(!process.env.MONGODB_URI)throw new Error("MONGODB_URI is required");
  await mongoose.connect(process.env.MONGODB_URI,{dbName:process.env.MONGODB_DB_NAME||undefined});
  for(const model of Object.values(mongoose.models)){await model.syncIndexes();console.log(`Indexes synchronized: ${model.modelName}`);}
}catch(error){console.error("Index synchronization failed:",error.message);process.exitCode=1;}
finally{await mongoose.disconnect().catch(()=>{});}
