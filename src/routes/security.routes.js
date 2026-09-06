import express from "express";
import { csrfToken } from "../middlewares/csrf.middleware.js";

const router = express.Router();

router.get("/csrf", csrfToken);

export default router;
