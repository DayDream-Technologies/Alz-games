# Driving Simulator - Manual Navigation

A browser-based driving simulation website that allows users to manually navigate from a starting location to a destination using Mapbox GL JS and OpenStreetMap data.

## 🚀 Features

- **Manual Navigation**: Click/tap on roads to move your vehicle
- **Road-Only Movement**: Movement is restricted to roads only using Mapbox routing validation
- **Real-time Tracking**: Timer starts when you begin moving and stops when you reach the destination
- **Geocoding**: Convert addresses to coordinates using Mapbox Geocoding API
- **Responsive Design**: Works on both desktop and mobile devices
- **Satellite Toggle**: Switch between street and satellite view
- **Path Logging**: Tracks your route for analysis
- **Success Detection**: Automatically detects when you're within 25 meters of the destination

## 🛠️ Setup Instructions

### 1. Get a Mapbox Access Token

1. Go to [Mapbox](https://www.mapbox.com/) and create a free account
2. Navigate to your [Account page](https://account.mapbox.com/)
3. Create a new access token or use the default public token
4. Copy your access token

### 2. Set up GitHub Secret (for deployment)

For automatic deployment with GitHub Actions:

1. Go to your GitHub repository settings
2. Navigate to **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `MAPBOX_ACCESS_TOKEN`
5. Value: Your Mapbox access token (starts with `pk.`)
6. Click **Add secret**

The GitHub Actions workflow will automatically inject this token during deployment.

### 3. Local Development

For local development, you can temporarily replace the empty token in `script.js`:

```javascript
// Replace this line in script.js:
mapboxgl.accessToken = '';

// With your actual token:
mapboxgl.accessToken = 'YOUR_ACTUAL_MAPBOX_TOKEN_HERE';
```

### 4. Run the Application

Simply open `index.html` in your web browser. No server setup required!

## 🎮 How to Use

1. **Enter Addresses**: Type in your starting address and destination
2. **Start Navigation**: Click "Start Navigation" to begin
3. **Move Your Car**: Click on roads to move your vehicle (you can only move on roads!)
4. **Reach Destination**: Navigate to the red destination marker
5. **Success**: When you're within 25 meters, you'll see a success message with your completion time

## 🎯 Game Rules

- ✅ You can only move on roads
- ✅ Click/tap on the map to move
- ✅ Stay within 25 meters of the destination to win
- ❌ No off-road travel allowed
- ❌ No algorithmic routing assistance

## 📱 Mobile Support

The application is fully responsive and supports:
- Touch input for mobile devices
- Responsive layout that adapts to screen size
- Mobile-optimized controls and interface

## 🔧 Technical Details

### Technologies Used
- **HTML5**: Structure and semantic markup
- **CSS3**: Responsive styling with modern features
- **JavaScript (ES6+)**: Interactive functionality
- **Mapbox GL JS**: Map rendering and interaction
- **Mapbox APIs**: Geocoding and routing validation

### Key Features Implementation
- **Road Validation**: Uses Mapbox Directions API to validate movement
- **Distance Calculation**: Haversine formula for accurate distance measurement
- **Timer**: Real-time tracking with start/stop functionality
- **Path Logging**: Stores coordinates for route analysis
- **Responsive Design**: CSS Grid and Flexbox for layout

## 🎨 Customization

You can easily customize:
- Map styles (satellite, street, etc.)
- Movement distance limits
- Destination proximity threshold
- UI colors and styling
- Timer format and display

## 📊 Optional Enhancements

The code includes hooks for:
- Path visualization
- Scoring system
- Multiple route attempts
- Performance analytics
- Custom markers and styling

## 🐛 Troubleshooting

### Common Issues

1. **Map not loading**: Check your Mapbox access token
2. **Geocoding not working**: Verify your token has geocoding permissions
3. **Movement not working**: Ensure you're clicking on roads, not off-road areas
4. **Mobile issues**: Make sure you're using a modern mobile browser

### Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve the driving simulator!

---

**Note**: This application requires a valid Mapbox access token to function. The free tier provides sufficient quota for development and testing purposes.
