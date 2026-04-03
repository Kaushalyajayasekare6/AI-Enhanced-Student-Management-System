# Marks Prediction API - Complete Documentation

## Overview
This is a **FastAPI-based machine learning service** that predicts student marks for multiple subjects based on current marks and attendance. It uses pre-trained machine learning models to forecast performance.

---

## Architecture

### Technology Stack
- **Framework**: FastAPI (Python web framework)
- **ML Models**: Pre-trained models saved as `.pkl` files (joblib format)
- **Data Processing**: Pandas & NumPy
- **Server**: Uvicorn ASGI server
- **CORS Support**: Enabled for frontend access

---

## Key Components

### 1. **CORS Middleware Configuration**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```
**Purpose**: Allows the frontend (React apps on ports 3000, 5173, 5174) to make requests to this API.

### 2. **Model Loading (`get_models()` function)**
Loads 6 pre-trained ML models for different subjects:
- **English**
- **Maths**
- **Sinhala**
- **Tamil**
- **Environmental Studies (env)**
- **Religion**

**Implementation Detail**: Models are loaded **lazily** (on each request) rather than at startup. This saves memory but may add slight latency per request.

```python
def get_models():
    return {
        "english": joblib.load(BASE_DIR / "english_best_model.pkl"),
        "maths": joblib.load(BASE_DIR / "maths_best_model.pkl"),
        "sinhala": joblib.load(BASE_DIR / "sinhala_best_model.pkl"),
        "tamil": joblib.load(BASE_DIR / "tamil_best_model.pkl"),
        "env": joblib.load(BASE_DIR / "env_best_model.pkl"),
        "religion": joblib.load(BASE_DIR / "religion_best_model.pkl"),
    }
```

### 3. **RMSE Values**
Loaded from `rmse_values.pkl` - these are **Root Mean Square Error** values used to calculate prediction confidence intervals (min/max ranges).

---

## API Endpoint: `/predict`

### Request Method
**POST** at `http://localhost:8003/predict`

### Input Format
```json
{
  "attendance": 85,
  "english": 75,
  "math": 80,
  "sinhala": 70,
  "tamil": 72,
  "env": 78,
  "religion": 76
}
```

**Parameters**:
- `attendance` (int): Student's attendance percentage
- `english`, `math`, `sinhala`, `tamil`, `env`, `religion` (int): Current marks in each subject

### Output Format
```json
{
  "english": {
    "predicted": 78,
    "min": 72,
    "max": 84
  },
  "math": {
    "predicted": 82,
    "min": 76,
    "max": 88
  },
  ...
}
```

**Output Fields**:
- `predicted`: The predicted mark (rounded to nearest integer)
- `min`: Minimum likely mark (predicted - RMSE)
- `max`: Maximum likely mark (predicted + RMSE)

---

## Prediction Logic

### Feature Engineering
Each prediction uses exactly **2 features**:
1. **Current Mark** (subject-specific)
2. **Attendance Rate**

```python
X_df = pd.DataFrame([[current_mark, attendance]], columns=['env_t1', 'attendance_t1'])
```

### Subject Mapping
Note the mapping between input keys and internal model keys:
```python
subject_mapping = {
    "english": "english",
    "math": "maths",      # INPUT uses "math" but MODEL uses "maths"
    "sinhala": "sinhala",
    "tamil": "tamil",
    "env": "env",
    "religion": "religion"
}
```
**Important**: The API input expects `"math"`, but the model is named `"maths_best_model.pkl"`.

---

## Prediction Accuracy

### Confidence Intervals
The output includes prediction ranges based on RMSE:
- **min** = predicted_mark - RMSE
- **max** = predicted_mark + RMSE

This gives students a realistic range of possible outcomes, accounting for model uncertainty.

### Boundary Constraints
```python
"min": int(round(max(0, predicted - rmse))),      # Can't be below 0
"max": int(round(min(100, predicted + rmse)))     # Can't exceed 100
```
Marks are constrained to the 0-100 range.

---

## Server Configuration

### Startup
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
```
- **Host**: `0.0.0.0` (accessible from any machine on the network)
- **Port**: `8003`

### Running the Server
```bash
python main.py
```

---

## Data Flow

```
Frontend Request (3000/5173/5174)
         ↓
   CORS Middleware (validates origin)
         ↓
   /predict endpoint
         ↓
   Load 6 ML models + RMSE values
         ↓
   For each subject:
     - Extract current mark from input
     - Extract attendance from input
     - Create DataFrame with features
     - Generate prediction
     - Calculate min/max ranges
         ↓
   Return JSON results
         ↓
Frontend receives predictions
```

---

## Performance Considerations

### Potential Issues
1. **Model Loading On Every Request**: The `get_models()` function loads all 6 models from disk on every single prediction request. This is inefficient.

### Optimization Recommendations
```python
# Better approach: Load models once at startup
models_cache = None

@app.on_event("startup")
async def startup_event():
    global models_cache
    models_cache = {
        "english": joblib.load(BASE_DIR / "english_best_model.pkl"),
        "maths": joblib.load(BASE_DIR / "maths_best_model.pkl"),
        # ... etc
    }

@app.post("/predict")
def predict(data: dict):
    results = {}
    models = models_cache  # Use cached models instead
    # ... rest of code
```

---

## Dependencies Required
- `fastapi`
- `uvicorn`
- `joblib`
- `pandas`
- `numpy`

Install with:
```bash
pip install fastapi uvicorn joblib pandas numpy
```

---

## Files Referenced

### Required Model Files
- `english_best_model.pkl`
- `maths_best_model.pkl`
- `sinhala_best_model.pkl`
- `tamil_best_model.pkl`
- `env_best_model.pkl`
- `religion_best_model.pkl`
- `rmse_values.pkl`

All must be in the same directory as `main.py`.

---

## Integration with Frontend

### Example Frontend Call (JavaScript/React)
```javascript
const response = await fetch('http://localhost:8003/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    attendance: 85,
    english: 75,
    math: 80,
    sinhala: 70,
    tamil: 72,
    env: 78,
    religion: 76
  })
});

const predictions = await response.json();
console.log(predictions);
```

---

## Summary

This API is a **machine learning prediction service** that:
- Takes student's current marks + attendance
- Predicts future marks for 6 subjects
- Returns predictions with confidence intervals (min/max)
- Serves predictions to frontend via FastAPI + CORS
- Runs on port 8003

It's designed to help students understand their likely performance trajectory and identify subjects needing improvement.
