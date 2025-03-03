// Initialize the map without a specific center
const map = L.map("map", {
    minZoom: 2,  // Prevent zooming out too far
    worldCopyJump: true  // Handles the date line better
  });
  
  // Add event listener to detect map view changes
  map.on('zoomend moveend', function(e) {
    console.log('Map view changed:', map.getZoom(), map.getCenter());
  });
  
  // Add OpenStreetMap tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  
  // Set a default view until data loads
  map.setView([0, 0], 2);
  
  // Create a legend
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function (map) {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <h4>Legend</h4>
      <i style="background: #e74c3c"></i> 0 Jml. Port Tersedia (Full)<br>
      <i style="background: #f39c12"></i> 1-3 Jml. Port Tersedia<br>
      <i style="background: #3498db"></i> 4-6 Jml. Port Tersedia<br>
      <i style="background: #2ecc71"></i> 7+ Jml. Port Tersedia<br>
      <hr>
      <i style="border-radius: 50%; border: 2px solid black"></i> UPC Barrel<br><br>
      <i style="border-radius: 0; border: 2px solid black"></i> APC Barrel
    `;
    return div;
  };
  legend.addTo(map);
  
  // Create info panel
  const info = L.control({ position: "topright" });
  info.onAdd = function (map) {
    this._div = L.DomUtil.create("div", "info");
    this.update();
    return this._div;
  };
  info.update = function (props) {
    this._div.innerHTML =
      "<h4>Info Infrastruktur Indospace</h4>" +
      (props
        ? `<b>${props.FAT || "N/A"}</b><br>
            BTS: ${props.BTS || "N/A"}<br>
            FDT: ${props.FDT || "N/A"}<br>
            Total Ports: ${props["Jml Port"] || "N/A"}<br>
            Available Ports: ${props["Sisa Port"] || "N/A"}<br>
            Barrel Type: ${props.Barel || "N/A"}<br>
            Location: ${props["Last Update"] || "N/A"}`
        : "Arahkan mouse di atas point");
  };
  info.addTo(map);
  
  // Global variable to store the GeoJSON layer
  let geoJsonLayer;
  
  // Global variable to store the data
  let telecomData;
  
  // Function to determine marker color based on available ports
  function getColor(availablePorts) {
    if (availablePorts === 0) return "#e74c3c"; // Red for full
    if (availablePorts >= 1 && availablePorts <= 3) return "#f39c12"; // Orange for low
    if (availablePorts >= 4 && availablePorts <= 6) return "#3498db"; // Blue for medium
    return "#2ecc71"; // Green for high availability
  }
  
  // Function to create markers
  function createMarker(feature, latlng) {
    const availablePorts = feature.properties["Sisa Port"] || 0;
    const barrelType = feature.properties.Barel;
  
    // Determine marker shape based on barrel type
    const markerShape = barrelType === "UPC" ? "circle" : "square";
  
    // Create marker options
    const markerOptions = {
      radius: 8,
      fillColor: getColor(availablePorts),
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    };
  
    // Create the appropriate marker based on barrel type
    let marker;
    if (markerShape === "circle") {
      marker = L.circleMarker(latlng, markerOptions);
    } else {
      // For square markers, we use a custom icon
      const icon = L.divIcon({
        className: "custom-square-marker",
        html: `<div style="background-color: ${getColor(availablePorts)};"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      marker = L.marker(latlng, { icon: icon });
    }
  
    // Add popup and event listeners
    marker.bindPopup(createPopupContent(feature.properties));
    marker.on("mouseover", function (e) {
      this.openPopup();
      info.update(feature.properties);
    });
    marker.on("mouseout", function (e) {
      this.closePopup();
      info.update();
    });
  
    return marker;
  }
  
  // Function to create popup content
  function createPopupContent(props) {
    return `
      <div>
        <h3>${props.FAT || "N/A"}</h3>
        <p><strong>BTS:</strong> ${props.BTS || "N/A"}</p>
        <p><strong>FDT:</strong> ${props.FDT || "N/A"}</p>
        <p><strong>Total Ports:</strong> ${props["Jml Port"] || "N/A"}</p>
        <p><strong>Available Ports:</strong> ${props["Sisa Port"] || "N/A"}</p>
        <p><strong>Barrel Type:</strong> ${props.Barel || "N/A"}</p>
        <p><strong>Location:</strong> ${props["Last Update"] || "N/A"}</p>
        <p><strong>Coordinates:</strong> ${props.latitude}, ${props.longitude}</p>
      </div>
    `;
  }
  
  // Function to process and display the data
  function processData(data) {
    // First, validate coordinates to ensure they're all valid
    const validFeatures = data.features.filter(feature => {
      const coords = feature.geometry.coordinates;
      // Check if coordinates are valid numbers and within reasonable bounds
      return Array.isArray(coords) && 
             coords.length === 2 &&
             !isNaN(coords[0]) && !isNaN(coords[1]) &&
             Math.abs(coords[0]) <= 180 && Math.abs(coords[1]) <= 90;
    });
    
    // Create a new GeoJSON with only valid features
    const validData = {
      type: "FeatureCollection",
      features: validFeatures
    };
    
    // Add GeoJSON layer to map
    geoJsonLayer = L.geoJSON(validData, {
      pointToLayer: createMarker,
    }).addTo(map);
  
    // Make sure we have data to fit
    if (validFeatures.length > 0) {
      // Get bounds of the data
      const bounds = geoJsonLayer.getBounds();
      
      // Check if bounds are valid
      if (bounds.isValid()) {
        // Wait for the map to be ready
        setTimeout(() => {
          // Fit map to bounds with padding
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15
          });
          
          // Force another fit after a short delay to ensure it sticks
          setTimeout(() => {
            map.invalidateSize();
            map.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 15
            });
          }, 500);
        }, 100);
      } else {
        console.error("Invalid bounds from GeoJSON data");
        map.setView([-2.5, 118], 5); // Fallback to Indonesia view
      }
    } else {
      console.warn("No valid features found in GeoJSON data");
      map.setView([-2.5, 118], 5); // Fallback to Indonesia view
    }
  
    // Update dashboard with statistics using the original data
    updateDashboard(data);
  
    // Populate filter options
    populateFilters(data);
  
    // Remove loader
    document.querySelector(".loader").style.display = "none";
  }
  
  // Function to update dashboard with statistics
  function updateDashboard(data) {
    const features = data.features;
  
    // Total points
    document.getElementById("total-points").textContent = features.length;
  
    // Available ports
    const totalAvailablePorts = features.reduce((sum, feature) => {
      return sum + (feature.properties["Sisa Port"] || 0);
    }, 0);
    document.getElementById("available-ports").textContent = totalAvailablePorts;
  
    // BTS distribution
    const btsCount = {};
    features.forEach((feature) => {
      const bts = feature.properties.BTS || "Unknown";
      btsCount[bts] = (btsCount[bts] || 0) + 1;
    });
  
    const btsDistributionHtml = Object.entries(btsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([bts, count]) => `${bts}: ${count}`)
      .join("<br>");
    document.getElementById("bts-distribution").innerHTML = btsDistributionHtml;
  
    // Barrel types
    const barrelCount = {};
    features.forEach((feature) => {
      const barrel = feature.properties.Barel || "Unknown";
      barrelCount[barrel] = (barrelCount[barrel] || 0) + 1;
    });
  
    const barrelHtml = Object.entries(barrelCount)
      .map(([barrel, count]) => `${barrel}: ${count}`)
      .join("<br>");
    document.getElementById("barrel-types").innerHTML = barrelHtml;
  }
  
  // Function to populate filter options
  function populateFilters(data) {
    const features = data.features;
  
    // BTS filter
    const btsSet = new Set();
    features.forEach((feature) => {
      if (feature.properties.BTS) {
        btsSet.add(feature.properties.BTS);
      }
    });
  
    const btsFilter = document.getElementById("bts-filter");
    btsSet.forEach((bts) => {
      const option = document.createElement("option");
      option.value = bts;
      option.textContent = bts;
      btsFilter.appendChild(option);
    });
  
    // Add event listeners to filters
    btsFilter.addEventListener("change", applyFilters);
    document.getElementById("port-filter").addEventListener("change", applyFilters);
  }
  
  // Function to apply filters
  function applyFilters() {
    const btsFilter = document.getElementById("bts-filter").value;
    const portFilter = document.getElementById("port-filter").value;
  
    // Remove existing layer
    if (geoJsonLayer) {
      map.removeLayer(geoJsonLayer);
    }
  
    // Filter the data
    const filteredData = {
      type: "FeatureCollection",
      features: telecomData.features.filter((feature) => {
        // BTS filter
        if (btsFilter !== "all" && feature.properties.BTS !== btsFilter) {
          return false;
        }
  
        // Port filter
        const availablePorts = feature.properties["Sisa Port"] || 0;
        if (portFilter === "0" && availablePorts !== 0) {
          return false;
        } else if (
          portFilter === "1-3" &&
          (availablePorts < 1 || availablePorts > 3)
        ) {
          return false;
        } else if (
          portFilter === "4-6" &&
          (availablePorts < 4 || availablePorts > 6)
        ) {
          return false;
        } else if (portFilter === "7+" && availablePorts < 7) {
          return false;
        }
  
        return true;
      }),
    };
  
    // Add filtered layer
    geoJsonLayer = L.geoJSON(filteredData, {
      pointToLayer: createMarker,
    }).addTo(map);
  
    // If there are filtered features, fit the map to them
    if (filteredData.features.length > 0) {
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15
        });
      }
    }
  
    // Update dashboard with filtered data
    updateDashboard(filteredData);
  
    // Show count of filtered results
    const totalFiltered = filteredData.features.length;
    const totalOriginal = telecomData.features.length;
    document.getElementById("total-points").textContent = `${totalFiltered} of ${totalOriginal}`;
  }
  
  // Function to load GeoJSON data from file
  function loadGeoJsonData() {
    fetch("telecom_data.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        // Debug: Log coordinate ranges to check for outliers
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        data.features.forEach(feature => {
          const coords = feature.geometry.coordinates;
          if (Array.isArray(coords) && coords.length === 2) {
            minLng = Math.min(minLng, coords[0]);
            maxLng = Math.max(maxLng, coords[0]);
            minLat = Math.min(minLat, coords[1]);
            maxLat = Math.max(maxLat, coords[1]);
          }
        });
        console.log("Coordinate ranges:", {minLng, maxLng, minLat, maxLat});
        
        telecomData = data;
        processData(data);
      })
      .catch((error) => {
        console.error("Error loading GeoJSON data:", error);
        document.querySelector(".loader").innerHTML =
          "Error loading data. Please check console for details.";
        map.setView([-2.5, 118], 5); // Fallback to Indonesia view
      });
  }
  
  // Load data when page loads
  loadGeoJsonData();