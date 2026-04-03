from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
import pandas as pd

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Load models lazily
def get_models():
    return {
        "english": joblib.load(BASE_DIR / "english_best_model.pkl"),
        "maths": joblib.load(BASE_DIR / "maths_best_model.pkl"),
        "sinhala": joblib.load(BASE_DIR / "sinhala_best_model.pkl"),
        "tamil": joblib.load(BASE_DIR / "tamil_best_model.pkl"),
        "env": joblib.load(BASE_DIR / "env_best_model.pkl"),
        "religion": joblib.load(BASE_DIR / "religion_best_model.pkl"),
    }

rmse_values = joblib.load(BASE_DIR / "rmse_values.pkl")

@app.post("/predict")
def predict(data: dict):
    attendance = data["attendance"]
    models = get_models()
    results = {}

    # Map input keys to model keys
    subject_mapping = {
        "english": "english",
        "math": "maths",  # input uses "math", model uses "maths"
        "sinhala": "sinhala",
        "tamil": "tamil",
        "env": "env",
        "religion": "religion"
    }

    for input_subject, model_subject in subject_mapping.items():
        if model_subject in models:
            current_mark = data[input_subject]
            # Create DataFrame with correct feature names that the model was trained with
            import pandas as pd
            X_df = pd.DataFrame([[current_mark, attendance]], columns=['env_t1', 'attendance_t1'])
            predicted = models[model_subject].predict(X_df)[0]

            rmse = rmse_values[model_subject]

            results[input_subject] = {
                "predicted": int(round(predicted)),
                "min": int(round(max(0, predicted - rmse))),
                "max": int(round(min(100, predicted + rmse)))
            }

    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
