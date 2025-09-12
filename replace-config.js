module.exports = {
  files: 'Driving-Sim/script.js',
  from: /mapboxgl\.accessToken = '';/g,
  to: `mapboxgl.accessToken = '${process.env.MAPBOX_TOKEN}';`,
};
