// server.js
// Express.js application - Main server file
// Updated: 2025-11-07 - Fixed timestamp conversion and signature validation
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Middleware - IMPORTANT: Capture raw body BEFORE parsing
// We need to handle webhook signature validation, so we must preserve raw body
let rawBodyBuffer = null;

app.use('/api/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  // Store raw body as Buffer for webhook signature validation
  // CRITICAL: Keep as Buffer - don't convert to string yet
  req.rawBodyBuffer = req.body; // This is a Buffer
  req.rawBody = req.body.toString('utf8'); // String version for JSON parsing
  // Parse JSON manually for webhook endpoint
  try {
    req.body = JSON.parse(req.rawBody);
  } catch (e) {
    req.body = {};
  }
  next();
});

// For all other routes, use normal JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory store for test jobs (in production, use a database)
const testJobsStore = new Map();

/**
 * Validates Webflow webhook signature
 * Webflow sends signature as: timestamp,signature
 * Or just: signature (for newer webhooks)
 */
function validateWebflowSignature(signature, body, secret, timestamp) {
  console.log('=== VALIDATE SIGNATURE START ===');
  console.log('Signature input:', signature);
  console.log('Body input length:', body.length);
  console.log('Body input type:', typeof body);
  console.log('Secret length:', secret?.length);
  console.log('Timestamp:', timestamp);
  let normalizedTimestamp = null;
  
  if (!signature || !secret) {
    console.log('❌ Missing signature or secret');
    return false;
  }
  
  // Check timestamp if provided (prevent replay attacks)
  if (timestamp) {
    let requestTime = parseInt(timestamp, 10);
    // Webflow sends timestamp in milliseconds, convert to seconds if > 1e10
    if (requestTime > 1e10) {
      requestTime = Math.floor(requestTime / 1000);
      console.log('Converted timestamp from milliseconds to seconds:', requestTime);
    }
    normalizedTimestamp = String(requestTime);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - requestTime);
    
    // Reject if timestamp is more than 5 minutes old
    if (timeDiff > 300) {
      console.log('❌ Timestamp too old:', { requestTime, currentTime, timeDiff });
      return false;
    }
    console.log('✅ Timestamp valid:', { requestTime, currentTime, timeDiff });
  }
  
  // Use Buffer if provided, otherwise convert to string then to buffer
  let bodyBuffer;
  let bodyString = null;
  if (Buffer.isBuffer(body)) {
    bodyBuffer = body;
    console.log('Using body as Buffer, length:', bodyBuffer.length);
  } else {
    bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    bodyBuffer = Buffer.from(bodyString, 'utf8');
    console.log('Converted body to Buffer, length:', bodyBuffer.length);
    console.log('Body string (first 100):', bodyString.substring(0, 100));
  }
  if (!bodyString) {
    bodyString = bodyBuffer.toString('utf8');
  }
  
  // Prepare candidate secret keys
  const secretCandidates = [];
  const secretStrings = [];
  const trimmedSecret = secret.trim();
  secretStrings.push(secret);
  if (!secretStrings.includes(trimmedSecret)) {
    secretStrings.push(trimmedSecret);
  }
  const noNewlines = trimmedSecret.replace(/\r?\n|\r/g, '');
  if (!secretStrings.includes(noNewlines)) {
    secretStrings.push(noNewlines);
  }
  
  for (const secretString of secretStrings) {
    try {
      secretCandidates.push({ label: `utf8(${JSON.stringify(secretString)})`, key: Buffer.from(secretString, 'utf8') });
    } catch (err) {
      console.log('Unable to create utf8 secret buffer for', secretString, err.message);
    }
    
    if (/^[0-9a-f]+$/i.test(secretString) && secretString.length % 2 === 0) {
      try {
        const hexKey = Buffer.from(secretString, 'hex');
        secretCandidates.push({ label: `hex(${JSON.stringify(secretString)})`, key: hexKey });
      } catch (err) {
        console.log('Secret is not valid hex:', secretString, err.message);
      }
    }
    
    try {
      const base64Key = Buffer.from(secretString, 'base64');
      const sanitizedSecret = secretString.replace(/=+$/, '');
      if (base64Key.length && base64Key.toString('base64').replace(/=+$/, '') === sanitizedSecret) {
        secretCandidates.push({ label: `base64(${JSON.stringify(secretString)})`, key: base64Key });
      }
    } catch (err) {
      console.log('Secret is not valid base64:', secretString, err.message);
    }
  }
  
  console.log('Secret candidate keys:', secretCandidates.map(c => `${c.label}:${c.key.length}`));
  
  // Build expected signature variants
  const expectedVariants = [];
  
  for (const { label, key } of secretCandidates) {
    const variantBody = crypto.createHmac('sha256', key).update(bodyBuffer).digest('hex');
    expectedVariants.push({ label: `${label}|body`, value: variantBody });
    
    if (timestamp) {
      const tsOriginal = String(timestamp);
      const tsNormalized = normalizedTimestamp ?? tsOriginal;
      
      expectedVariants.push({
        label: `${label}|timestamp.body`,
        value: crypto.createHmac('sha256', key).update(tsOriginal).update('.').update(bodyBuffer).digest('hex')
      });
      
      expectedVariants.push({
        label: `${label}|timestamp+body`,
        value: crypto.createHmac('sha256', key).update(tsOriginal).update(bodyBuffer).digest('hex')
      });
      
      expectedVariants.push({
        label: `${label}|timestamp:body`,
        value: crypto.createHmac('sha256', key).update(tsOriginal).update(':').update(bodyBuffer).digest('hex')
      });
      
      expectedVariants.push({
        label: `${label}|timestamp\\nbody`,
        value: crypto.createHmac('sha256', key).update(tsOriginal).update('\n').update(bodyBuffer).digest('hex')
      });
      
      expectedVariants.push({
        label: `${label}|timestamp\\r\\nbody`,
        value: crypto.createHmac('sha256', key).update(tsOriginal).update('\r\n').update(bodyBuffer).digest('hex')
      });
      
      if (tsNormalized !== tsOriginal) {
        expectedVariants.push({
          label: `${label}|normalizedTimestamp.body`,
          value: crypto.createHmac('sha256', key).update(tsNormalized).update('.').update(bodyBuffer).digest('hex')
        });
        
        expectedVariants.push({
          label: `${label}|normalizedTimestamp+body`,
          value: crypto.createHmac('sha256', key).update(tsNormalized).update(bodyBuffer).digest('hex')
        });
        
        expectedVariants.push({
          label: `${label}|normalizedTimestamp:body`,
          value: crypto.createHmac('sha256', key).update(tsNormalized).update(':').update(bodyBuffer).digest('hex')
        });
        
        expectedVariants.push({
          label: `${label}|normalizedTimestamp\\nbody`,
          value: crypto.createHmac('sha256', key).update(tsNormalized).update('\n').update(bodyBuffer).digest('hex')
        });
        
        expectedVariants.push({
          label: `${label}|normalizedTimestamp\\r\\nbody`,
          value: crypto.createHmac('sha256', key).update(tsNormalized).update('\r\n').update(bodyBuffer).digest('hex')
        });
      }
    }
  }
  
  console.log('Expected signature variants:', expectedVariants.map(v => `${v.label}:${v.value.substring(0, 16)}...`));
  
  // Extract the signature hash
  // Webflow format: "timestamp,signature" or just "signature"
  let receivedHash = signature.trim();
  
  if (signature.includes(',')) {
    // Format: timestamp,signature
    const parts = signature.split(',');
    receivedHash = parts[parts.length - 1].trim();
    console.log('Extracted hash from comma-separated format:', receivedHash);
  } else {
    console.log('Using signature as-is (no comma):', receivedHash);
  }
  
  console.log('Received hash:', receivedHash);
  console.log('Received hash length:', receivedHash.length);
  
  // Compare signatures
  try {
    if (!expectedVariants.length) {
      console.log('No expected signature variants generated');
      return false;
    }
    
    const receivedBuffer = Buffer.from(receivedHash, 'hex');
    let matchedVariant = null;
    
    for (const variant of expectedVariants) {
      if (variant.value.length !== receivedHash.length) {
        continue;
      }
      try {
        const variantBuffer = Buffer.from(variant.value, 'hex');
        if (crypto.timingSafeEqual(variantBuffer, receivedBuffer)) {
          matchedVariant = variant;
          break;
        }
      } catch (error) {
        console.log('Error comparing variant', variant.label, error.message);
      }
    }
    
    if (matchedVariant) {
      console.log('✅ Signature match!', { variant: matchedVariant.label });
      return true;
    }
    
    console.log('❌ Signature mismatch:', {
      received: receivedHash,
      receivedFirst16: receivedHash.substring(0, 16),
      variantsTried: expectedVariants.map(v => ({
        label: v.label,
        first16: v.value.substring(0, 16)
      })),
      bodyLength: bodyBuffer.length,
      secretLength: secret.length,
      secretPreview: secret.substring(0, 10) + '...'
    });
    return false;
  } catch (e) {
    console.error('❌ Signature validation error:', e.message);
    console.error('Error stack:', e.stack);
    return false;
  }
}

