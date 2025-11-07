# Updated Architecture: Express.js Application

## 🎯 New Approach

**Express.js Application** → **Hosted on Vercel**

```
┌─────────────────────────────────┐
│      Express.js Application     │
│      (server.js)                │
│                                  │
│  Routes:                         │
│  ✅ POST /api/webhook           │
│  ✅ POST /api/run-tests         │
│  ✅ GET  /api/test-status/:id  │
│  ✅ GET  /api/reports/:id       │
└──────────────┬──────────────────┘
               │
               │ Hosted on
               ▼
┌─────────────────────────────────┐
│         VERCEL PLATFORM          │
│    (Hosting Platform Only)      │
└─────────────────────────────────┘
```

---

## 📁 New File Structure

```
webflow-playwright/
├── server.js              ← Express.js application (NEW)
├── package.json           ← Updated with Express
├── vercel.json           ← Updated for Express
├── playwright.config.js
├── tests/                ← Your existing tests
└── api/                  ← Can be removed (old approach)
```

---

## 🔄 What Changed

### ✅ **Before (Serverless Functions)**
- Multiple files: `api/webhook.js`, `api/run-tests.js`, etc.
- Each file = separate function
- Vercel-specific structure

### ✅ **Now (Express App)**
- Single file: `server.js`
- Express.js application
- Traditional Node.js server
- Vercel just hosts it

---

## 📝 Key Files

### **server.js** (Main Application)
- Express.js server
- All routes in one file
- Handles webhook, tests, status, reports

### **package.json** (Updated)
- Added `express` dependency
- `main` set to `server.js`
- `start` script added

### **vercel.json** (Updated)
- Points to `server.js`
- Routes all requests to Express app

---

## 🚀 How It Works

### 1. **Express App Starts**
```javascript
// server.js
const app = express();
// ... routes ...
app.listen(PORT);
```

### 2. **Vercel Hosts It**
- Vercel runs your Express app
- All requests go to `server.js`
- Express handles routing

### 3. **Webflow Calls Webhook**
```
Webflow → POST /api/webhook → Express route → Tests run
```

---

## ⚠️ Important Note About Vercel

**Vercel is optimized for serverless functions**, not traditional Express apps.

**What this means:**
- ✅ Will work, but may have limitations
- ⚠️ Cold starts (first request slower)
- ⚠️ Function timeout limits still apply
- ⚠️ Not ideal for long-running processes

**Alternative Hosting Options** (if Vercel doesn't work well):
- **Railway** - Great for Express apps
- **Render** - Easy Express hosting
- **Heroku** - Traditional platform
- **DigitalOcean App Platform** - Simple hosting
- **AWS Elastic Beanstalk** - Enterprise option

**But for testing, Vercel should work fine!**

---

## 🎯 Next Steps

1. ✅ **Install Express:**
   ```bash
   npm install express
   ```

2. ✅ **Test locally:**
   ```bash
   npm start
   # Server runs on http://localhost:3000
   ```

3. ✅ **Deploy to Vercel:**
   ```bash
   vercel
   ```

4. ✅ **Configure Webflow webhook:**
   - URL: `https://your-app.vercel.app/api/webhook`

---

## 📋 Updated Flow

```
1. Express app starts (server.js)
2. Vercel hosts the Express app
3. Webflow sends webhook → /api/webhook
4. Express route receives it
5. Express route triggers tests
6. Tests run (Playwright)
7. Report generated
8. Report served via Express route
```

---

## ✅ Benefits of This Approach

- ✅ **Single codebase** - All in one file
- ✅ **Traditional Express** - Easier to understand
- ✅ **Easy to test locally** - Just `npm start`
- ✅ **Can migrate easily** - Works on any Node.js host
- ✅ **Familiar structure** - Standard Express app

---

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Server runs on http://localhost:3000
# Test webhook: POST http://localhost:3000/api/webhook
```

---

## 📝 Summary

**Your approach is now:**
- Express.js application (traditional Node.js)
- Hosted on Vercel (just hosting)
- Webflow webhook → Express route
- Tests execute via Express
- Reports served via Express

**Ready to test!** 🚀

