#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * BookPilot AI — Owner Browser QA Ticket Generator
 *
 * Generates an HMAC-SHA256 signed, single-use activation code with a strict
 * 120-second validity window.
 *
 * Usage:
 *   node scratch/generate-browser-ticket.js
 *   node scratch/generate-browser-ticket.js --activate
 */

const fs = require('fs');
const crypto = require('crypto');
const https = require('https');

// 1. Locate secret securely outside repository
function getQaSecret() {
  if (process.env.AI_QA_GATEWAY_SECRET) {
    return process.env.AI_QA_GATEWAY_SECRET.trim();
  }
  const backupEnvPath = 'C:\\bookpilot-backups\\.preview-qa.env';
  if (fs.existsSync(backupEnvPath)) {
    const content = fs.readFileSync(backupEnvPath, 'utf8');
    const match = content.split('\n').find(l => l.startsWith('AI_QA_GATEWAY_SECRET='));
    if (match) {
      return match.split('=')[1].trim();
    }
  }
  return null;
}

function getBypassToken() {
  if (process.env.VERCEL_PROTECTION_BYPASS) {
    return process.env.VERCEL_PROTECTION_BYPASS.trim();
  }
  const bypassEnvPath = 'C:\\bookpilot-backups\\.vercel-bypass.env';
  if (fs.existsSync(bypassEnvPath)) {
    const content = fs.readFileSync(bypassEnvPath, 'utf8');
    const match = content.split('\n').find(l => l.startsWith('VERCEL_PROTECTION_BYPASS='));
    if (match) {
      return match.split('=')[1].trim();
    }
  }
  return null;
}

function generateTicket(secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    type: 'qa_activation_ticket',
    salon: 'bookpilot-qa-salon',
    nonce: crypto.randomUUID(),
    iat: now,
    exp: now + 120, // 2-minute validity
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('hex');

  return {
    ticket: `${payloadB64}.${signature}`,
    expiresAt: new Date((now + 120) * 1000).toISOString(),
    nonce: payload.nonce
  };
}

async function activateSession(host, ticket, bypassToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code: ticket });
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    };
    if (bypassToken) {
      headers['x-vercel-protection-bypass'] = bypassToken;
    }

    const req = https.request({
      hostname: host,
      path: '/api/internal/qa-session/activate',
      method: 'POST',
      headers,
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data
        });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  const secret = getQaSecret();
  if (!secret) {
    console.error('ERROR: AI_QA_GATEWAY_SECRET could not be found.');
    process.exit(1);
  }

  const { ticket, expiresAt, nonce } = generateTicket(secret);
  const args = process.argv.slice(2);
  const shouldActivate = args.includes('--activate');

  console.log('=== BOOKPILOT QA — SINGLE-USE BROWSER ACTIVATION TICKET ===');
  console.log(`Nonce:      ${nonce}`);
  console.log(`Expires At: ${expiresAt} (valid for 120 seconds)`);
  console.log(`Code:       ${ticket}\n`);

  console.log('--- USAGE INSTRUCTIONS ---');
  console.log('1. In your QA Browser (or Muse AI browser profile):');
  console.log('   Navigate to: https://aisolan-49g26i8wu-sajidkhanniazis-projects.vercel.app/api/internal/qa-session/activate');
  console.log('   Paste the code into the password field and click "Activate Browser QA Session".');
  console.log('   (Note: Credentials never appear in URLs or browser history).');
  console.log('\n2. Programmatic Activation via POST:');
  console.log('   POST https://aisolan-49g26i8wu-sajidkhanniazis-projects.vercel.app/api/internal/qa-session/activate');
  console.log('   Body: { "code": "' + ticket.slice(0, 30) + '..." }');

  if (shouldActivate) {
    console.log('\n--- EXECUTING TEST ACTIVATION (via POST) ---');
    const bypassToken = getBypassToken();
    const host = 'aisolan-49g26i8wu-sajidkhanniazis-projects.vercel.app';
    const res = await activateSession(host, ticket, bypassToken);
    console.log(`Status: ${res.status}`);
    console.log(`Data:   ${JSON.stringify(res.data)}`);
    const setCookie = res.headers['set-cookie'];
    console.log(`Set-Cookie Present: ${Boolean(setCookie)}`);
    if (setCookie) {
      console.log(`Cookies: ${setCookie.map(c => c.split(';')[0]).join(', ')}`);
    }

    // Test atomic replay rejection
    console.log('\n--- TESTING ATOMIC REPLAY REJECTION ---');
    const replayRes = await activateSession(host, ticket, bypassToken);
    console.log(`Replay Status: ${replayRes.status}`);
    console.log(`Replay Data:   ${JSON.stringify(replayRes.data)}`);
    console.log(`PASS (Replay blocked with 409): ${replayRes.status === 409}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
