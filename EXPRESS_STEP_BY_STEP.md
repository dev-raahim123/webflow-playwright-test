# Step-by-Step Guide: Express.js Application on Vercel

## 🎯 Updated Approach

**Express.js Application** → **Hosted on Vercel**

---

## 📋 Step 1: Install Express

```bash
npm install express
```

**✅ Checkpoint:** Express installed

---

## 📋 Step 2: Test Locally

```bash
# Start Express server
npm start

# Server should start on http://localhost:3000
```

**Test endpoints:**
- `GET http://localhost:3000/` - Should return API info
- `POST http://localhost:3000/api/webhook` - Should return error (no signature)

**✅ Checkpoint:** Server runs locally

---

## 📋 Step 3: Push to GitHub

```bash
git add .
git commit -m "Express.js application"
git push
```

**✅ Checkpoint:** Code pushed to GitHub

---

## 📋 Step 4: Deploy to Vercel

### 4.1 Import Project
1. Go to vercel.com
2. Click **Add New** → **Project**
3. Import your repository

### 4.2 Configure
- **Framework Preset:** Other
- **Root Directory:** `./`
- **Build Command:** (leave empty)
- **Output Directory:** (leave empty)
- **Install Command:** `npm install`

### 4.3 Deploy
- Click **Deploy**
- Wait for build to complete

**✅ Checkpoint:** Deployed to Vercel

---

## 📋 Step 5: Environment Variables

1. Vercel → **Settings** → **Environment Variables**
2. Add:
   - `WEBFLOW_WEBHOOK_SECRET` = `test-secret` (placeholder)
   - `BASE_URL` = `https://your-sample-site.webflow.io` (optional)
3. **Redeploy**

**✅ Checkpoint:** Environment variables set

---

## 📋 Step 6: Webflow Webhook

1. Webflow → **Settings** → **Webhooks**
2. **Add Webhook:**
   - Name: `Playwright Tests`
   - Event: `site.publish`
   - URL: `https://your-app.vercel.app/api/webhook`
3. **Copy secret**

**✅ Checkpoint:** Webhook created

---

## 📋 Step 7: Update Secret

1. Vercel → **Environment Variables**
2. Update `WEBFLOW_WEBHOOK_SECRET` with real secret
3. **Redeploy**

**✅ Checkpoint:** Secret updated

---

## 📋 Step 8: Test

1. **Publish sample site** in Webflow
2. **Check Vercel logs:**
   - Functions → `server.js` → Logs
   - Should see "Webhook received"
3. **Get jobId** from response

**✅ Checkpoint:** Webhook received

---

## 📋 Step 9: Check Status

```
GET https://your-app.vercel.app/api/test-status/[jobId]
```

Wait for status: `completed`

**✅ Checkpoint:** Tests completed

---

## 📋 Step 10: View Report

```
GET https://your-app.vercel.app/api/reports/[jobId]?file=index.html
```

**✅ Checkpoint:** Report accessible

---

## 🔧 Local Development

```bash
# Install
npm install

# Start server
npm start

# Server runs on http://localhost:3000
```

**Test webhook locally:**
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

---

## 📝 Key Differences from Serverless Approach

### ✅ **Express App (Current)**
- Single `server.js` file
- Traditional Express routes
- Easier to test locally
- Can run on any Node.js host

### ❌ **Serverless Functions (Old)**
- Multiple `api/*.js` files
- Vercel-specific structure
- Harder to test locally

---

## ⚠️ Important Notes

### Vercel Limitations
- Vercel is optimized for serverless, not Express
- May have cold starts
- Function timeout limits apply
- For production, consider Railway/Render/Heroku

### But for Testing
- ✅ Vercel works fine
- ✅ Easy deployment
- ✅ Free tier available

---

## 🎯 Summary

**Your setup:**
1. ✅ Express.js application (`server.js`)
2. ✅ Hosted on Vercel
3. ✅ Webflow webhook → Express route
4. ✅ Tests execute via Express
5. ✅ Reports served via Express

**Ready to test!** 🚀

