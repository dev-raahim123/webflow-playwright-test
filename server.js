// server.js
// Express.js application - Main server file
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
  // Store raw body for webhook signature validation
  req.rawBody = req.body.toString('utf8');
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
  
  if (!signature || !secret) {
    console.log('❌ Missing signature or secret');
    return false;
  }
  
  // Check timestamp if provided (prevent replay attacks)
  if (timestamp) {
    const requestTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - requestTime);
    
    // Reject if timestamp is more than 5 minutes old
    if (timeDiff > 300) {
      console.log('❌ Timestamp too old:', { requestTime, currentTime, timeDiff });
      return false;
    }
    console.log('✅ Timestamp valid:', { requestTime, currentTime, timeDiff });
  }
  
  // Ensure body is a string
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  console.log('Body string length:', bodyString.length);
  console.log('Body string (first 100):', bodyString.substring(0, 100));
  
  // Create expected signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(bodyString, 'utf8');
  const expectedSignature = hmac.digest('hex');
  
  console.log('Expected signature:', expectedSignature);
  console.log('Expected signature length:', expectedSignature.length);
  
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
    // Ensure both are the same length
    if (expectedSignature.length !== receivedHash.length) {
      console.log('❌ Signature length mismatch:', {
        expectedLength: expectedSignature.length,
        receivedLength: receivedHash.length,
        expected: expectedSignature,
        received: receivedHash
      });
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedHash, 'hex')
    );
    
    if (!isValid) {
      console.log('❌ Signature mismatch:', {
        expected: expectedSignature,
        received: receivedHash,
        expectedFirst16: expectedSignature.substring(0, 16),
        receivedFirst16: receivedHash.substring(0, 16),
        bodyLength: bodyString.length,
        secretLength: secret.length
      });
    } else {
      console.log('✅ Signature match!');
    }
    
    return isValid;
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
  try {
    const webhookSecret = process.env.WEBFLOW_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('WEBFLOW_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers['x-webflow-signature'] || req.headers['X-Webflow-Signature'];
    const timestamp = req.headers['x-webflow-timestamp'] || req.headers['X-Webflow-Timestamp'];
    
    // Get raw body - CRITICAL: Must be exactly as Webflow sent it
    // Since we're using express.raw() for this route, req.body is a Buffer
    // and req.rawBody is the string version
    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body));
    
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
    
    // Validate signature
    if (!validateWebflowSignature(signature, rawBody, webhookSecret, timestamp)) {
      console.error('=== SIGNATURE VALIDATION FAILED ===');
      console.error('Signature received:', signature);
      console.error('Body used for validation:', rawBody);
      console.error('Secret length:', webhookSecret?.length);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    console.log('=== SIGNATURE VALIDATION SUCCESS ===');

    // Parse payload
    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    
    // Check if this is a site publish event
    if (payload.name !== 'site.publish') {
      console.log(`Ignoring webhook event: ${payload.name}`);
      return res.status(200).json({ 
        message: 'Event received but not a publish event',
        event: payload.name 
      });
    }

    // Generate unique test job ID
    const jobId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store job info
    testJobsStore.set(jobId, {
      id: jobId,
      status: 'queued',
      createdAt: new Date().toISOString(),
      webflowEvent: payload.name,
      siteId: payload.site || payload.siteId,
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
    console.error('Webhook processing error:', error);
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

