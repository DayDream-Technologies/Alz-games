// Test script to simulate GitHub Actions token injection
const fs = require('fs');

// Simulate the GitHub Actions environment
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || 'pk.test_token_123456789';

console.log('=== SIMULATING GITHUB ACTIONS TOKEN INJECTION ===');
console.log('Token from env:', MAPBOX_ACCESS_TOKEN ? MAPBOX_ACCESS_TOKEN.substring(0, 10) + '...' : 'undefined');

// Read the current script
let content = fs.readFileSync('script.js', 'utf8');
console.log('Before replacement - token line:', content.split('\n').find(line => line.includes('mapboxgl.accessToken')));

// Perform the same replacement as in GitHub Actions
content = content.replace(/mapboxgl\.accessToken = '';/, `mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';`);

console.log('After replacement - token line:', content.split('\n').find(line => line.includes('mapboxgl.accessToken')));

// Write back to the file
fs.writeFileSync('script.js', content);
console.log('Token injection completed');

// Verify the injection worked
const verifyContent = fs.readFileSync('script.js', 'utf8');
const verifyLine = verifyContent.split('\n').find(line => line.includes('mapboxgl.accessToken'));

if (verifyLine && verifyLine.includes(MAPBOX_ACCESS_TOKEN)) {
    console.log('✅ Token injection verification PASSED');
} else {
    console.log('❌ Token injection verification FAILED');
    console.log('Expected token:', MAPBOX_ACCESS_TOKEN);
    console.log('Actual line:', verifyLine);
}

console.log('=== END SIMULATION ===');
