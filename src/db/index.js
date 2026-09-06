import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
let connectionPromise=null;
const connectDB=async()=>{
  if(mongoose.connection.readyState===1)return mongoose.connection;
  if(!process.env.MONGODB_URI)throw new Error("MONGODB_URI is not configured");
  if(!connectionPromise){
    connectionPromise=mongoose.connect(process.env.MONGODB_URI,{
        dbName:process.env.MONGODB_DB_NAME||undefined,
        maxPoolSize:Number(process.env.MONGODB_MAX_POOL_SIZE||20),
        minPoolSize:Number(process.env.MONGODB_MIN_POOL_SIZE||2),
        maxIdleTimeMS:Number(process.env.MONGODB_MAX_IDLE_TIME_MS||60000),
        serverSelectionTimeoutMS:Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS||5000),
        socketTimeoutMS:Number(process.env.MONGODB_SOCKET_TIMEOUT_MS||45000),
        heartbeatFrequencyMS:Number(process.env.MONGODB_HEARTBEAT_MS||10000),
      })
      .then(async c=>{
        // One-time safety cleanup for databases created by older template versions.
        // Refresh tokens must never remain in User documents after the session migration.
        await c.connection.collection("users").updateMany(
          { refreshToken: { $exists: true } },
          { $unset: { refreshToken: "" } }
        );
        logger.info("mongodb_connected", { host: c.connection.host, database: c.connection.name });
        return c.connection;
      })
      .catch(e=>{connectionPromise=null;throw e;});
  }
  return connectionPromise;
};
export default connectDB;
