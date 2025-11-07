# Next Steps After Running npm install & npm start

## ✅ You've Completed:
- [x] `npm install express` (or `npm install`)
- [x] `npm start` (server running locally)

---

## 📋 Step 3: Verify Server is Running

### 3.1 Check Server Response

Open your browser or use curl:

```bash
# In browser, go to:
http://localhost:3000

# Or use curl:
curl http://localhost:3000
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

**✅ Checkpoint:** Server responds correctly

### 3.2 Test Webhook Endpoint (Optional)

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Expected:** Error about invalid signature (this is good - means endpoint works!)

**✅ Checkpoint:** Endpoints are accessible

---

## 📋 Step 4: Prepare Code for Deployment

### 4.1 Update Base URL (if needed)

**File:** `playwright.config.js`

Make sure it points to your sample site:
```javascript
baseURL: process.env.BASE_URL || 'https://your-sample-site.webflow.io',
```

### 4.2 Verify All Files Are Ready

Check that you have:
- ✅ `server.js` (Express app)
- ✅ `package.json` (with Express dependency)
- ✅ `vercel.json` (Vercel config)
- ✅ `playwright.config.js` (Playwright config)
- ✅ `tests/` folder (your tests)

**✅ Checkpoint:** All files ready

---

## 📋 Step 5: Push to GitHub

### 5.1 Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Express.js application for Webflow Playwright automation"
```

### 5.2 Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click **New Repository** (green button)
3. Repository name: `webflow-playwright-test`
4. Description: (optional)
5. **Don't** check "Initialize with README" (you already have files)
6. Click **Create repository**

### 5.3 Push Your Code

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/webflow-playwright-test.git

# Push code
git branch -M main
git push -u origin main
```

**If you get authentication error:**
- Use GitHub CLI: `gh auth login`
- Or use SSH: `git@github.com:YOUR_USERNAME/webflow-playwright-test.git`

**✅ Checkpoint:** Code visible on GitHub

---

## 📋 Step 6: Deploy to Vercel

### 6.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up**
3. **Sign up with GitHub** (easiest - connects automatically)

### 6.2 Import Project

1. In Vercel dashboard, click **Add New** → **Project**
2. You'll see your GitHub repositories
3. Find `webflow-playwright-test`
4. Click **Import**

### 6.3 Configure Project Settings

**Settings to check:**
- **Framework Preset:** Other
- **Root Directory:** `./` (default)
- **Build Command:** (leave empty - not needed)
- **Output Directory:** (leave empty - not needed)
- **Install Command:** `npm install` (default)

**Click:** **Deploy**

### 6.4 Wait for Deployment

- Build process starts automatically
- Takes 2-5 minutes
- Watch the build logs
- You'll see: "Installing dependencies", "Building", "Deploying"

**✅ Checkpoint:** Deployment completes successfully

### 6.5 Get Your Vercel URL

After deployment, you'll see:
```
✅ Production Deployment
🌍 https://webflow-playwright-test.vercel.app
```

**Save this URL!** You'll need it for the webhook.

**✅ Checkpoint:** Vercel URL saved

---

## 📋 Step 7: Configure Environment Variables

### 7.1 Go to Environment Variables

1. In Vercel dashboard, click your project
2. Go to **Settings** tab
3. Click **Environment Variables** (left sidebar)

### 7.2 Add Webhook Secret (Placeholder)

1. Click **Add New**
2. **Key:** `WEBFLOW_WEBHOOK_SECRET`
3. **Value:** `test-secret-for-now` (we'll update this later)
4. **Environment:** Select all (Production, Preview, Development)
5. Click **Save**

### 7.3 Add Base URL (Optional but Recommended)

1. Click **Add New**
2. **Key:** `BASE_URL`
3. **Value:** `https://your-sample-site.webflow.io` (your sample site URL)
4. **Environment:** Select all
5. Click **Save**

### 7.4 Redeploy

**Important:** Environment variables only apply to new deployments!

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Wait for redeployment

**✅ Checkpoint:** Environment variables set and deployed

---

## 📋 Step 8: Configure Webflow Webhook

### 8.1 Go to Your Sample Webflow Site

