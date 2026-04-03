from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

import joblib
import pandas as pd
import numpy as np
import uvicorn
from typing import Optional
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Dropout Risk Prediction API", version="1.0.0")

# Lazy load model and scaler (avoid top-level sklearn import)
model = None
scaler = None

# Comment out optional templates/static (not used in API endpoints)
# app.mount("/static", StaticFiles(directory="static"), name="static")
# templates = Jinja2Templates(directory="templates")

class DropoutInput(BaseModel):
    english: float
    math: float
    sinhala: float
    tamil: float
    env: float
    attendance: float

class DropoutResponse(BaseModel):
    risk_level: str
    risk_score: float
    factors: list[str]
    recommendations: list[str]
    prediction_raw: int

@app.post("/predict-dropout", response_model=DropoutResponse)
async def predict_dropout(data: DropoutInput):
    # Compute features for original model
    avg_marks = np.mean([data.english, data.math, data.sinhala, data.tamil, data.env])
    failed_subjects = sum(1 for mark in [data.english, data.math, data.sinhala, data.tamil, data.env] if mark < 50)
    assignment_rate = data.attendance * 0.8 + 20  # Approximate, cap at 100
    assignment_rate = min(assignment_rate, 100.0)
    
    input_data = [[data.attendance, avg_marks, failed_subjects, assignment_rate]]
    df = pd.DataFrame(input_data, columns=["attendance", "avg_marks", "failed_subjects", "assignment_rate"])
    
    global model, scaler
    if model is None:
        import joblib
        model = joblib.load("best_dropout_model.pkl")
        scaler = joblib.load("scaler.pkl")
    df_scaled = scaler.transform(df)
    pred_raw = model.predict(df_scaled)[0]
    
    # Override to high risk if very low performance
    if avg_marks < 20 or data.attendance < 50 or failed_subjects >= 4:
        pred_raw = 2
    
    # Debug prints
    print(f"Input data: english={data.english}, math={data.math}, sinhala={data.sinhala}, tamil={data.tamil}, env={data.env}, attendance={data.attendance}")
    print(f"Computed: avg_marks={avg_marks}, failed_subjects={failed_subjects}, assignment_rate={assignment_rate}")
    print(f"Scaled input: {df_scaled}")
    print(f"Raw prediction: {pred_raw}")
    
    risk_map = {0: "Low", 1: "Medium", 2: "High"}
    risk_level = risk_map[pred_raw]
    
    # Simulate score (0-1)
    risk_score = pred_raw / 2.0
    
    # Dynamic factors and recs based on data
    low_att = data.attendance < 75
    low_avg = avg_marks < 60
    high_fail = failed_subjects > 1
    
    factors = []
    if low_att: factors.append("Low attendance")
    if low_avg: factors.append("Low average marks")
    if high_fail: factors.append(f"High failed subjects ({failed_subjects})")
    
    recommendations = []
    if low_att: recommendations.append("Improve attendance through counseling")
    if low_avg: recommendations.append("Additional tutoring in weak subjects")
    if high_fail: recommendations.append("Focused intervention on failed subjects")
    if not factors: recommendations.append("Maintain current performance")
    
    return DropoutResponse(
        risk_level=risk_level,
        risk_score=risk_score,
        factors=factors,
        recommendations=recommendations,
        prediction_raw=int(pred_raw)
    )

@app.get("/", response_class=HTMLResponse)
async def index():
    # Return simple HTML or redirect to docs
    return """
    <html>
        <head><title>Dropout Risk API</title></head>
        <body>
            <h1>Dropout Risk Prediction API</h1>
            <p>Visit <a href="/docs">/docs</a> for interactive API documentation.</p>
            <p>POST to /predict-dropout with JSON: {"english":75.0, "math":60.0, ...}</p>
        </body>
    </html>
    """

@app.post("/predict", response_model=DropoutResponse)
async def predict_alias(data: DropoutInput):
    # alias for predict-dropout
    return await predict_dropout(data)

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": True}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)

