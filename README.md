# ✈️ TripSplit - Trip Expense Sharing & Settlement Web App

A clean, modern, responsive trip expense sharing and automatic debt settlement application built with HTML5, CSS3, and Vanilla JavaScript ES6+ with LocalStorage persistence.

---

## 🌟 Key Features

1. **Top Section Metrics & Controls**:
   - **+ Add Person**: Easily add new trip participants (e.g. Rahul, Amit, Priya, Arjun).
   - **Average Amount Spent Per Person**: Automatically calculated as `Total Trip Spending ÷ Number of People`.
   - **Editable Target Average**: Manually set a target/budget average if desired.
   - **Total Trip Spending & Active Members Counters**.

2. **Borrow Amount (Payment Entry)**:
   - **Spent By**: Single-select visual cards for who paid.
   - **Amount**: Input with ₹ Indian Rupee formatting.
   - **Spent For**: Checkbox list with **"Everyone"** master toggle and individual checkboxes. Shows active count (e.g., "3 people selected").
   - **Quick Category Tags**: Dinner, Hotel, Petrol, Movie, Tickets, Food, Cab, Shopping.
   - **Complete Auto-Reset**: Form resets completely after submission (deselected spender, cleared amount, unchecked boxes, cleared description). No persistent spender state.

3. **Spend Amount (Live Split Breakdown)**:
   - Real-time cards for every person with:
     - **Total Paid**
     - **Personal Share**
     - **Paid For Others**
     - **Others Paid For Person**
     - **Balance Badge**: `+₹X to receive` (Green) or `-₹X to give` (Red) or `Settled (₹0)`.
     - Direct contextual hints: e.g. "Give to Rahul" or "Receive from Amit".
   - **Clickable Detail Modal**: View comprehensive ledger breakdown and the person's complete transaction history.

4. **Direct Payment Directions & Final Settlement**:
   - **Amount To Give** & **Amount To Receive** pairwise lists.
   - **Final Settlement**: Minimum-cash-flow algorithm calculating the simplest transfers: `Person on left pays Person on right`.

5. **Expense History**:
   - Recent expenses list with spender, recipients, description, amount, and date.
   - Inline **Edit** and **Delete** buttons with automatic recalculation.

---

## 🚀 How to Run Locally

### Option 1: Open directly in browser
Double-click [`index.html`](index.html) or right click and open with Chrome, Edge, Firefox, or Safari.

### Option 2: Using the built-in Node server
```bash
npm start
```
Then visit `http://localhost:3000` in your browser.

---

## 📦 How to Push to GitHub & Deploy on Render (Step-by-Step)

### Step 1: Create a New GitHub Repository

1. Go to [github.com/new](https://github.com/new) and log in to your GitHub account.
2. In **Repository name**, enter: `trip-expense-app` (or any name you like).
3. Set visibility to **Public** (or **Private**).
4. **Leave "Add a README file", ".gitignore", and license UNCHECKED** (our local project already has them).
5. Click **Create repository**.
6. Copy your GitHub repository URL (e.g., `https://github.com/<your-username>/trip-expense-app.git`).

---

### Step 2: Push Your Local Code to GitHub

Open PowerShell or Terminal in this project directory:
```bash
cd "C:\Users\hv525\.gemini\antigravity\scratch\trip-expense-app"
```

Then run the following commands (replace `<YOUR_GITHUB_URL>` with your repository URL):

```bash
# Add your GitHub repository as remote origin
git remote add origin <YOUR_GITHUB_URL>

# Push the main branch to GitHub
git push -u origin main
```

*(If prompted, log in with your GitHub credentials or Personal Access Token)*.

---

### Step 3: Deploy to Render (Zero Cost, 100% Free)

You can deploy on Render in either of two ways:

#### 🌟 Recommended Method: Render Static Site (Instant & 100% Free)

1. Go to [dashboard.render.com](https://dashboard.render.com/) and sign in.
2. Click **+ New** (top right) and choose **Static Site**.
3. Connect your GitHub account and select your `trip-expense-app` repository.
4. Fill in these simple settings:
   - **Name**: `tripsplit` (or any unique name)
   - **Branch**: `main`
   - **Build Command**: *(leave empty)*
   - **Publish Directory**: `.` *(a single dot representing root)*
5. Click **Create Static Site**.
6. In ~15 seconds, Render will give you a live URL like `https://tripsplit.onrender.com`.

---

#### Alternative Method: Render Web Service

If you prefer deploying as a Node.js web service:
1. Click **+ New** > **Web Service**.
2. Select your `trip-expense-app` repository.
3. Configure:
   - **Environment**: `Node`
   - **Build Command**: `npm install` *(or leave empty)*
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Click **Create Web Service**.
5. Render will build and deploy your app with continuous deployment on every git push!
