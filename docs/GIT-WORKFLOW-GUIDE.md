# 🛠 Team Git Workflow Guide

Welcome to the **Smart Traffic System** project! This guide ensures a clean, conflict-free development environment for our final year project.

---

## 🏗 Branching Strategy
We use a **Git Flow** variant to maintain code safety:

- **`main`**: The "Gold" branch. Only for final integration. No direct commits allowed.
- **`dev`**: The "Integration" branch. All team features merge here first.
- **`feature/<name>`**: Your personal sandbox. Create one for your module.

---

## 🏃 Daily Developer Routine (Team Members)

### 1. New to the Project? (Setup)
Run these once to clone and configure:
```bash
# Clone the repository
git clone https://github.com/srinivas7075/Smart-Adaptive-Traffic-Signal-Management-System-.git
cd Smart-Adaptive-Traffic-Signal-Management-System-

# Create your OWN feature branch (e.g., feature/frontend)
# Don't forget 'git checkout -b' to create and switch!
git checkout -b feature/frontend
```

### 2. Daily Workflow (Strict Order!)
Follow this every time you start and finish your work:

**A. Before starting work:**
```bash
# Always sync your local dev with the latest cloud code
git checkout dev
git pull origin dev
git checkout feature/frontend
git merge dev
```

**B. Committing your work:**
```bash
# Verify your changes are only in your assigned folder!
git add .
git commit -m "feat(frontend): Added manual entry button"
```

**C. Pushing your changes:**
```bash
# Push your feature branch to GitHub
git push origin feature/frontend
```

---

## 🛡 Project Lead Instructions (SRINIVAS)

### 1. Reviewing Code
1. Open the **Pull Request (PR)** on GitHub UI.
2. Check the "Files Changed" tab to ensure no outside folder edits were made.
3. If valid, approve the PR.

### 2. Merging Feature → Dev
Once a feature is ready for testing:
```bash
git checkout dev
git pull origin dev
git merge feature/frontend
git push origin dev
```

### 3. Merging Dev → Main
Only for milestones/final submissions:
```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

---

## ⚠️ How to Avoid Merge Conflicts
1. **Never** edit files outside your assigned folder.
2. **Commit Small**: Don't wait 3 days to commit. Commit every finished function.
3. **Pull Daily**: A conflict is 100x harder to fix if you wait a week to sync.
4. **Communication**: If you need to edit a shared file (like `backend/main.py`), message the Lead first.

---

## 🚀 Commands Cheat Sheet
| Action | Command |
| :--- | :--- |
| **New Branch** | `git checkout -b feature/xyz` |
| **Switch Branch** | `git checkout dev` |
| **View Status** | `git status` |
| **Compare Changes** | `git diff` |
| **Sync All** | `git pull --all` |
| **Safety Reset** | `git checkout -- .` (Warning: Wipes local changes) |
