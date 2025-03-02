// Initialize the map
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json', // Free vector tiles
    center: [106.873, -6.297], // Center on your data (Jakarta area)
    zoom: 15
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl());

// Add the data when the map loads
map.on('load', function () {
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
            'circle-color': '#3887be',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    // Add a popup on hover
    const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    map.on('mouseenter', 'fat-points', function (e) {
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
    
    map.on('mouseleave', 'fat-points', function () {
        map.getCanvas().style.cursor = '';
        popup.remove();
        document.getElementById('info').innerHTML = 'Hover over a point to see details';
    });
});
