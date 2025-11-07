# Webflow Playwright Test Automation

Automated Playwright testing triggered by Webflow site publish events.

## Architecture

```
Webflow Publish → Webhook → Vercel API → Playwright Tests → Report Storage
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `WEBFLOW_WEBHOOK_SECRET` - Your Webflow webhook secret

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add WEBFLOW_WEBHOOK_SECRET
```

#### Option B: Using Vercel Dashboard

1. Push your code to GitHub/GitLab/Bitbucket
2. Import project in Vercel dashboard
3. Add environment variables in project settings
4. Deploy

### 4. Configure Webflow Webhook

1. Go to your Webflow site dashboard
2. Navigate to **Settings** > **Webhooks**
3. Click **Add Webhook**
4. Configure:
   - **Name**: Playwright Tests
   - **Event**: `site.publish`
   - **URL**: `https://your-app.vercel.app/api/webhook`
5. Copy the webhook secret
6. Add it to Vercel environment variables as `WEBFLOW_WEBHOOK_SECRET`

### 5. Test the Integration

#### Test Webhook Locally (using ngrok or similar)

```bash
# Install ngrok
npm install -g ngrok

# Start local server
npm run dev

# In another terminal, expose local server
ngrok http 3000

# Use ngrok URL in Webflow webhook configuration
```

#### Test Manually

```bash
# Trigger tests directly (if ALLOW_EXTERNAL_TEST_TRIGGER=true)
curl -X POST https://your-app.vercel.app/api/run-tests \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test-123"}'
```

## API Endpoints

### `POST /api/webhook`
Receives Webflow webhook events.

**Headers:**
- `X-Webflow-Signature`: Webflow webhook signature

**Response:**
```json
{
  "success": true,
  "message": "Webhook received, tests queued",
  "jobId": "test-1234567890-abc",
  "statusUrl": "/api/test-status/test-1234567890-abc",
  "reportUrl": "/api/reports/test-1234567890-abc"
}
```

### `GET /api/test-status/[jobId]`
Get test execution status.

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "test-1234567890-abc",
    "status": "completed",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:05:00.000Z"
  },
  "reportUrl": "/api/reports/test-1234567890-abc"
}
```

### `GET /api/reports/[jobId]`
Get test report.

**Query Parameters:**
- `file` (optional): Specific file to retrieve (default: `index.html`)

**Response:**
- HTML report (if `file=index.html`)
- JSON metadata (if no file specified)

## Important Notes

### Vercel Limitations

1. **Function Timeout**: 
   - Hobby: 10 seconds
   - Pro: 60 seconds
   - Enterprise: 300 seconds (configured in `vercel.json`)

2. **Playwright in Serverless**:
   - Playwright browsers are installed during build (`postinstall` script)
   - Only Chromium is installed to reduce build size
   - Tests run in headless mode

3. **Report Storage**:
   - Reports are stored in memory (in-memory Map)
   - **For production, consider using**:
     - Vercel Blob Storage
     - AWS S3
     - Database (PostgreSQL, MongoDB)
     - Redis

### Production Recommendations

1. **Use External Storage**: Replace in-memory storage with a database or blob storage
2. **Add Authentication**: Protect endpoints with API keys or OAuth
3. **Add Notifications**: Send Slack/Email notifications on test completion
4. **Add Retry Logic**: Retry failed tests automatically
5. **Add Test History**: Store historical test results

## Troubleshooting

### Tests Not Running

1. Check Vercel function logs: `vercel logs`
2. Verify webhook secret is correct
3. Check function timeout limits
4. Verify Playwright browsers are installed

### Reports Not Available

1. Check job status: `GET /api/test-status/[jobId]`
2. Verify tests completed successfully
3. Check function logs for errors

### Webhook Validation Failing

1. Verify `WEBFLOW_WEBHOOK_SECRET` is set correctly
2. Check webhook signature format
3. Ensure raw body is being passed correctly

## Development

### Local Testing

```bash
# Run tests locally
npm test

# View test report
npm run test:report
```

### Testing Webhook Locally

Use a tool like [ngrok](https://ngrok.com/) or [localtunnel](https://localtunnel.github.io/www/) to expose your local server:

```bash
# Using ngrok
ngrok http 3000

# Use the ngrok URL in Webflow webhook settings
```

## License

ISC

