
// Configuration Constants
const MAP_CONFIG = {
  center: [22.904047, 78.360745],
  zoom: 6,
  boundsPadding: [50, 50]
};

const MARKER_STYLES = {
  radius: 8,
  fillColor: "#ff0000",
  color: "#000",
  weight: 1,
  opacity: 1,
  fillOpacity: 0.8
};

const DEFAULT_TEXTS = {
  noData: 'N/A',
  districtSelect: '--Select District--',
  complaintSelect: '-- Select Complaint --',
  callTypeSelect: '-- Select Call Type --',
  unknown: 'Unknown'
};

// Layer Setup
const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © OpenStreetMap contributors'
});

const satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
  attribution: 'Imagery © Google Maps'
});

// Initialize map
const map = L.map('map', {
  center: MAP_CONFIG.center,
  zoom: MAP_CONFIG.zoom,
  layers: [osm]
});

// Global variables
let incidentMarkers = L.layerGroup().addTo(map);
let allIncidents = [];
let districtLayer = L.layerGroup(); 
let stateLayer = L.layerGroup();

// Load GeoJSON layers
function loadGeoJsonLayers() {
  // State boundary
  omnivore.geojson('India_states.json', null, L.geoJson(null, {
    onEachFeature: function (feature, layer) {
      const stateName = feature.properties.NAME_1 || feature.properties.name || DEFAULT_TEXTS.unknown;
      layer.bindTooltip(stateName, { 
        permanent: false, 
        direction: 'center', 
        className: 'state-tooltip' 
      });
    },
    style: {
      color: '#0044cc',
      weight: 1.5,
      fillColor: '#99ccff',
      fillOpacity: 0
    }
  })).addTo(stateLayer);

  // District boundary
  omnivore.geojson('MadhyaPradesh.json', null, L.geoJson(null, {
    onEachFeature: function (feature, layer) {
      const districtName = feature.properties.NAME_2 || feature.properties.name || DEFAULT_TEXTS.unknown;
      layer.bindTooltip(districtName, { 
        permanent: false, 
        direction: 'center', 
        className: 'district-tooltip' 
      });
    },
    style: {
      color: '#ff6600',
      weight: 2.5,
      fillColor: '#ffe0b3',
      fillOpacity: 0.3
    }
  })).addTo(districtLayer);
}

// Setup map controls
function setupMapControls() {
  // Base Maps
  const baseMaps = {
    "OpenStreetMap": osm,
    "Satellite View": satellite
  };

  // Overlay Maps
  const overlayMaps = {
    "State Boundaries": stateLayer,
    "District Boundaries": districtLayer,
    "Incidents": incidentMarkers
  };

  // Add controls to map
  L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
  L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);

  // Add legend
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = `
      <h4>Legend</h4>
      <i style="background: #0044cc; width: 18px; height: 18px; display: inline-block; margin-right: 5px;"></i> State Boundaries<br>
      <i style="background: #ff6600; width: 18px; height: 18px; display: inline-block; margin-right: 5px;"></i> District Boundaries<br>
      <i style="background: #ff0000; width: 18px; height: 18px; display: inline-block; margin-right: 5px; border-radius: 50%;"></i> Incident Marker<br>
    `;
    return div;
  };
  legend.addTo(map);
}

// Create incident marker
function createIncidentMarker(incident) {
  return L.circleMarker([incident.lat, incident.lon], MARKER_STYLES);
}

// Bind popup to marker
function bindMarkerPopup(marker, incident) {
  marker.bindPopup(`
    <b>ID:</b> ${incident.id || DEFAULT_TEXTS.noData}<br>
    <b>Datetime:</b> ${incident.datetime || DEFAULT_TEXTS.noData}<br>
    <b>District:</b> ${incident.district || DEFAULT_TEXTS.noData}<br>
    <b>Complaint:</b> ${incident.complaint || DEFAULT_TEXTS.noData}<br>
    <b>Call Type:</b> ${incident.call_type || DEFAULT_TEXTS.noData}<br>
    <b>Address:</b> ${incident.address || DEFAULT_TEXTS.noData}
  `);
}