/**
 * Saves test report for a job
 */
async function saveTestReport(jobId) {
  try {
    const reportDir = path.join(process.cwd(), 'playwright-report');
    
    try {
      await fs.access(reportDir);
    } catch {
      console.log(`Report directory not found: ${reportDir}`);
      return;
    }

    const reportFiles = await fs.readdir(reportDir);
    const reportData = {};
    
    for (const file of reportFiles) {
      const filePath = path.join(reportDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const content = await fs.readFile(filePath, 'utf8');
        reportData[file] = content;
      }
    }

    const job = testJobsStore.get(jobId);
    if (job) {
      job.reportData = reportData;
      job.reportFiles = reportFiles;
      testJobsStore.set(jobId, job);
    }

    console.log(`Report saved for job ${jobId}`);
  } catch (error) {
    console.error(`Error saving report for job ${jobId}:`, error);
  }
}

/**
 * Runs Playwright tests asynchronously
 */
async function runTestsAsync(jobId) {
  const job = testJobsStore.get(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  try {
    console.log(`Starting tests for job ${jobId}`);
    
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    testJobsStore.set(jobId, job);

    // Run Playwright tests
    const testCommand = 'npx playwright test --project=chromium --reporter=html';
    
    await new Promise((resolve, reject) => {
      exec(testCommand, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          CI: 'true',
        },
        maxBuffer: 10 * 1024 * 1024,
      }, async (error, stdout, stderr) => {
        if (error) {
          console.error(`Test execution error: ${error.message}`);
          console.error(`STDERR: ${stderr}`);
          
          job.status = 'failed';
          job.error = error.message;
          job.stderr = stderr;
          job.stdout = stdout;
          job.completedAt = new Date().toISOString();
          testJobsStore.set(jobId, job);
          
          await saveTestReport(jobId);
          reject(error);
          return;
        }

        console.log(`Tests completed for job ${jobId}`);
        console.log(`STDOUT: ${stdout}`);
        
        job.status = 'completed';
        job.stdout = stdout;
        job.completedAt = new Date().toISOString();
        testJobsStore.set(jobId, job);
        
        await saveTestReport(jobId);
        resolve();
      });
    });

  } catch (error) {
    console.error(`Error running tests for job ${jobId}:`, error);
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date().toISOString();
    testJobsStore.set(jobId, job);
    throw error;
  }
}