1. Log in to [webflow.com](https://webflow.com)
2. Open your **sample/test site** dashboard

### 8.2 Navigate to Webhooks

1. Click **Settings** (gear icon, top right)
2. In left sidebar, click **Webhooks**

### 8.3 Create Webhook

1. Click **Add Webhook** button
2. Configure:
   - **Name:** `Playwright Tests (Test)`
   - **Event:** Select `site.publish` from dropdown
   - **URL:** `https://webflow-playwright-test.vercel.app/api/webhook`
     (Use your actual Vercel URL from Step 6.5)
3. Click **Create Webhook**

### 8.4 Copy Webhook Secret

1. After creating, you'll see the webhook listed
2. Click on the webhook to expand details
3. You'll see a **Secret** field
4. **Copy this secret** - it looks like: `whsec_xxxxxxxxxxxxx`
5. **Save it somewhere safe** - you'll need it next

**✅ Checkpoint:** Webhook created, secret copied

---

## 📋 Step 9: Update Webhook Secret in Vercel

### 9.1 Update Environment Variable

1. Go back to Vercel dashboard
2. **Settings** → **Environment Variables**
3. Find `WEBFLOW_WEBHOOK_SECRET`
4. Click **Edit** (pencil icon)
5. **Replace** the placeholder value with the **real webhook secret** from Step 8.4
6. Click **Save**

### 9.2 Redeploy Again

1. **Deployments** tab
2. Click **⋯** → **Redeploy**
3. Wait for redeployment

**✅ Checkpoint:** Real webhook secret configured

---

## 📋 Step 10: Test the Integration

### 10.1 Publish Your Sample Site

1. Go to your sample Webflow site
2. Make a **small change** (add a space, change text, etc.)
3. Click **Publish** button (top right)
4. Wait for publish to complete

### 10.2 Check Vercel Logs

1. Go to Vercel dashboard
2. Click your project
3. Go to **Functions** tab
4. Click on `server.js`
5. Click **Logs** tab
6. Look for recent logs

**What to look for:**
- ✅ "Webhook received"
- ✅ "Tests queued"
- ✅ Job ID created
- ✅ "Starting tests for job..."

**✅ Checkpoint:** Webhook received, tests triggered

### 10.3 Get Job ID

From the webhook response (in logs or Webflow webhook test), you'll get:
```json
{
  "success": true,
  "message": "Webhook received, tests queued",
  "jobId": "test-1234567890-abc",
  "statusUrl": "/api/test-status/test-1234567890-abc",
  "reportUrl": "/api/reports/test-1234567890-abc"
}
```

**Save the `jobId`!**

---

## 📋 Step 11: Check Test Status

### 11.1 Check Status Endpoint

Replace `[jobId]` with your actual job ID:

```
https://webflow-playwright-test.vercel.app/api/test-status/[jobId]
```

**Or use curl:**
```bash
curl https://webflow-playwright-test.vercel.app/api/test-status/[jobId]
```

**Expected Response:**
```json
{
  "success": true,
  "job": {
    "id": "test-1234567890-abc",
    "status": "running",  // or "completed" or "failed"
    "createdAt": "2024-01-01T00:00:00.000Z",
    "startedAt": "2024-01-01T00:00:05.000Z"
  },
  "reportUrl": "/api/reports/test-1234567890-abc"
}
```

### 11.2 Wait for Completion

- Status will be: `queued` → `running` → `completed`
- Check every 30 seconds
- Tests may take 1-5 minutes depending on your test suite

**✅ Checkpoint:** Status shows `completed`

---

## 📋 Step 12: View Test Report

### 12.1 Access Report

Once status is `completed`, access report:

```
https://webflow-playwright-test.vercel.app/api/reports/[jobId]?file=index.html
```

**Or use curl:**
```bash
curl https://webflow-playwright-test.vercel.app/api/reports/[jobId]?file=index.html
```

### 12.2 Verify Report

The report should:
- ✅ Load in browser
- ✅ Show test results
- ✅ Display pass/fail status
- ✅ Include screenshots (if any failures)
- ✅ Show test details

**✅ Checkpoint:** Report accessible and complete

---

## 🎉 Success!

If you've completed all steps:
- ✅ Express app deployed to Vercel
- ✅ Webflow webhook configured
- ✅ Tests running automatically
- ✅ Reports accessible

**You're ready to apply this to your main site!**

---

## 🆘 Troubleshooting

### Server not starting locally?
- Check if port 3000 is already in use
- Try: `PORT=3001 npm start`
- Check for errors in terminal

### Deployment failed?
- Check build logs in Vercel
- Verify `package.json` has Express dependency
- Check `vercel.json` is correct

### Webhook not received?
- Verify URL is correct in Webflow
- Check webhook secret matches
- Check Vercel logs for errors

### Tests not running?
- Check `/api/run-tests` logs
- Verify Playwright is installed
- Check function timeout limits

---

## 📝 Quick Reference

**Your URLs:**
- Local: `http://localhost:3000`
- Vercel: `https://webflow-playwright-test.vercel.app`
- Webhook: `https://webflow-playwright-test.vercel.app/api/webhook`

**Commands:**
```bash
npm start              # Run locally
vercel                 # Deploy to Vercel
vercel logs            # View logs
```

**Next:** Continue with Step 3 above! 🚀

