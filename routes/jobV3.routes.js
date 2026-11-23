import express from "express";
import {
  getSingleJobV3,
  getAllJobsV3
} from "../controllers/job.controller.js";
import optionalUserAuth from "../middleware/optionalUserAuth.js";

const jobV3Route = express.Router();

// New V3 APIs with CompanyIsHide logic
jobV3Route.get("/get", optionalUserAuth, getAllJobsV3);
jobV3Route.get("/get/:id", optionalUserAuth, getSingleJobV3);

export default jobV3Route;
