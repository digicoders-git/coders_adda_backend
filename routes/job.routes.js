import express from "express";
import {
  createJob,
  updateJob,
  deleteJob,
  getSingleJob,
  getAllJobs,
  toggleJobStatus
} from "../controllers/job.controller.js";

const jobRoute = express.Router();

jobRoute.post("/create", createJob);
jobRoute.get("/get", getAllJobs);
jobRoute.get("/get/:id", getSingleJob);
jobRoute.put("/update/:id", updateJob);
jobRoute.delete("/delete/:id", deleteJob);
jobRoute.patch("/toggle-status/:id", toggleJobStatus);

export default jobRoute;
