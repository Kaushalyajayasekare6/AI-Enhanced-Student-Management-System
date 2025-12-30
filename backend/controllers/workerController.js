import Worker from "../models/workerModel.js";

// ➕ Add new worker
export const addWorker = async (req, res) => {
  try {
    const worker = new Worker(req.body);
    const savedWorker = await worker.save();
    res.status(201).json(savedWorker);
  } catch (err) {
    console.error("❌ Error adding worker:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Worker ID already exists!" });
    }
    res.status(500).json({ message: "Failed to add worker" });
  }
};

// 📋 Get all workers
export const getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find();
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 👁 Get single worker
export const getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✏️ Update worker
export const updateWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ❌ Delete worker
export const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) return res.status(404).json({ message: "Worker not found" });
    res.json({ message: "Worker deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
