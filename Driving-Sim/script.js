// Mapbox access token - Will be injected by GitHub Actions from secrets
mapboxgl.accessToken = '';

// Global variables
let map;
let userMarker;
let destinationMarker;
let isNavigating = false;
let startTime = null;
let timerInterval = null;
let userPosition = null;
let destinationPosition = null;
let pathTaken = [];
let isSatelliteView = false;
let pathSource = null;

// Initialize the application
function init() {
    // Check if Mapbox token is set
    if (!mapboxgl.accessToken || mapboxgl.accessToken === '') {
        console.error('Mapbox access token is not set. Please configure MAPBOX_ACCESS_TOKEN secret in GitHub repository settings.');
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
                <div style="text-align: center; padding: 2rem; border: 2px solid #ff6b6b; border-radius: 10px; background: #ffe0e0;">
                    <h2 style="color: #d63031;">⚠️ Configuration Error</h2>
                    <p>Mapbox access token is not configured.</p>
                    <p>Please add your Mapbox access token as a GitHub secret named <code>MAPBOX_ACCESS_TOKEN</code>.</p>
                    <p><a href="https://docs.github.com/en/actions/security-guides/encrypted-secrets" target="_blank">Learn how to add secrets</a></p>
                </div>
            </div>
        `;
        return;
    }

    // Initialize map with default location (will be updated with user's location)
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12', // Using Mapbox streets style with OSM data
        center: [-74.006, 40.7128], // Default to NYC
        zoom: 13
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl());

    // Event listeners
    document.getElementById('startBtn').addEventListener('click', startNavigation);
    document.getElementById('resetBtn').addEventListener('click', resetNavigation);
    document.getElementById('currentLocationBtn').addEventListener('click', getUserLocation);
    document.getElementById('satelliteToggle').addEventListener('click', toggleSatelliteView);

    // Map click event for movement
    map.on('click', handleMapClick);

    // Load map
    map.on('load', () => {
        console.log('Map loaded successfully');
        setupPathLayer();
        setupAutocomplete();
        getUserLocation();
    });

    // Hide instructions after 10 seconds
    setTimeout(() => {
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.style.opacity = '0.7';
        }
    }, 10000);
}

// Start navigation process
async function startNavigation() {
    const startAddress = getGeocoderValue(window.startGeocoder);
    const destinationAddress = getGeocoderValue(window.destGeocoder);

    if (!startAddress || !destinationAddress) {
        alert('Please enter both starting address and destination');
        return;
    }

    try {
        // Geocode addresses
        const startCoords = await geocodeAddress(startAddress);
        const destCoords = await geocodeAddress(destinationAddress);

        if (!startCoords || !destCoords) {
            alert('Could not find one or both addresses. Please try different addresses.');
            return;
        }

        // Set positions
        userPosition = startCoords;
        destinationPosition = destCoords;

        // Center map on start position
        map.setCenter(userPosition);
        map.setZoom(15);

        // Create markers
        createUserMarker();
        createDestinationMarker();
        
        // Initialize path
        updatePathLine();

        // Start navigation
        isNavigating = true;
        startTime = Date.now();
        startTimer();
        pathTaken = [userPosition];

        // Update UI
        document.getElementById('startBtn').disabled = true;
        document.querySelector('.status').textContent = 'Navigate to the red destination marker';
        document.getElementById('instructions').style.display = 'none';

        console.log('Navigation started:', { startCoords, destCoords });

    } catch (error) {
        console.error('Error starting navigation:', error);
        alert('Error starting navigation. Please try again.');
    }
}

// Geocode address using Mapbox Geocoding API
async function geocodeAddress(address) {
    try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&limit=1`
        );
        
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            return data.features[0].center; // Returns [lng, lat]
        }
        
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Create user marker
function createUserMarker() {
    if (userMarker) {
        userMarker.remove();
    }

    const el = document.createElement('div');
    el.className = 'user-marker';

    userMarker = new mapboxgl.Marker(el)
        .setLngLat(userPosition)
        .addTo(map);
}

// Create destination marker
function createDestinationMarker() {
    if (destinationMarker) {
        destinationMarker.remove();
    }

    const el = document.createElement('div');
    el.className = 'destination-marker';

    destinationMarker = new mapboxgl.Marker(el)
        .setLngLat(destinationPosition)
        .addTo(map);
}

