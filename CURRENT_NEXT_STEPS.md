# ✅ Server Running - Next Steps

## 🎉 Great! Your server is running on http://localhost:3000

---

## 📋 Step 1: Verify Server is Working

### Test the Root Endpoint

Open your browser and go to:
```
http://localhost:3000
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Webflow Playwright Test Automation API",
  "endpoints": {
    "webhook": "/api/webhook",
    "runTests": "/api/run-tests",
    "testStatus": "/api/test-status/:jobId",
    "reports": "/api/reports/:jobId"
  }
}
```

**✅ If you see this:** Server is working correctly!

### Test Webhook Endpoint (Optional)

Try this in your browser or terminal:
```
http://localhost:3000/api/webhook
```

**Expected:** Error message (this is good - means endpoint exists!)

**Or use curl:**
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Expected:** Error about invalid signature (endpoint is working!)

---

## 📋 Step 2: Prepare for Deployment

### 2.1 Update Base URL (if needed)

**File:** `playwright.config.js`

Make sure it points to your sample site:
```javascript
baseURL: process.env.BASE_URL || 'https://your-sample-site.webflow.io',
```

Replace `your-sample-site.webflow.io` with your actual sample site URL.

### 2.2 Verify Files Are Ready

Make sure you have these files:
- ✅ `server.js` (Express app)
- ✅ `package.json` (with Express)
- ✅ `vercel.json` (Vercel config)
- ✅ `playwright.config.js`
- ✅ `tests/` folder

---

## 📋 Step 3: Push to GitHub

### 3.1 Initialize Git (if not done)

Open terminal in your project folder and run:

```bash
git init
git add .
git commit -m "Express.js application for Webflow Playwright automation"
```

### 3.2 Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click **New Repository** (green button, top right)
3. **Repository name:** `webflow-playwright-test`
4. **Description:** (optional) "Webflow Playwright Test Automation"
5. **Don't check** "Initialize with README" (you already have files)
6. Click **Create repository**

### 3.3 Push Your Code

Back in terminal, run (replace `YOUR_USERNAME`):

```bash
git remote add origin https://github.com/YOUR_USERNAME/webflow-playwright-test.git
git branch -M main
git push -u origin main
```

**If asked for credentials:**
- Use GitHub Personal Access Token, or
- Use GitHub CLI: `gh auth login`

**✅ Checkpoint:** Code should be visible on GitHub

---

## 📋 Step 4: Deploy to Vercel

### 4.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up**
3. **Choose "Sign up with GitHub"** (easiest - connects automatically)

### 4.2 Import Project

1. After signing in, click **Add New** → **Project**
2. You'll see your GitHub repositories
3. Find `webflow-playwright-test`
4. Click **Import**

### 4.3 Configure Settings

**Check these settings:**
- **Framework Preset:** Other
- **Root Directory:** `./` (default)
- **Build Command:** (leave empty)
- **Output Directory:** (leave empty)
- **Install Command:** `npm install` (default)

**Click:** **Deploy**

### 4.4 Wait for Deployment

- Build will start automatically
- Takes 2-5 minutes
- Watch the build logs
- You'll see: "Installing dependencies", "Building", "Deploying"

**✅ Checkpoint:** Deployment completes successfully

### 4.5 Save Your Vercel URL

After deployment, you'll see:
```
✅ Production Deployment
🌍 https://webflow-playwright-test.vercel.app
```

**Copy and save this URL!** You'll need it for the webhook.

---

## 📋 Step 5: Add Environment Variables

### 5.1 Go to Environment Variables

1. In Vercel dashboard, click your project
2. Go to **Settings** tab
3. Click **Environment Variables** (left sidebar)

### 5.2 Add Webhook Secret (Placeholder)

1. Click **Add New**
2. **Key:** `WEBFLOW_WEBHOOK_SECRET`
3. **Value:** `test-secret-for-now` (we'll update this later)
4. **Environment:** Check all (Production, Preview, Development)
5. Click **Save**

### 5.3 Add Base URL (Optional)

1. Click **Add New**
2. **Key:** `BASE_URL`
3. **Value:** `https://your-sample-site.webflow.io` (your sample site)
4. **Environment:** Check all
5. Click **Save**

### 5.4 Redeploy

**Important:** Environment variables only apply to new deployments!

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Wait for redeployment

**✅ Checkpoint:** Environment variables set

---

## 📋 Step 6: Configure Webflow Webhook

### 6.1 Go to Your Sample Webflow Site

1. Log in to [webflow.com](https://webflow.com)
2. Open your **sample/test site** dashboard

### 6.2 Navigate to Webhooks

1. Click **Settings** (gear icon, top right)
2. In left sidebar, click **Webhooks**

### 6.3 Create Webhook

1. Click **Add Webhook** button
2. Configure:
   - **Name:** `Playwright Tests (Test)`
   - **Event:** Select `site.publish` from dropdown
   - **URL:** `https://webflow-playwright-test.vercel.app/api/webhook`
     (Use your actual Vercel URL from Step 4.5)
3. Click **Create Webhook**

### 6.4 Copy Webhook Secret

1. After creating, click on the webhook to expand
2. You'll see a **Secret** field
3. **Copy this secret** - looks like: `whsec_xxxxxxxxxxxxx`
4. **Save it** - you'll need it next

**✅ Checkpoint:** Webhook created, secret copied

---

## 📋 Step 7: Update Secret in Vercel

### 7.1 Update Environment Variable

1. Go back to Vercel dashboard
2. **Settings** → **Environment Variables**
3. Find `WEBFLOW_WEBHOOK_SECRET`
4. Click **Edit** (pencil icon)
5. **Replace** placeholder with **real secret** from Step 6.4
6. Click **Save**

### 7.2 Redeploy

1. **Deployments** tab
2. Click **⋯** → **Redeploy**

**✅ Checkpoint:** Real secret configured

---

## 📋 Step 8: Test!

### 8.1 Publish Your Sample Site

1. Go to your sample Webflow site
2. Make a **small change** (add space, change text)
3. Click **Publish** button
4. Wait for publish

### 8.2 Check Vercel Logs

1. Vercel dashboard → **Functions** → `server.js` → **Logs**
2. Look for: "Webhook received", "Tests queued"

### 8.3 Get Job ID

From logs or webhook response, get the `jobId`

### 8.4 Check Status

```
https://your-app.vercel.app/api/test-status/[jobId]
```

Wait for status: `completed`

### 8.5 View Report

```
https://your-app.vercel.app/api/reports/[jobId]?file=index.html
```

---

## 🎯 Current Status

✅ Server running locally  
⏭️ **Next:** Push to GitHub (Step 3)

**Start with Step 3 above!** 🚀

