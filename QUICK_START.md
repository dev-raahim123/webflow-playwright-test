# 🚀 Quick Start: Baby Steps Guide

## Overview
```
Your Code → GitHub → Vercel → Webflow → Tests Run → Report
```

---

## 📝 Step-by-Step (Simplified)

### **STEP 1: Update Your Code** ⚙️

**File to edit:** `playwright.config.js`

**Find this line:**
```javascript
baseURL: process.env.BASE_URL || 'https://ruqayas-bookshelf.webflow.io',
```

**Change to your sample site:**
```javascript
baseURL: process.env.BASE_URL || 'https://your-sample-site.webflow.io',
```

**Save the file.**

**Test locally:**
```bash
npm test
```

✅ **Check:** Tests should run successfully

---

### **STEP 2: Push to GitHub** 📤

**2.1 Initialize Git:**
```bash
git init
git add .
git commit -m "Webflow Playwright automation"
```

**2.2 Create GitHub repo:**
- Go to github.com
- Click "New Repository"
- Name: `webflow-playwright-test`
- Create repository

**2.3 Push code:**
```bash
git remote add origin https://github.com/YOUR_USERNAME/webflow-playwright-test.git
git push -u origin main
```

✅ **Check:** Code visible on GitHub

---

### **STEP 3: Deploy to Vercel** 🚀

**3.1 Sign up:**
- Go to vercel.com
- Sign up with GitHub

**3.2 Import project:**
- Click "Add New" → "Project"
- Find `webflow-playwright-test`
- Click "Import"
- Click "Deploy"

**3.3 Wait for deployment:**
- Takes 2-5 minutes
- Watch build logs

**3.4 Save your URL:**
```
https://webflow-playwright-test.vercel.app
```

✅ **Check:** Deployment successful, URL saved

---

### **STEP 4: Add Environment Variables** 🔐

**4.1 Go to Vercel:**
- Click your project
- Settings → Environment Variables

**4.2 Add placeholder:**
- Key: `WEBFLOW_WEBHOOK_SECRET`
- Value: `test-secret` (we'll update later)
- Save

**4.3 Redeploy:**
- Deployments tab → ⋯ → Redeploy

✅ **Check:** Environment variable added

---

### **STEP 5: Create Webflow Webhook** 🔗

**5.1 Go to Webflow:**
- Open your sample site
- Settings → Webhooks

**5.2 Create webhook:**
- Click "Add Webhook"
- Name: `Playwright Tests`
- Event: `site.publish`
- URL: `https://webflow-playwright-test.vercel.app/api/webhook`
- Create

**5.3 Copy secret:**
- Copy the webhook secret
- Looks like: `whsec_xxxxx`

✅ **Check:** Webhook created, secret copied

---

### **STEP 6: Update Secret in Vercel** 🔄

**6.1 Update variable:**
- Vercel → Settings → Environment Variables
- Edit `WEBFLOW_WEBHOOK_SECRET`
- Paste the real secret from Step 5.3
- Save

**6.2 Redeploy:**
- Deployments → ⋯ → Redeploy

✅ **Check:** Secret updated, redeployed

---

### **STEP 7: Test It!** 🧪

**7.1 Publish your sample site:**
- Make a small change
- Click "Publish"

**7.2 Check Vercel logs:**
- Vercel dashboard → Functions → `/api/webhook`
- Check Logs tab
- Should see "Webhook received"

**7.3 Get job ID:**
- Response should have `jobId`
- Save it!

✅ **Check:** Webhook received, job ID saved

---

### **STEP 8: Check Test Status** 📊

**8.1 Check status:**
```
https://webflow-playwright-test.vercel.app/api/test-status/YOUR_JOB_ID
```

**8.2 Wait for completion:**
- Status: `queued` → `running` → `completed`

**8.3 Check logs:**
- Functions → `/api/run-tests` → Logs
- Should see test execution

✅ **Check:** Tests running/completed

---

### **STEP 9: View Report** 📄

**9.1 Access report:**
```
https://webflow-playwright-test.vercel.app/api/reports/YOUR_JOB_ID?file=index.html
```

**9.2 Verify:**
- Report loads
- Shows test results
- Has pass/fail status

✅ **Check:** Report accessible and complete

---

## 🎯 That's It!

If all steps completed successfully:
- ✅ Integration works!
- ✅ Ready for main site
- ✅ Same steps, different URLs

---

## 🆘 Need Help?

**Common Issues:**

1. **Webhook not received?**
   - Check URL is correct
   - Verify secret matches
   - Check Vercel logs

2. **Tests not running?**
   - Check function logs
   - Verify Playwright installed
   - Check timeout limits

3. **Report not available?**
   - Wait for tests to complete
   - Check job status
   - Verify report was generated

---

## 📋 Quick Reference

**Your URLs:**
- Vercel App: `https://webflow-playwright-test.vercel.app`
- Webhook: `https://webflow-playwright-test.vercel.app/api/webhook`
- Status: `https://webflow-playwright-test.vercel.app/api/test-status/[jobId]`
- Report: `https://webflow-playwright-test.vercel.app/api/reports/[jobId]`

**Commands:**
```bash
npm test              # Test locally
vercel                # Deploy to Vercel
vercel logs           # View logs
```

---

**Start with Step 1 and work through each step!** 🚀

