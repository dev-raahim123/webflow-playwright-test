# Step-by-Step Guide: Testing on Sample Webflow Site

## 🎯 Goal
Test the Playwright automation on a sample Webflow site before applying to your main site.

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- [ ] A sample Webflow site (test site)
- [ ] GitHub account (or GitLab/Bitbucket)
- [ ] Vercel account (free tier works)
- [ ] Node.js installed locally (for testing)
- [ ] Your code ready (already done ✅)

---

## Step 1: Prepare Your Code ✅

### 1.1 Update Base URL for Sample Site

**File:** `playwright.config.js`

```javascript
baseURL: process.env.BASE_URL || 'https://your-sample-site.webflow.io',
```

**Action:** Replace `your-sample-site.webflow.io` with your actual sample site URL.

### 1.2 Verify Your Tests Work Locally

```bash
# In your project directory
npm install

# Run tests locally to make sure they work
npm test

# Check if report is generated
npm run test:report
```

**✅ Checkpoint:** Tests should run successfully locally.

---

## Step 2: Push Code to GitHub

### 2.1 Initialize Git (if not already done)

```bash
# In your project directory
git init
git add .
git commit -m "Initial commit: Webflow Playwright automation"
```

### 2.2 Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click **New Repository**
3. Name it: `webflow-playwright-test`
4. Don't initialize with README (you already have files)
5. Click **Create repository**

### 2.3 Push Your Code

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/webflow-playwright-test.git

# Push code
git branch -M main
git push -u origin main
```

**✅ Checkpoint:** Code should be visible on GitHub.

---

## Step 3: Deploy to Vercel

### 3.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up**
3. Sign up with GitHub (easiest way)

### 3.2 Import Project

1. In Vercel dashboard, click **Add New** → **Project**
2. Find your repository: `webflow-playwright-test`
3. Click **Import**

### 3.3 Configure Project

**Settings:**
- **Framework Preset:** Other
- **Root Directory:** `./` (leave default)
- **Build Command:** (leave empty)
- **Output Directory:** (leave empty)

**Click:** **Deploy**

### 3.4 Wait for Deployment

- Vercel will build and deploy
- This takes 2-5 minutes
- Watch the build logs

**✅ Checkpoint:** Deployment should complete successfully.

### 3.5 Get Your Vercel URL

After deployment, you'll see:
```
✅ Deployment successful!
🌍 https://webflow-playwright-test.vercel.app
```

**Save this URL!** You'll need it for the webhook.

---

## Step 4: Configure Environment Variables

### 4.1 Go to Project Settings

1. In Vercel dashboard, click your project
2. Go to **Settings** → **Environment Variables**

### 4.2 Add Webhook Secret (Temporary)

**For now, add a placeholder:**
- **Key:** `WEBFLOW_WEBHOOK_SECRET`
- **Value:** `test-secret-for-now` (we'll update this later)
- **Environment:** Production, Preview, Development

**Click:** **Save**

### 4.3 Add Base URL (Optional)

- **Key:** `BASE_URL`
- **Value:** `https://your-sample-site.webflow.io`
- **Environment:** Production, Preview, Development

**Click:** **Save**

### 4.4 Redeploy

After adding environment variables:
1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**

**✅ Checkpoint:** Environment variables should be set.

---

## Step 5: Configure Webflow Webhook

### 5.1 Go to Your Sample Webflow Site

