import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/user.model.js";
import { Role } from "../src/models/role.model.js";
import { ALL_PERMISSIONS } from "../src/constants/permissions.js";
import Dbconnection from "../src/db/index.js";

await Dbconnection();
const email=String(process.env.ADMIN_EMAIL||"").trim().toLowerCase();
const password=String(process.env.ADMIN_PASSWORD||"");
if(!email||!password||password==="change_me_before_running_seed")throw new Error("Set ADMIN_EMAIL and a strong ADMIN_PASSWORD before running the seed");
const name=process.env.ADMIN_NAME||"Administrator";

await Role.updateOne({slug:"admin"},{$set:{name:"Administrator",slug:"admin",permissions:ALL_PERMISSIONS,isSystem:true,isActive:true}}, {upsert:true});
await Role.updateOne({slug:"user"},{$setOnInsert:{name:"User",slug:"user",permissions:[],isSystem:true,isActive:true}}, {upsert:true});

const existing=await User.findOne({email});
if(existing){existing.role="admin";existing.isActivated=true;await existing.save();console.log("Existing user promoted to admin:",email);}
else{await User.create({name,email,password,role:"admin",isActivated:true});console.log("Admin created:",email);}
await mongoose.connection.close();
