// server.js
// Express.js application - Main server file
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Middleware
app.use(express.json({ verify: (req, res, buf) => {
  // Store raw body for webhook signature validation
  req.rawBody = buf.toString('utf8');
}}));
app.use(express.urlencoded({ extended: true }));

// In-memory store for test jobs (in production, use a database)
const testJobsStore = new Map();

/**
 * Validates Webflow webhook signature
 */
function validateWebflowSignature(signature, body, secret) {
  if (!signature || !secret) return false;
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  
  const parts = signature.split(',');
  const receivedHash = parts[parts.length - 1];
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedHash)
    );
  } catch (e) {
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
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Validate signature
    if (!validateWebflowSignature(signature, rawBody, webhookSecret)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

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

