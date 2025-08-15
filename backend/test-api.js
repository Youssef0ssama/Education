#!/usr/bin/env node

/**
 * Simple API Test Script
 * Tests if the NestJS backend is running and responding correctly
 */

const http = require('http');

const testEndpoint = (path, description) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method: 'GET',
      timeout: 5000
    };

    console.log(`Testing ${description}...`);
    console.log(`URL: http://localhost:3001/api${path}`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`✅ ${description}: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log(`   Response: ${JSON.stringify(parsed, null, 2)}`);
          } catch (e) {
            console.log(`   Response: ${data.substring(0, 100)}...`);
          }
        } else {
          console.log(`   Error: ${data}`);
        }
        console.log('');
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${description}: Connection failed`);
      console.log(`   Error: ${err.message}`);
      console.log('');
      resolve();
    });

    req.on('timeout', () => {
      console.log(`❌ ${description}: Timeout`);
      console.log('');
      req.destroy();
      resolve();
    });

    req.end();
  });
};

async function runTests() {
  console.log('🧪 Testing Baraem Al-Noor API Endpoints');
  console.log('='.repeat(50));
  console.log('');

  // Test basic endpoints
  await testEndpoint('/health', 'Health Check');
  await testEndpoint('/auth/me', 'Auth Profile (should return 401)');
  await testEndpoint('/docs', 'Swagger Documentation');

  console.log('📋 Test Summary:');
  console.log('- Health endpoint should return 200 with system info');
  console.log('- Auth endpoint should return 401 (unauthorized)');
  console.log('- Swagger docs should return 200 with HTML');
  console.log('');
  console.log('🌐 If all tests pass, visit:');
  console.log('   Frontend: http://localhost:5173');
  console.log('   Swagger:  http://localhost:3001/api/docs');
  console.log('');
}

runTests().catch(console.error);