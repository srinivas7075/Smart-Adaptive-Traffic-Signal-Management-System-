# Smart Adaptive Traffic Signal Management System

An AI-powered urban traffic control platform using computer vision (YOLO) and machine learning (LSTM) for real-time intersection optimization.

## 🚀 Project Overview
This system identifies vehicle density via video feeds, predicts congestion, and adapts traffic signal timers to minimize wait times across intersections.

---

## 👥 Team Roles & Responsibilities

| Role | Responsibility | Branch |
| :--- | :--- | :--- |
| **Project Lead** | System Integration & Main Repository Management | `main` / `dev` |
| **UI/UX Engineer** | Frontend React Dashboard | `feature/frontend` |
| **Backend Engineer** | FastAPI API & Database | `feature/backend` |
| **ML Engineer (Vision)** | YOLO vehicle detection & OCR | `feature/ml-yolo` |
| **ML Engineer (Stats)** | LSTM Traffic Prediction | `feature/ml-lstm` |
| **Simulation Specialist** | Traffic Node Simulation | `feature/simulation` |
| **Documentation Lead** | Diagrams, Technical Paper & PPT | `feature/docs` |

---

## 📂 Project Structure

```text
├── frontend/           # React.js dashboard
├── backend/            # FastAPI APIs
├── ml-model/           # YOLO + LSTM models & weights
├── simulation/         # SUMO/Traffic simulator files
├── docs/               # PPT, Diagrams & Paper
└── datasets/           # Dataset links & Metadata
```

---

## 🛠️ Setup Instructions

### 1. Backend Setup
1. `cd backend`
2. `python -m venv venv`
3. `venv\Scripts\activate` (Windows)
4. `pip install -r requirements.txt`
5. `python main.py`

### 2. Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

---

## 📂 Git & Workflow Rules
For detailed commands and branch strategies, please refer to the **[GIT-WORKFLOW-GUIDE.md](docs/GIT-WORKFLOW-GUIDE.md)**.

> [!IMPORTANT]
> **STRICT PROJECT RULES:**
> 1. No direct pushes to `main`.
> 2. No editing other team members' folders.
> 3. Always `git pull origin dev` before starting work.
> 4. Only small, atomic commits allowed.
