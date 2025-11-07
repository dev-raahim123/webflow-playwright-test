# Architecture Explanation: Node.js Middleware

## Yes, We're Using Node.js! ✅

But it's running as **Vercel Serverless Functions**, not a traditional Express server.

## Architecture Comparison

### Traditional Node.js Middleware (Express Server)
```
┌─────────────────────────────────┐
│  Express Server (Node.js)      │
│  - Runs 24/7                    │
│  - Always listening on port     │
│  - Requires server management   │
│  - Fixed cost                   │
└─────────────────────────────────┘
         │
         │ HTTP Requests
         ▼
    [Your API Routes]
```

**Example:**
```javascript
// server.js
const express = require('express');
const app = express();

app.post('/api/webhook', handler);
app.listen(3000); // Server runs forever
```

### Our Approach: Vercel Serverless Functions (Node.js)
```
┌─────────────────────────────────┐
│  Vercel Platform                │
│                                  │
│  ┌──────────────────────────┐   │
│  │ api/webhook.js           │   │
│  │ (Node.js Function)       │   │
│  │ - Runs on-demand          │   │
│  │ - Auto-scales             │   │
│  │ - Pay per execution       │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │ api/run-tests.js          │   │
│  │ (Node.js Function)        │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**Example:**
```javascript
// api/webhook.js
module.exports = async (req, res) => {
  // Node.js code here
  // Function starts when request arrives
  // Stops after response
};
```

## What We're Using

### ✅ Node.js Runtime
- All code is **pure Node.js**
- Uses Node.js built-in modules (`crypto`, `fs`, `child_process`)
- Can use npm packages

### ✅ Serverless Functions
- Each file in `api/` = one function
- Functions run on-demand (not 24/7)
- Managed by Vercel platform

### ✅ Vercel Configuration
```json
{
  "builds": [{
    "src": "api/**/*.js",
    "use": "@vercel/node"  // ← This means Node.js!
  }]
}
```

## Code Examples

### Our Webhook Handler (Node.js)
```javascript
// api/webhook.js
const crypto = require('crypto'); // Node.js built-in

module.exports = async (req, res) => {
  // This IS Node.js middleware code
  // Just running as a serverless function
  
  const webhookSecret = process.env.WEBFLOW_WEBHOOK_SECRET;
  const signature = req.headers['x-webflow-signature'];
  
  // Validate signature using Node.js crypto
  const hmac = crypto.createHmac('sha256', webhookSecret);
  // ... rest of the code
};
```

### Our Test Runner (Node.js)
```javascript
// api/run-tests.js
const { exec } = require('child_process'); // Node.js built-in
const fs = require('fs').promises; // Node.js built-in

module.exports = async (req, res) => {
  // Pure Node.js code
  exec('npx playwright test', (error, stdout) => {
    // Handle results
  });
};
```

## Key Differences

| Aspect | Traditional Server | Our Approach |
|--------|------------------|--------------|
| **Runtime** | Node.js | Node.js ✅ |
| **Execution** | Runs 24/7 | On-demand |
| **Scaling** | Manual | Automatic |
| **Cost** | Fixed monthly | Pay per use |
| **Management** | You manage | Vercel manages |
| **Code** | Express.js | Plain Node.js |

## Why This Approach?

### ✅ Advantages
1. **No server management** - Vercel handles it
2. **Auto-scaling** - Handles traffic spikes
3. **Cost-effective** - Pay only for executions
4. **Easy deployment** - Just push to Git
5. **Still Node.js** - Use all Node.js features

### ⚠️ Considerations
1. **Cold starts** - First request may be slower (~1-2s)
2. **Function timeouts** - Limited execution time
3. **Stateless** - Can't keep connections open

## Summary

**Yes, we ARE using Node.js as middleware!**

- ✅ All code is **Node.js**
- ✅ Uses Node.js modules (`crypto`, `fs`, `child_process`)
- ✅ Can use npm packages
- ✅ Same code you'd write for Express, just different execution model

**The difference:**
- Traditional: Node.js server running 24/7
- Our approach: Node.js functions running on-demand (serverless)

Both are Node.js, just different deployment models!

