import express from "express";
import { predictMarksML, predictTermMarksML } from "../controllers/mlMarksController.js";
import { predictDropoutRisk, predictDropoutRiskForClass } from "../controllers/dropoutController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes - requires authentication
router.post("/predict-marks", protect, predictMarksML);
router.post("/predict-term-marks", protect, predictTermMarksML);
router.post("/predict-dropout", protect, predictDropoutRisk);
router.get("/predict-dropout/class", protect, predictDropoutRiskForClass);

export default router;

