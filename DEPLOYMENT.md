# Deployment Guide: Webflow → Vercel → Playwright Tests

## Your Plan Analysis ✅

Your plan is **solid and well-architected**:

1. ✅ **Node.js Middleware** - Using Vercel serverless functions (Node.js)
2. ✅ **Webhook Receiver** - Validates Webflow signatures
3. ✅ **Vercel Deployment** - Serverless, scalable, cost-effective
4. ✅ **Test Execution** - Playwright tests run on publish events

## Architecture Flow

```
┌─────────────┐
│   Webflow   │ Publishes site
└──────┬──────┘
       │ POST /api/webhook
       │ (with signature)
       ▼
┌──────────────────┐
│  Vercel Function │ Validates signature
│  /api/webhook    │ Creates job
└──────┬───────────┘
       │ Triggers async
       ▼
┌──────────────────┐
│  Vercel Function │ Runs Playwright
│  /api/run-tests  │ Stores report
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Report Storage  │ In-memory (dev)
│                  │ → Upgrade to DB/Blob (prod)
└──────────────────┘
```

## Step-by-Step Execution

### Step 1: Prepare Your Code

✅ **Already Done:**
- API routes created (`api/webhook.js`, `api/run-tests.js`, etc.)
- Vercel configuration (`vercel.json`)
- Environment variables template (`.env.example`)

### Step 2: Install Dependencies

```bash
npm install
```

This will also install Playwright browsers (via `postinstall` script).

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (first time - follow prompts)
vercel

# Set environment variable
vercel env add WEBFLOW_WEBHOOK_SECRET

# Deploy to production
vercel --prod
```

#### Option B: Using GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
6. Add environment variable:
   - `WEBFLOW_WEBHOOK_SECRET` = (your webhook secret)
7. Click "Deploy"

### Step 4: Get Your Vercel URL

After deployment, you'll get a URL like:
```
https://your-project-name.vercel.app
```

### Step 5: Configure Webflow Webhook

1. Go to your Webflow site dashboard
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Configure:
   - **Name**: `Playwright Tests`
   - **Event**: Select `site.publish`
   - **URL**: `https://your-project-name.vercel.app/api/webhook`
5. Click **Create Webhook**
6. **Copy the webhook secret** (you'll need this)

### Step 6: Add Webhook Secret to Vercel

#### Via CLI:
```bash
vercel env add WEBFLOW_WEBHOOK_SECRET production
# Paste your webhook secret when prompted
```

#### Via Dashboard:
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add:
   - **Key**: `WEBFLOW_WEBHOOK_SECRET`
   - **Value**: (paste your webhook secret)
   - **Environment**: Production, Preview, Development
4. Click "Save"
5. **Redeploy** your project

### Step 7: Test the Integration

#### Test 1: Manual Webhook Test

```bash
# Get your webhook secret
WEBHOOK_SECRET="your_secret_here"

# Create test payload
PAYLOAD='{"name":"site.publish","site":"your-site-id"}'

# Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

# Send test webhook
curl -X POST https://your-project-name.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webflow-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

#### Test 2: Publish Your Webflow Site

1. Make a small change in Webflow
2. Click **Publish**
3. Check Vercel logs: `vercel logs`
4. Check job status: `GET https://your-project-name.vercel.app/api/test-status/[jobId]`

### Step 8: View Test Reports

Once tests complete, access reports at:
```
https://your-project-name.vercel.app/api/reports/[jobId]?file=index.html
```

## Important Considerations

### ⚠️ Vercel Function Limits

| Plan | Timeout | Memory |
|------|---------|--------|
| Hobby | 10s | 1GB |
| Pro | 60s | 1GB |
| Enterprise | 300s | Configurable |

**Your tests may exceed these limits!**

**Solutions:**
1. **Use Pro plan** (60s timeout)
2. **Optimize tests** - Run only critical tests
3. **Use background jobs** - Queue tests, return immediately
4. **Split tests** - Run subsets in parallel

### 📦 Playwright in Serverless

- ✅ Chromium browser is installed during build
- ✅ Tests run in headless mode
- ⚠️ Only Chromium is installed (to reduce size)
- ⚠️ First run may be slower (cold start)

### 💾 Report Storage

**Current Implementation:** In-memory storage (lost on function restart)

**Production Upgrade Options:**

1. **Vercel Blob Storage** (Recommended)
   ```javascript
   import { put } from '@vercel/blob';
   await put(`reports/${jobId}/index.html`, reportHtml);
   ```

2. **AWS S3**
   ```javascript
   const s3 = new AWS.S3();
   await s3.putObject({
     Bucket: 'your-bucket',
     Key: `reports/${jobId}/index.html`,
     Body: reportHtml
   }).promise();
   ```

3. **Database** (PostgreSQL, MongoDB)
   - Store report metadata
   - Store report HTML as text/blob
   - Query historical reports

## Troubleshooting

### Issue: Webhook validation fails

**Solution:**
- Verify `WEBFLOW_WEBHOOK_SECRET` is set correctly
- Check signature format in logs
- Ensure raw body is being passed correctly

### Issue: Tests timeout

**Solution:**
- Upgrade to Pro plan (60s timeout)
- Reduce test scope (run only critical tests)
- Optimize test timeouts in `playwright.config.js`

### Issue: Playwright browsers not found

**Solution:**
- Verify `postinstall` script runs: `npm run postinstall`
- Check build logs in Vercel
- Ensure `PLAYWRIGHT_BROWSERS_PATH=0` is set

### Issue: Reports not accessible

**Solution:**
- Check job status first: `/api/test-status/[jobId]`
- Verify tests completed successfully
- Check function logs for errors

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Configure Webflow webhook
3. ✅ Test the integration
4. 🔄 **Upgrade report storage** (for production)
5. 🔄 **Add notifications** (Slack/Email on test completion)
6. 🔄 **Add authentication** (protect endpoints)

## Support

- Check Vercel logs: `vercel logs`
- Check function logs in Vercel dashboard
- Test endpoints manually with curl/Postman