// Handle map clicks for movement
async function handleMapClick(e) {
    if (!isNavigating) return;

    const clickCoords = e.lngLat;
    
    try {
        // Check if the click is on a road
        const isOnRoad = await checkIfOnRoad(clickCoords);
        
        if (isOnRoad) {
            // Move user marker to clicked position
            userPosition = [clickCoords.lng, clickCoords.lat];
            userMarker.setLngLat(userPosition);
            
            // Add to path
            pathTaken.push(userPosition);
            
            // Update path line
            updatePathLine();
            
            // Pan map to follow user
            map.panTo(userPosition);
            
            // Check if destination reached
            checkDestinationReached();
            
            console.log('Moved to:', userPosition);
        } else {
            // Show feedback that movement is not allowed
            showMovementFeedback('You can only move on roads!');
        }
    } catch (error) {
        console.error('Error handling map click:', error);
    }
}

// Check if coordinates are on a road using Mapbox Directions API
async function checkIfOnRoad(coords) {
    try {
        // Use Mapbox Directions API to snap to nearest road
        const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${userPosition[0]},${userPosition[1]};${coords.lng},${coords.lat}?access_token=${mapboxgl.accessToken}&geometries=geojson&steps=true`
        );
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            // Check if the route is reasonable (not too long for a single click)
            const route = data.routes[0];
            const distance = route.distance; // in meters
            
            // Allow movement if distance is reasonable (less than 500m for a single click)
            return distance < 500;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking road:', error);
        // Fallback: allow movement if API fails
        return true;
    }
}

// Check if destination is reached
function checkDestinationReached() {
    if (!destinationPosition) return;

    const distance = calculateDistance(userPosition, destinationPosition);
    
    if (distance <= 25) { // 25 meters threshold
        showSuccessMessage();
    }
}

// Calculate distance between two coordinates in meters
function calculateDistance(coord1, coord2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1[1] * Math.PI / 180;
    const φ2 = coord2[1] * Math.PI / 180;
    const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
    const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

// Show success message
function showSuccessMessage() {
    isNavigating = false;
    stopTimer();
    
    const totalTime = Date.now() - startTime;
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);
    
    document.getElementById('successTime').textContent = 
        `Time taken: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('successModal').style.display = 'flex';
    
    // Log path for analysis
    console.log('Path taken:', pathTaken);
    console.log('Total distance:', calculateTotalPathDistance());
}

// Calculate total path distance
function calculateTotalPathDistance() {
    let totalDistance = 0;
    for (let i = 1; i < pathTaken.length; i++) {
        totalDistance += calculateDistance(pathTaken[i-1], pathTaken[i]);
    }
    return totalDistance;
}

// Close success modal
function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
    resetNavigation();
}

// Start timer
function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);
}

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Update timer display
function updateTimer() {
    if (!startTime) return;
    
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Reset navigation
function resetNavigation() {
    isNavigating = false;
    startTime = null;
    stopTimer();
    
    // Remove markers
    if (userMarker) {
        userMarker.remove();
        userMarker = null;
    }
    if (destinationMarker) {
        destinationMarker.remove();
        destinationMarker = null;
    }
    
    // Reset variables
    userPosition = null;
    destinationPosition = null;
    pathTaken = [];
    
    // Clear path line
    if (pathSource) {
        pathSource.setData({
            type: 'FeatureCollection',
            features: []
        });
    }
    
    // Reset UI
    document.getElementById('startBtn').disabled = false;
    document.getElementById('timer').textContent = '00:00';
    document.querySelector('.status').textContent = 'Ready to navigate';
    document.getElementById('instructions').style.display = 'block';
    
    // Clear input fields
    if (window.startGeocoder && window.startGeocoder._inputEl) {
        window.startGeocoder._inputEl.value = '';
    }
    if (window.destGeocoder && window.destGeocoder._inputEl) {
        window.destGeocoder._inputEl.value = '';
    }
}

// Toggle satellite view
function toggleSatelliteView() {
    isSatelliteView = !isSatelliteView;
    
    if (isSatelliteView) {
        map.setStyle('mapbox://styles/mapbox/satellite-v9');
        document.getElementById('satelliteToggle').textContent = 'Street View';
    } else {
        map.setStyle('mapbox://styles/mapbox/streets-v12');
        document.getElementById('satelliteToggle').textContent = 'Satellite View';
    }
}

// Show movement feedback
function showMovementFeedback(message) {
    // Create temporary feedback element
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(244, 67, 54, 0.9);
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 3000;
        font-weight: bold;
        animation: fadeInOut 2s ease-in-out;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(feedback);
    
    // Remove after animation
    setTimeout(() => {
        document.body.removeChild(feedback);
        document.head.removeChild(style);
    }, 2000);
}

// Setup path layer for showing traveled route
function setupPathLayer() {
    // Add a source for the path line
    map.addSource('path-source', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    // Add a layer for the path line
    map.addLayer({
        id: 'path-line',
        type: 'line',
        source: 'path-source',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#4CAF50',
            'line-width': 4,
            'line-opacity': 0.8
        }
    });

    // Store reference to the source
    pathSource = map.getSource('path-source');
}

// Update the path line with current route
function updatePathLine() {
    if (!pathSource || pathTaken.length < 2) return;

    const pathFeature = {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: pathTaken
        }
    };

    pathSource.setData({
        type: 'FeatureCollection',
        features: [pathFeature]
    });
}

