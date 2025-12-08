import express from "express";
import { postJob, getJobs } from "../controllers/company/job.controller.js";

const router = express.Router();

router.post("/post-job", postJob);
router.get("/get-jobs", getJobs);

export default router;