// ==================== ROUTES ====================

/**
 * Health check endpoint
 */
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Webflow Playwright Test Automation API',
    endpoints: {
      webhook: '/api/webhook',
      runTests: '/api/run-tests',
      testStatus: '/api/test-status/:jobId',
      reports: '/api/reports/:jobId'
    }
  });
});

/**
 * Webhook endpoint - Receives Webflow webhook
 */
app.post('/api/webhook', (req, res) => {
  // Log immediately when webhook is received
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Request method:', req.method);
  console.log('Request path:', req.path);
  console.log('Request URL:', req.url);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Has body:', !!req.body);
  console.log('Body type:', typeof req.body);
  
  try {
    const webhookSecret = process.env.WEBFLOW_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('WEBFLOW_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers['x-webflow-signature'] || req.headers['X-Webflow-Signature'];
    const timestamp = req.headers['x-webflow-timestamp'] || req.headers['X-Webflow-Timestamp'];
    
    // Get raw body - CRITICAL: Must be exactly as Webflow sent it
    // Use the Buffer directly for signature validation (most accurate)
    let rawBodyBuffer = req.rawBodyBuffer;
    if (!rawBodyBuffer || !Buffer.isBuffer(rawBodyBuffer)) {
      // Fallback: create buffer from raw body string
      rawBodyBuffer = Buffer.from(req.rawBody || JSON.stringify(req.body), 'utf8');
    }
    const rawBody = req.rawBody || rawBodyBuffer.toString('utf8');
    
    console.log('Raw body buffer type:', Buffer.isBuffer(rawBodyBuffer) ? 'Buffer' : typeof rawBodyBuffer);
    console.log('Raw body buffer length:', rawBodyBuffer?.length);
    
    // Log ALL headers for debugging
    console.log('=== WEBHOOK DEBUG INFO ===');
    console.log('All headers:', JSON.stringify(req.headers, null, 2));
    console.log('Signature header:', signature);
    console.log('Timestamp header:', timestamp);
    console.log('Raw body type:', typeof rawBody);
    console.log('Raw body length:', rawBody.length);
    console.log('Raw body (first 200 chars):', rawBody.substring(0, 200));
    console.log('Raw body (last 50 chars):', rawBody.substring(rawBody.length - 50));
    console.log('Secret length:', webhookSecret?.length);
    console.log('Secret preview:', webhookSecret?.substring(0, 10) + '...');
    
    // Validate signature - pass Buffer for most accurate validation
    // Ensure we're passing a Buffer, not an object
    const bodyForValidation = Buffer.isBuffer(rawBodyBuffer) ? rawBodyBuffer : Buffer.from(rawBody, 'utf8');
    console.log('Body type being passed to validation:', Buffer.isBuffer(bodyForValidation) ? 'Buffer' : typeof bodyForValidation);
    
    if (!validateWebflowSignature(signature, bodyForValidation, webhookSecret, timestamp)) {
      console.error('=== SIGNATURE VALIDATION FAILED ===');
      console.error('Signature received:', signature);
      console.error('Body used for validation (string):', rawBody);
      console.error('Body used for validation (buffer length):', bodyForValidation.length);
      console.error('Secret length:', webhookSecret?.length);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    console.log('=== SIGNATURE VALIDATION SUCCESS ===');

    // Parse payload
    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    
    // Log full payload structure for debugging
    console.log('=== PAYLOAD STRUCTURE ===');
    console.log('Payload type:', typeof payload);
    console.log('Payload keys:', Object.keys(payload || {}));
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    
    // Determine event type from payload
    // Webflow sends triggerType at root level, not inside payload object
    const eventType = payload.triggerType || payload.name || payload.type || payload.event || 
                      (payload.payload && payload.payload.triggerType);
    const normalizedEventType = typeof eventType === 'string'
      ? eventType.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      : undefined;
    
    console.log('Webhook event type detected:', eventType, 'normalized:', normalizedEventType);
    
    if (normalizedEventType !== 'site_publish') {
      console.log(`Ignoring webhook event: ${eventType}`);
      return res.status(200).json({ 
        message: 'Event received but not a publish event',
        event: eventType 
      });
    }

    // Generate unique test job ID
    const jobId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store job info
    testJobsStore.set(jobId, {
      id: jobId,
      status: 'queued',
      createdAt: new Date().toISOString(),
      webflowEvent: eventType,
      siteId: payload.site || payload.siteId || payload?.payload?.siteId,
      webflowPayload: payload.payload || payload.data || payload,
    });

    // Trigger test execution asynchronously
    runTestsAsync(jobId).catch(err => {
      console.error(`Test execution failed for job ${jobId}:`, err);
      const failedJob = testJobsStore.get(jobId) || {};
      failedJob.status = 'failed';
      failedJob.error = err.message;
      failedJob.completedAt = new Date().toISOString();
      testJobsStore.set(jobId, failedJob);
    });

    // Return immediately with job ID
    return res.status(200).json({
      success: true,
      message: 'Webhook received, tests queued',
      jobId,
      statusUrl: `/api/test-status/${jobId}`,
      reportUrl: `/api/reports/${jobId}`,
    });

  } catch (error) {
    console.error('=== WEBHOOK PROCESSING ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * Run tests endpoint - Can be called directly (optional)
 */
app.post('/api/run-tests', (req, res) => {
  const isInternal = req.headers['x-internal-request'] === 'true';
  
  if (!isInternal && !process.env.ALLOW_EXTERNAL_TEST_TRIGGER) {
    return res.status(403).json({ error: 'External test triggers not allowed' });
  }

  try {
    const { jobId } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    let job = testJobsStore.get(jobId) || {
      id: jobId,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    job.status = 'running';
    job.startedAt = new Date().toISOString();
    testJobsStore.set(jobId, job);

    res.status(202).json({
      success: true,
      message: 'Tests started',
      jobId,
      status: 'running',
      statusUrl: `/api/test-status/${jobId}`,
      reportUrl: `/api/reports/${jobId}`,
    });

    runTestsAsync(jobId).catch(err => {
      console.error(`Test execution failed for job ${jobId}:`, err);
      const failedJob = testJobsStore.get(jobId) || {};
      failedJob.status = 'failed';
      failedJob.error = err.message;
      failedJob.completedAt = new Date().toISOString();
      testJobsStore.set(jobId, failedJob);
    });

  } catch (error) {
    console.error('Test trigger error:', error);
    return res.status(500).json({ 
      error: 'Failed to start tests',
      message: error.message 
    });
  }
});

/**
 * Test status endpoint
 */
app.get('/api/test-status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = testJobsStore.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const { reportData, ...jobStatus } = job;
    
    return res.status(200).json({
      success: true,
      job: jobStatus,
      reportUrl: `/api/reports/${jobId}`,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * Reports endpoint
 */
app.get('/api/reports/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const requestedFile = req.query.file || 'index.html';
    
    const job = testJobsStore.get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.reportData || !job.reportFiles) {
      return res.status(202).json({
        success: false,
        message: 'Report not ready yet',
        status: job.status,
      });
    }

    if (job.reportData[requestedFile]) {
      let contentType = 'text/html';
      if (requestedFile.endsWith('.js')) contentType = 'application/javascript';
      if (requestedFile.endsWith('.css')) contentType = 'text/css';
      if (requestedFile.endsWith('.json')) contentType = 'application/json';
      
      res.setHeader('Content-Type', contentType);
      return res.status(200).send(job.reportData[requestedFile]);
    }

    return res.status(200).json({
      success: true,
      jobId,
      status: job.status,
      reportFiles: job.reportFiles,
      reportUrl: `/api/reports/${jobId}?file=index.html`,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });

  } catch (error) {
    console.error('Report serving error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

// For Vercel, export the app
// For local development, start the server
if (process.env.VERCEL) {
  // Vercel will handle the server
  module.exports = app;
} else {
  // Local development
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhook`);
  });
}

