// Test script with a placeholder token to verify injection works
mapboxgl.accessToken = '';

// Debug: Log token status
console.log('=== MAPBOX TOKEN DEBUG ===');
console.log('Token value:', mapboxgl.accessToken);
console.log('Token length:', mapboxgl.accessToken ? mapboxgl.accessToken.length : 0);
console.log('Token starts with pk.:', mapboxgl.accessToken ? mapboxgl.accessToken.startsWith('pk.') : false);
console.log('Token is empty string:', mapboxgl.accessToken === '');
console.log('Token is undefined:', mapboxgl.accessToken === undefined);
console.log('Token is null:', mapboxgl.accessToken === null);
console.log('========================');

// Simple test function
function testMapboxConnection() {
    if (!mapboxgl.accessToken || mapboxgl.accessToken === '') {
        console.error('No token available for testing');
        return false;
    }
    
    console.log('Testing Mapbox connection with token:', mapboxgl.accessToken.substring(0, 10) + '...');
    return true;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testMapboxConnection };
}
