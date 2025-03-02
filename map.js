// map.js - With OpenStreetMap vector tiles and auto-zoom

// Wait for both the map and data to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing map...");
    console.log(`Data loaded: ${pointCount} points available`);
    console.log(`Map will be centered at: [${mapCenter[0]}, ${mapCenter[1]}]`);
    console.log(`Map bounds: SW [${mapBounds.southwest}], NE [${mapBounds.northeast}]`);

    // Define the OSM vector tile style
    const osmStyle = {
        version: 8,
        sources: {
            osm: {
                type: 'vector',
                tiles: ['https://vector.openstreetmap.org/shortbread_v1/{z}/{x}/{y}.mvt'],
                maxzoom: 14
            }
        },
        layers: [
            // Background
            {
                id: 'background',
                type: 'background',
                paint: {
                    'background-color': '#f8f4f0'
                }
            },
            // Land
            {
                id: 'land',
                type: 'fill',
                source: 'osm',
                'source-layer': 'land',
                paint: {
                    'fill-color': '#f8f4f0'
                }
            },
            // Water
            {
                id: 'water',
                type: 'fill',
                source: 'osm',
                'source-layer': 'water',
                paint: {
                    'fill-color': '#a0c8f0'
                }
            },
            // Roads - minor
            {
                id: 'roads-minor',
                type: 'line',
                source: 'osm',
                'source-layer': 'roads',
                filter: ['all', ['!in', 'kind', 'motorway', 'trunk', 'primary', 'secondary']],
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 2
                }
            },
            // Roads - major
            {
                id: 'roads-major',
                type: 'line',
                source: 'osm',
                'source-layer': 'roads',
                filter: ['in', 'kind', 'motorway', 'trunk', 'primary', 'secondary'],
                paint: {
                    'line-color': '#f8d018',
                    'line-width': 3
                }
            },
            // Buildings
            {
                id: 'buildings',
                type: 'fill',
                source: 'osm',
                'source-layer': 'buildings',
                paint: {
                    'fill-color': '#d9d0c9',
                    'fill-outline-color': '#b3ada5'
                }
            },
            // Place labels
            {
                id: 'place-labels',
                type: 'symbol',
                source: 'osm',
                'source-layer': 'places',
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Regular'],
                    'text-size': 12
                },
                paint: {
                    'text-color': '#666666',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1
                }
            }
        ]
    };

    // Initialize the map with OSM vector tiles
    const map = new maplibregl.Map({
        container: 'map',
        style: osmStyle,
        center: mapCenter,
        zoom: 12 // Initial zoom, will be adjusted
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl());

    // Debug info overlay
    const debugOverlay = document.createElement('div');
    debugOverlay.className = 'map-overlay';
    debugOverlay.style.left = '10px';
    debugOverlay.style.top = '10px';
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
        console.log("Map loaded, adding data source...");

        try {
            // Add the data source
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
            console.error("Error adding data to map:", error);
            document.getElementById('load-status').textContent = 'Error: ' + error.message;
        }
    });

    // Handle map load errors
    map.on('error', function(e) {
        console.error('Map error:', e.error);
        document.getElementById('load-status').textContent = 'Map error: ' + e.error.message;
    });
});
