# Quick Start Checklist

Use this checklist as you go through the steps:

## Pre-Setup
- [ ] Sample Webflow site ready
- [ ] GitHub account ready
- [ ] Vercel account ready
- [ ] Node.js installed locally

## Step 1: Prepare Code
- [ ] Updated `playwright.config.js` with sample site URL
- [ ] Tests run locally (`npm test`)
- [ ] Report generated locally (`npm run test:report`)

## Step 2: Push to GitHub
- [ ] Git initialized
- [ ] GitHub repository created
- [ ] Code pushed to GitHub

## Step 3: Deploy to Vercel
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Deployment successful
- [ ] Vercel URL saved

## Step 4: Environment Variables
- [ ] `WEBFLOW_WEBHOOK_SECRET` added (placeholder)
- [ ] `BASE_URL` added (optional)
- [ ] Project redeployed

## Step 5: Webflow Webhook
- [ ] Webhook created in Webflow
- [ ] Event set to `site.publish`
- [ ] URL points to Vercel endpoint
- [ ] Webhook secret copied

## Step 6: Update Secret
- [ ] Webhook secret updated in Vercel
- [ ] Project redeployed

## Step 7: Test Integration
- [ ] Webhook endpoint tested (returns error = good!)
- [ ] Sample site published
- [ ] Webhook received (check Vercel logs)

## Step 8: Monitor Tests
- [ ] Job ID received from webhook
- [ ] Status endpoint checked
- [ ] Tests running/completed
- [ ] Function logs checked

## Step 9: View Report
- [ ] Report URL accessed
- [ ] Report loads successfully
- [ ] Report content verified

## Step 10: Troubleshooting
- [ ] Any issues documented
- [ ] Execution times noted
- [ ] Ready for main site

---

## 🎯 Current Step: _______

Mark your progress as you go!

