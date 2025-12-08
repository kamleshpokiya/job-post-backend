import express from "express";
import { enhanceJobDescription } from "../controllers/company/ai.controller.js";
const router = express.Router();

router.post("/enhance-job-description", enhanceJobDescription);

export default router;