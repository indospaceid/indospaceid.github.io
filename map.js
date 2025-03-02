// map.js - With OpenStreetMap vector tiles using external style

// Wait for both the map and data to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing map...");
    console.log(`Data loaded: ${pointCount} points available`);
    console.log(`Map will be centered at: [${mapCenter[0]}, ${mapCenter[1]}]`);
    console.log(`Map bounds: SW [${mapBounds.southwest}], NE [${mapBounds.northeast}]`);

    // Initialize the map with a basic style first
    const map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            sources: {},
            layers: [{
                id: 'background',
                type: 'background',
                paint: { 'background-color': '#f8f4f0' }
            }]
        },
        center: mapCenter,
        zoom: 12
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl());

    // Debug info overlay
    const debugOverlay = document.createElement('div');
    debugOverlay.className = 'map-overlay debug-overlay';
    debugOverlay.innerHTML = `
        <h3>Debug Info</h3>
        <p>Points loaded: ${pointCount}</p>
        <p>Map center: [${mapCenter[0].toFixed(6)}, ${mapCenter[1].toFixed(6)}]</p>
        <p>Zoom level: <span id="zoom-level">12</span></p>
        <p>Status: <span id="load-status">Loading...</span></p>
    `;
    document.body.appendChild(debugOverlay);

    // Update zoom level display when map moves
    map.on('move', function() {
        document.getElementById('zoom-level').textContent = map.getZoom().toFixed(2);
    });

    // Add the data when the map loads
    map.on('load', function() {
        console.log("Map loaded, setting up OSM vector tiles...");

        try {
            // Add OSM vector tile source
            map.addSource('osm-vector', {
                type: 'vector',
                tiles: ['https://vector.openstreetmap.org/shortbread_v1/{z}/{x}/{y}.mvt'],
                maxzoom: 14
            });

            // Add OSM vector tile layers
            // Background already exists

            // Water areas
            map.addLayer({
                id: 'water',
                type: 'fill',
                source: 'osm-vector',
                'source-layer': 'water',
                paint: {
                    'fill-color': '#a0c8f0'
                }
            });

            // Landuse areas
            map.addLayer({
                id: 'landuse',
                type: 'fill',
                source: 'osm-vector',
                'source-layer': 'landuse',
                paint: {
                    'fill-color': [
                        'match',
                        ['get', 'kind'],
                        'park', '#c8facc',
                        'cemetery', '#aacbaf',
                        'hospital', '#f4dcdc',
                        'industrial', '#d1c0b2',
                        'school', '#f6f1d1',
                        'commercial', '#ebd6c9',
                        'residential', '#e1e0dd',
                        '#ede9e4' // default
                    ]
                }
            });

            // Buildings
            map.addLayer({
                id: 'buildings',
                type: 'fill',
                source: 'osm-vector',
                'source-layer': 'buildings',
                paint: {
                    'fill-color': '#d9d0c9',
                    'fill-outline-color': '#b3ada5'
                }
            });

            // Minor roads
            map.addLayer({
                id: 'roads-minor',
                type: 'line',
                source: 'osm-vector',
                'source-layer': 'roads',
                filter: ['all',
                    ['!in', 'kind', 'motorway', 'trunk', 'primary', 'secondary'],
                    ['!=', 'kind', 'rail']
                ],
                paint: {
                    'line-color': '#ffffff',
                    'line-width': [
                        'interpolate', ['linear'], ['zoom'],
                        10, 0.5,
                        14, 2,
                        18, 12
                    ]
                }
            });

            // Major roads
            map.addLayer({
                id: 'roads-major',
                type: 'line',
                source: 'osm-vector',
                'source-layer': 'roads',
                filter: ['in', 'kind', 'motorway', 'trunk', 'primary', 'secondary'],
                paint: {
                    'line-color': [
                        'match',
                        ['get', 'kind'],
                        'motorway', '#fc8e75',
                        'trunk', '#fbb29a',
                        'primary', '#fdd7a1',
                        'secondary', '#f6fabb',
                        '#ffffff' // default
                    ],
                    'line-width': [
                        'interpolate', ['linear'], ['zoom'],
                        10, 1,
                        14, 4,
                        18, 16
                    ]
                }
            });

            // Road labels
            map.addLayer({
                id: 'road-labels',
                type: 'symbol',
                source: 'osm-vector',
                'source-layer': 'roads',
                filter: ['all', ['has', 'name'], ['!=', 'kind', 'rail']],
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Regular'],
                    'text-size': [
                        'interpolate', ['linear'], ['zoom'],
                        12, 10,
                        16, 14
                    ],
                    'text-max-angle': 30,
                    'symbol-placement': 'line',
                    'text-padding': 1,
                    'text-letter-spacing': 0.01,
                    'text-max-width': 8
                },
                paint: {
                    'text-color': '#666666',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1.5
                }
            });

            // Place labels
            map.addLayer({
                id: 'place-labels',
                type: 'symbol',
                source: 'osm-vector',
                'source-layer': 'places',
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Regular'],
                    'text-size': [
                        'interpolate', ['linear'], ['zoom'],
                        10, 12,
                        14, 16
                    ],
                    'text-max-width': 8
                },
                paint: {
                    'text-color': '#333333',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1.5
                }
            });

            console.log("OSM vector tiles added successfully");

            // Now add the FAT location data
            map.addSource('fat-locations', {
                type: 'geojson',
                data: geojsonData
            });

            // Add a layer for the points
            map.addLayer({
                id: 'fat-points',
                type: 'circle',
                source: 'fat-locations',
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#FF4500', // Bright orange for visibility
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });

            document.getElementById('load-status').textContent = 'Data loaded successfully';
            console.log("Data layer added successfully");

            // Fit the map to show all points with padding
            const bounds = new maplibregl.LngLatBounds(
                [mapBounds.southwest[0], mapBounds.southwest[1]],
                [mapBounds.northeast[0], mapBounds.northeast[1]]
            );

            map.fitBounds(bounds, {
                padding: 50, // Add some padding around the bounds
                maxZoom: 16  // Don't zoom in too far
            });

            // Add a popup on hover
            const popup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false
            });

            map.on('mouseenter', 'fat-points', function(e) {
                map.getCanvas().style.cursor = 'pointer';

                const coordinates = e.features[0].geometry.coordinates.slice();
                const properties = e.features[0].properties;

                // Create HTML content for the popup
                const description = `
                    <strong>FAT:</strong> ${properties.FAT}<br>
                    <strong>FDT:</strong> ${properties.FDT}<br>
                    <strong>BTS:</strong> ${properties.BTS}<br>
                    <strong>Ports:</strong> ${properties.JmlPort} (${properties.SisaPort} remaining)<br>
                    <strong>Description:</strong> ${properties.Deskripsi}
                `;

                // Update the info panel
                document.getElementById('info').innerHTML = description;

                // Position and display the popup
                popup.setLngLat(coordinates)
                    .setHTML(description)
                    .addTo(map);
            });

            map.on('mouseleave', 'fat-points', function() {
                map.getCanvas().style.cursor = '';
                popup.remove();
                document.getElementById('info').innerHTML = 'Hover over a point to see details';
            });

        } catch (error) {
            console.error("Error setting up map:", error);
            document.getElementById('load-status').textContent = 'Error: ' + error.message;
        }
    });

    // Handle map load errors
    map.on('error', function(e) {
        console.error('Map error:', e.error);
        document.getElementById('load-status').textContent = 'Map error: ' + e.error.message;
    });
});