// Setup autocomplete for address inputs
function setupAutocomplete() {
    const startInput = document.getElementById('startAddress');
    const destInput = document.getElementById('destinationAddress');

    // Create autocomplete for start address
    const startAutocomplete = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        placeholder: 'Enter starting location',
        marker: false,
        bbox: [-180, -90, 180, 90],
        countries: 'us,ca,mx,gb,fr,de,it,es,au,nz'
    });

    // Create autocomplete for destination address
    const destAutocomplete = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        placeholder: 'Enter destination',
        marker: false,
        bbox: [-180, -90, 180, 90],
        countries: 'us,ca,mx,gb,fr,de,it,es,au,nz'
    });

    // Add geocoder components to the input groups
    startInput.parentNode.appendChild(startAutocomplete.onAdd(map));
    destInput.parentNode.appendChild(destAutocomplete.onAdd(map));

    // Hide original inputs
    startInput.style.display = 'none';
    destInput.style.display = 'none';

    // Store references for later use
    window.startGeocoder = startAutocomplete;
    window.destGeocoder = destAutocomplete;
}

// Get address from geocoder input
function getGeocoderValue(geocoder) {
    if (geocoder && geocoder._inputEl) {
        return geocoder._inputEl.value.trim();
    }
    return '';
}

// Get user's current location and center map
function getUserLocation() {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
        console.log('Geolocation is not supported by this browser');
        showLocationMessage('Geolocation is not supported by your browser. Using default location.');
        return;
    }

    // Show loading message
    showLocationMessage('Getting your location...');

    // Get current position
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userCoords = [position.coords.longitude, position.coords.latitude];
            const accuracy = position.coords.accuracy;
            
            console.log('User location found:', userCoords, 'Accuracy:', accuracy + 'm');
            
            // Center map on user's location
            map.setCenter(userCoords);
            map.setZoom(15);
            
            // Show success message
            showLocationMessage(`Location found! Accuracy: ${Math.round(accuracy)}m`, 'success');
            
            // Auto-fill starting address with current location
            reverseGeocode(userCoords, 'start');
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Could not get your location. Using default location.';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied. Please allow location access for better experience.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable. Using default location.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out. Using default location.';
                    break;
            }
            
            showLocationMessage(errorMessage, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        }
    );
}

// Reverse geocode coordinates to get address
async function reverseGeocode(coords, inputType) {
    try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${mapboxgl.accessToken}&types=address,poi`
        );
        
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            const address = data.features[0].place_name;
            
            // Auto-fill the appropriate input field
            if (inputType === 'start' && window.startGeocoder && window.startGeocoder._inputEl) {
                window.startGeocoder._inputEl.value = address;
            }
            
            console.log('Reverse geocoded address:', address);
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
    }
}

// Show location-related messages to user
function showLocationMessage(message, type = 'info') {
    // Remove any existing location message
    const existingMessage = document.getElementById('locationMessage');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create new message element
    const messageEl = document.createElement('div');
    messageEl.id = 'locationMessage';
    messageEl.textContent = message;
    
    // Style based on message type
    let backgroundColor = 'rgba(33, 150, 243, 0.9)'; // Blue for info
    if (type === 'success') {
        backgroundColor = 'rgba(76, 175, 80, 0.9)'; // Green for success
    } else if (type === 'error') {
        backgroundColor = 'rgba(244, 67, 54, 0.9)'; // Red for error
    }
    
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${backgroundColor};
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 25px;
        z-index: 3000;
        font-weight: 500;
        font-size: 0.9rem;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease-out;
        max-width: 90%;
        text-align: center;
    `;
    
    // Add animation styles if not already present
    if (!document.getElementById('locationMessageStyles')) {
        const style = document.createElement('style');
        style.id = 'locationMessageStyles';
        style.textContent = `
            @keyframes slideDown {
                from { 
                    opacity: 0; 
                    transform: translateX(-50%) translateY(-20px); 
                }
                to { 
                    opacity: 1; 
                    transform: translateX(-50%) translateY(0); 
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(messageEl);
    
    // Auto-remove message after 4 seconds
    setTimeout(() => {
        if (messageEl && messageEl.parentNode) {
            messageEl.style.animation = 'slideDown 0.3s ease-out reverse';
            setTimeout(() => {
                if (messageEl && messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }
    }, 4000);
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);

