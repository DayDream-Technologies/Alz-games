// Test script to verify token injection logic
const fs = require('fs');

// Simulate the token injection process
function testTokenInjection() {
    console.log('=== TESTING TOKEN INJECTION ===');
    
    // Read the current script.js
    let content = fs.readFileSync('script.js', 'utf8');
    
    console.log('Original token line:');
    const originalLine = content.split('\n').find(line => line.includes('mapboxgl.accessToken'));
    console.log(originalLine);
    
    // Simulate token injection (replace with a test token)
    const testToken = 'pk.test_token_123456789';
    content = content.replace(/mapboxgl\.accessToken = '';/, `mapboxgl.accessToken = '${testToken}';`);
    
    console.log('\nAfter injection:');
    const newLine = content.split('\n').find(line => line.includes('mapboxgl.accessToken'));
    console.log(newLine);
    
    // Write to a test file
    fs.writeFileSync('script-test.js', content);
    console.log('\nTest file created: script-test.js');
    
    // Verify the injection worked
    const testContent = fs.readFileSync('script-test.js', 'utf8');
    const testLine = testContent.split('\n').find(line => line.includes('mapboxgl.accessToken'));
    
    if (testLine && testLine.includes(testToken)) {
        console.log('✅ Token injection test PASSED');
    } else {
        console.log('❌ Token injection test FAILED');
    }
    
    // Clean up
    fs.unlinkSync('script-test.js');
    console.log('Test file cleaned up');
}

// Run the test
testTokenInjection();
