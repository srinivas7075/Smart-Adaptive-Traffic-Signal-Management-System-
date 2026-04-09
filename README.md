# Smart Adaptive Traffic Signal Management System

An AI-powered urban traffic control platform using computer vision (YOLO) and machine learning (LSTM) for real-time intersection optimization.

## 🚀 Project Overview
This system identifies vehicle density via video feeds, predicts congestion, and adapts traffic signal timers to minimize wait times across intersections. It features automated AI-driven E-Challan generation for red light violations and speeding.

---

## 📹 Traffic Video Dataset
Due to GitHub repository size limits, the raw traffic video footage used for simulation and testing is not directly included in this repository. 
You can download the official Bellevue city dataset used for this project here:
**[City of Bellevue Traffic Video Dataset](https://github.com/City-of-Bellevue/TrafficVideoDataset?tab=readme-ov-file)**

---

## 🛠️ Setup & Cloning Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/srinivas7075/Smart-Adaptive-Traffic-Signal-Management-System-.git
cd Smart-Adaptive-Traffic-Signal-Management-System-
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
python main.py
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Project Structure

```text
├── frontend/           # React.js dashboard UI
├── backend/            # FastAPI Backend & SQLite DB
├── ml-model/           # YOLO + LSTM models & training scripts
├── simulation/         # SUMO/Traffic simulator configurations
└── README.md           # Project Documentation
```