1. Log in to [webflow.com](https://webflow.com)
2. Open your **sample/test site**

### 5.2 Navigate to Webhooks

1. Click **Settings** (gear icon)
2. Click **Webhooks** (in left sidebar)

### 5.3 Create Webhook

1. Click **Add Webhook**
2. Configure:
   - **Name:** `Playwright Tests (Test)`
   - **Event:** Select `site.publish`
   - **URL:** `https://webflow-playwright-test.vercel.app/api/webhook`
     (Use your actual Vercel URL from Step 3.5)
3. Click **Create Webhook**

### 5.4 Copy Webhook Secret

1. After creating webhook, you'll see a **Secret**
2. **Copy this secret** (you'll need it)
3. It looks like: `whsec_xxxxxxxxxxxxx`

**✅ Checkpoint:** Webhook created, secret copied.

---

## Step 6: Update Vercel Environment Variable

### 6.1 Update Webhook Secret

1. Go back to Vercel dashboard
2. **Settings** → **Environment Variables**
3. Find `WEBFLOW_WEBHOOK_SECRET`
4. Click **Edit**
5. Replace value with the **actual webhook secret** from Step 5.4
6. Click **Save**

### 6.2 Redeploy

1. Go to **Deployments** tab
2. Click **⋯** → **Redeploy**

**✅ Checkpoint:** Webhook secret updated.

---

## Step 7: Test the Integration

### 7.1 Test Webhook Endpoint

**Option A: Using curl**

```bash
# Test if endpoint is accessible
curl https://webflow-playwright-test.vercel.app/api/webhook \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Expected:** Should return error about invalid signature (this is good - means endpoint works!)

**Option B: Using Postman/Browser**

1. Open Postman or similar tool
2. POST to: `https://webflow-playwright-test.vercel.app/api/webhook`
3. Add header: `Content-Type: application/json`
4. Add body: `{"test": "data"}`
5. Send request

**Expected:** Error about invalid signature (endpoint is working!)

### 7.2 Publish Your Sample Site

1. Go to your sample Webflow site
2. Make a **small change** (add a space, change text, etc.)
3. Click **Publish** button
4. Wait for publish to complete

### 7.3 Check Vercel Logs

1. Go to Vercel dashboard
2. Click your project
3. Go to **Functions** tab
4. Click on `/api/webhook` function
5. Check **Logs** tab

**Look for:**
- ✅ "Webhook received"
- ✅ "Tests queued"
- ✅ Job ID created

**✅ Checkpoint:** Webhook should be received.

---

## Step 8: Monitor Test Execution

### 8.1 Check Test Status

After webhook is received, you'll get a response with `jobId`:

```json
{
  "success": true,
  "message": "Webhook received, tests queued",
  "jobId": "test-1234567890-abc",
  "statusUrl": "/api/test-status/test-1234567890-abc",
  "reportUrl": "/api/reports/test-1234567890-abc"
}
```

### 8.2 Check Job Status

**In browser or curl:**

```
https://webflow-playwright-test.vercel.app/api/test-status/test-1234567890-abc
```

**Check status:**
- `queued` - Waiting to start
- `running` - Tests executing
- `completed` - Tests finished
- `failed` - Tests failed

### 8.3 Check Function Logs

1. Vercel dashboard → **Functions** → `/api/run-tests`
2. Check **Logs** tab
3. Look for:
   - "Starting tests for job..."
   - "Tests completed..."
   - Any errors

**✅ Checkpoint:** Tests should be running or completed.

---

## Step 9: View Test Report

### 9.1 Access Report

Once status is `completed`, access report:

```
https://webflow-playwright-test.vercel.app/api/reports/test-1234567890-abc?file=index.html
```

**Expected:** HTML test report should load

### 9.2 Verify Report Content

Check that report shows:
- ✅ Test results
- ✅ Pass/fail status
- ✅ Screenshots (if any failures)
- ✅ Test details

**✅ Checkpoint:** Report should be accessible and complete.

---

## Step 10: Troubleshooting

### Issue: Webhook Not Received

**Check:**
1. ✅ Webhook URL is correct in Webflow
2. ✅ Vercel deployment is successful
3. ✅ Environment variable is set
4. ✅ Check Vercel logs for errors

**Fix:**
- Verify webhook URL matches Vercel URL exactly
- Check webhook secret is correct
- Redeploy Vercel project

### Issue: Tests Not Running

**Check:**
1. ✅ Check `/api/run-tests` logs
2. ✅ Verify Playwright is installed (check build logs)
3. ✅ Check function timeout limits

**Fix:**
- Check Vercel function logs
- Verify `postinstall` script ran during build
- Check if tests exceed timeout (upgrade to Pro plan)

### Issue: Reports Not Available

**Check:**
1. ✅ Job status is `completed`
2. ✅ Check `/api/reports` logs
3. ✅ Verify report was generated

**Fix:**
- Wait for tests to complete
- Check job status endpoint
- Verify report files exist

---

## ✅ Success Checklist

After completing all steps, you should have:

- [ ] ✅ Code deployed to Vercel
- [ ] ✅ Webhook configured in Webflow
- [ ] ✅ Environment variables set
- [ ] ✅ Webhook received successfully
- [ ] ✅ Tests executed
- [ ] ✅ Report accessible

---

## 🎯 Next Steps After Testing

Once everything works on sample site:

1. ✅ **Document any issues** you encountered
2. ✅ **Note execution times** (for timeout planning)
3. ✅ **Verify report quality**
4. ✅ **Apply to main site** (same steps, different URLs)

---

## 📞 Quick Reference

### Important URLs

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Your Vercel App:** `https://webflow-playwright-test.vercel.app`
- **Webhook Endpoint:** `https://webflow-playwright-test.vercel.app/api/webhook`
- **Status Endpoint:** `https://webflow-playwright-test.vercel.app/api/test-status/[jobId]`
- **Report Endpoint:** `https://webflow-playwright-test.vercel.app/api/reports/[jobId]`

### Important Commands

```bash
# Local testing
npm test
npm run test:report

# Deploy to Vercel
vercel

# Check logs
vercel logs

# View environment variables
vercel env ls
```

---

## 🚀 Ready to Start?

Follow steps 1-10 in order. Take your time, and check each checkpoint before moving to the next step.

Good luck! 🎉