// Load incidents from API
async function loadIncidents() {
  try {
    const response = await fetch('http://localhost:5000/api/incidents');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    allIncidents = data;
    populateFilters(data);
    displayIncidents(data);
  } catch (error) {
    console.error('Error loading incidents:', error);
    alert('Failed to load incidents. Please try again later.');
  }
}

// Populate filter dropdowns
function populateFilters(data) {
  const districtFilter = document.getElementById('districtFilter');
  const complaintFilter = document.getElementById('complaintFilter');
  const callTypeFilter = document.getElementById('callTypeFilter');

  // Get unique values
  const districts = [...new Set(data.map(d => d.district).filter(Boolean))].sort();
  const complaints = [...new Set(data.map(d => d.complaint).filter(Boolean))].sort();
  const callTypes = [...new Set(data.map(d => d.call_type).filter(Boolean))].sort();

  // Build options strings
  let districtOptions = `<option value="">${DEFAULT_TEXTS.districtSelect}</option>`;
  let complaintOptions = `<option value="">${DEFAULT_TEXTS.complaintSelect}</option>`;
  let callTypeOptions = `<option value="">${DEFAULT_TEXTS.callTypeSelect}</option>`;

  districts.forEach(district => {
    districtOptions += `<option value="${district}">${district}</option>`;
  });

  complaints.forEach(complaint => {
    complaintOptions += `<option value="${complaint}">${complaint}</option>`;
  });

  callTypes.forEach(callType => {
    callTypeOptions += `<option value="${callType}">${callType}</option>`;
  });

  // Update DOM once per filter
  districtFilter.innerHTML = districtOptions;
  complaintFilter.innerHTML = complaintOptions;
  callTypeFilter.innerHTML = callTypeOptions;
}

// Display incidents on map
function displayIncidents(data) {
  incidentMarkers.clearLayers();
  const markerCluster = L.markerClusterGroup();

  data.forEach(incident => {
    if (incident.lat && incident.lon) {
      const marker = createIncidentMarker(incident);
      bindMarkerPopup(marker, incident);
      
      marker.bindTooltip(`${incident.id || DEFAULT_TEXTS.unknown}`, { 
        permanent: false, 
        direction: 'top' 
      });

      markerCluster.addLayer(marker);
    }
  });

  incidentMarkers.addLayer(markerCluster);

  if (data.length > 0) {
    const bounds = markerCluster.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: MAP_CONFIG.boundsPadding });
    }
  }
}

// Apply filters
function applyFilters() {
  const selectedDistrict = document.getElementById('districtFilter').value;
  const selectedComplaint = document.getElementById('complaintFilter').value;
  const selectedCallType = document.getElementById('callTypeFilter').value;

  let filtered = allIncidents;

  if (selectedDistrict) {
    filtered = filtered.filter(i => i.district === selectedDistrict);
  }
  if (selectedComplaint) {
    filtered = filtered.filter(i => i.complaint === selectedComplaint);
  }
  if (selectedCallType) {
    filtered = filtered.filter(i => i.call_type === selectedCallType);
  }

  displayIncidents(filtered);

  // Highlight selected district
  if (selectedDistrict && districtLayer) {
    districtLayer.eachLayer(layer => {
      if (layer.feature && layer.feature.properties.DISTRICT === selectedDistrict) {
        layer.setStyle({ color: 'yellow', weight: 3 });
        map.fitBounds(layer.getBounds(), { padding: MAP_CONFIG.boundsPadding });
      } else {
        layer.setStyle({ color: 'red', weight: 1 });
      }
    });
  }
}

// Setup event listeners
function setupEventListeners() {
  const filters = [
    'districtFilter',
    'complaintFilter',
    'callTypeFilter'
  ];
  
  filters.forEach(id => {
    document.getElementById(id).addEventListener('change', applyFilters);
  });
}

// Initialize application
async function init() {
  // Clear existing layers
  incidentMarkers.clearLayers();
  districtLayer.clearLayers();
  stateLayer.clearLayers();

  // Setup map
  loadGeoJsonLayers();
  setupMapControls();
  setupEventListeners();

  // Load data
  await loadIncidents();
}

// Start the application
init();