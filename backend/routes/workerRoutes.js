import express from "express";
import {
  addWorker,
  getWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
} from "../controllers/workerController.js";

const router = express.Router();

router.post("/", addWorker);
router.get("/", getWorkers);
router.get("/:id", getWorkerById);
router.put("/:id", updateWorker);
router.delete("/:id", deleteWorker);

export default router;
