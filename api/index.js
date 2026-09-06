import "dotenv/config";
import app from "../src/app.js";
import connectDB from "../src/db/index.js";

await connectDB();
export default app;
