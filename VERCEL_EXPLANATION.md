# Vercel's Role in Your Setup

## 🎯 What is Vercel?

**Vercel** is the **hosting platform** where your Node.js middleware runs.

Think of it as:
- **Traditional way:** Your own server running 24/7
- **Vercel way:** Serverless functions that run on-demand

---

## 🏗️ Vercel's Role in Your Architecture

```
┌─────────────────────────────────────────────────┐
│              VERCEL PLATFORM                    │
│  (Hosts your Node.js middleware)                │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Serverless Function: /api/webhook       │  │
│  │  - Receives Webflow webhook              │  │
│  │  - Validates signature                   │  │
│  │  - Triggers tests                        │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Serverless Function: /api/run-tests     │  │
│  │  - Runs Playwright tests                 │  │
│  │  - Executes: npx playwright test         │  │
│  │  - Stores reports                       │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Serverless Function: /api/test-status  │  │
│  │  - Returns test job status               │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Serverless Function: /api/reports        │  │
│  │  - Serves test reports                    │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
           │
           │ Your code runs here
           │ (Node.js serverless functions)
           ▼
```

---

## 🔄 Complete Flow with Vercel

### Step 1: You Deploy to Vercel
```
Your Code (GitHub/Repo)
    │
    │ Push to Vercel
    ▼
┌─────────────────────┐
│   VERCEL PLATFORM   │
│                     │
│  Deploys your:      │
│  - api/webhook.js   │
│  - api/run-tests.js │
│  - api/test-status  │
│  - api/reports      │
│                     │
│  Creates URLs:      │
│  https://your-app   │
│  .vercel.app/api/*  │
└─────────────────────┘
```

### Step 2: Webflow Webhook Points to Vercel
```
Webflow Dashboard
    │
    │ Configure webhook:
    │ URL: https://your-app.vercel.app/api/webhook
    ▼
┌─────────────────────┐
│   VERCEL FUNCTION   │
│   /api/webhook      │
│                     │
│  Receives webhook   │
│  Validates it       │
│  Triggers tests     │
└─────────────────────┘
```

### Step 3: Tests Run on Vercel
```
┌─────────────────────┐
│   VERCEL FUNCTION   │
│   /api/run-tests    │
│                     │
│  Executes:          │
│  npx playwright test│
│                     │
│  Runs on Vercel's   │
│  serverless runtime │
└─────────────────────┘
```

### Step 4: Reports Served from Vercel
```
┌─────────────────────┐
│   VERCEL FUNCTION   │
│   /api/reports      │
│                     │
│  Serves HTML report │
│  Accessible via URL │
└─────────────────────┘
```

---

## 🎯 What Vercel Does For You

### ✅ **Hosting**
- Hosts your Node.js code
- Provides URLs for your API endpoints
- No server management needed

### ✅ **Serverless Functions**
- Runs your code on-demand
- Auto-scales (handles traffic spikes)
- Pay only for what you use

### ✅ **Deployment**
- Deploy from Git (GitHub, GitLab, etc.)
- Automatic deployments on push
- Preview deployments for testing

### ✅ **Infrastructure**
- Handles all server setup
- Manages scaling
- Provides CDN
- SSL certificates (HTTPS)

---

## 📍 Where Everything Lives

### Your Code → Vercel
```
Your Computer/GitHub
    │
    │ Push code
    ▼
Vercel Platform
    │
    │ Deploys
    ▼
Live URLs:
- https://your-app.vercel.app/api/webhook
- https://your-app.vercel.app/api/run-tests
- https://your-app.vercel.app/api/test-status/[jobId]
- https://your-app.vercel.app/api/reports/[jobId]
```

### Webflow → Vercel
```
Webflow Dashboard
    │
    │ Webhook configured to:
    │ https://your-app.vercel.app/api/webhook
    ▼
Vercel Function
    │
    │ Receives webhook
    │ Runs your code
    ▼
Tests Execute
```

---

## 🔧 Vercel Configuration

### `vercel.json` - Tells Vercel How to Deploy

```json
{
  "version": 2,
  "builds": [{
    "src": "api/**/*.js",
    "use": "@vercel/node"  // ← Uses Node.js runtime
  }],
  "routes": [
    {
      "src": "/api/webhook",
      "dest": "/api/webhook.js"  // ← Maps URL to file
    }
  ],
  "functions": {
    "api/**/*.js": {
      "maxDuration": 300  // ← 5 min timeout
    }
  }
}
```

**What this does:**
- ✅ Tells Vercel to use Node.js
- ✅ Maps URLs to your API files
- ✅ Sets function timeout (300 seconds)

---

## 💰 Vercel Pricing & Limits

### Free Tier (Hobby)
- ✅ Free forever
- ⚠️ 10 second function timeout
- ✅ 100GB bandwidth
- ✅ Unlimited deployments

### Pro Tier ($20/month)
- ✅ 60 second function timeout
- ✅ Better performance
- ✅ Team features

### Enterprise
- ✅ 300 second function timeout (configured)
- ✅ Custom limits
- ✅ Priority support

**For your use case:** Pro tier recommended (60s timeout)

---

## 🚀 How to Deploy to Vercel

### Option 1: Vercel CLI
```bash
# Install
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add WEBFLOW_WEBHOOK_SECRET
```

### Option 2: GitHub Integration
1. Push code to GitHub
2. Go to vercel.com
3. Import repository
4. Vercel auto-deploys

---

## 📊 Complete Architecture with Vercel

```
┌─────────────┐
│   Webflow   │
│  (Website)  │
└──────┬──────┘
       │
       │ Publishes site
       │ Sends webhook
       ▼
┌─────────────────────────────────┐
│         VERCEL PLATFORM          │
│                                  │
│  ┌──────────────────────────┐  │
│  │  https://your-app        │  │
│  │  .vercel.app/api/webhook  │  │
│  │                           │  │
│  │  Your Node.js code runs  │  │
│  │  here (serverless)       │  │
│  └──────────────────────────┘  │
│                                  │
│  - Receives webhook             │
│  - Validates signature          │
│  - Runs Playwright tests        │
│  - Generates reports            │
│  - Serves reports               │
└─────────────────────────────────┘
       │
       │ Tests run here
       │ Reports stored here
       ▼
┌─────────────┐
│   Reports   │
│  Available  │
│  via API    │
└─────────────┘
```

---

## ✅ Summary: Vercel's Role

**Vercel is:**
1. ✅ **Hosting platform** - Where your code runs
2. ✅ **Serverless functions** - Your Node.js middleware
3. ✅ **API endpoints** - URLs that Webflow calls
4. ✅ **Test execution** - Where Playwright runs
5. ✅ **Report hosting** - Where reports are served

**Without Vercel:** You'd need to set up your own server (more work, cost, maintenance)

**With Vercel:** Everything is managed for you (easy, scalable, cost-effective)

---

## 🎯 Key Takeaway

**Vercel = The Platform Where Everything Runs**

- Your Node.js middleware runs on Vercel
- Webflow sends webhooks to Vercel
- Tests execute on Vercel
- Reports are served from Vercel

**It's like having a server, but:**
- ✅ No server management
- ✅ Auto-scaling
- ✅ Pay per use
- ✅ Easy deployment

Your code → Vercel → Everything works! 🚀

