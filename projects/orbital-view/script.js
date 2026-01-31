// Initialize Map
const map = L.map('map', {
    zoomControl: false,
    attributionControl: true
}).setView([0, 0], 3);

// Add Dark Tiles (CartoDB Dark Matter is good, but let's stick to standard OSM with CSS filter for simplicity/reliability)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Custom Icon
const issIcon = L.divIcon({
    className: 'iss-icon',
    html: `<div style="
        width: 10px; 
        height: 10px; 
        background: #ffb000; 
        box-shadow: 0 0 10px #ffb000; 
        border-radius: 50%;
        position: relative;
    ">
        <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            border: 1px dashed #ffb000;
            border-radius: 50%;
            animation: spin 4s linear infinite;
        "></div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

// Markers
let issMarker = L.marker([0, 0], {icon: issIcon}).addTo(map);
let pathLine = L.polyline([], {color: '#ffb000', weight: 1, opacity: 0.5}).addTo(map);

// System Log
const logEl = document.getElementById('log');
function log(msg) {
    const time = new Date().toISOString().split('T')[1].split('.')[0];
    logEl.innerHTML = `> [${time}] ${msg}<br>` + logEl.innerHTML;
}

// Update Clock
setInterval(() => {
    document.getElementById('clock').innerText = new Date().toISOString().split('T')[1].split('.')[0] + " UTC";
}, 1000);

// Fetch ISS Data
async function updateISS() {
    try {
        const response = await fetch('http://api.open-notify.org/iss-now.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        const lat = parseFloat(data.iss_position.latitude);
        const lon = parseFloat(data.iss_position.longitude);
        
        // Update DOM
        document.getElementById('lat').innerText = lat.toFixed(4);
        document.getElementById('lon').innerText = lon.toFixed(4);
        
        // Update Map
        const newLatLng = [lat, lon];
        issMarker.setLatLng(newLatLng);
        
        // Update Path (keep last 50 points)
        pathLine.addLatLng(newLatLng);
        if (pathLine.getLatLngs().length > 50) {
            const points = pathLine.getLatLngs();
            points.shift();
            pathLine.setLatLngs(points);
        }
        
        // Center map occasionally or if first run
        if (!window.centered) {
            map.setView(newLatLng, 4);
            window.centered = true;
            log("TARGET LOCKED");
        }
        
    } catch (error) {
        console.error('Fetch error:', error);
        log("ERROR: SIGNAL LOST");
    }
}

// Loop
log("SYSTEM ONLINE");
updateISS();
setInterval(updateISS, 5000);

// Add CSS for spinner
const style = document.createElement('style');
style.innerHTML = `
    @keyframes spin {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
`;
document.head.appendChild(style);
