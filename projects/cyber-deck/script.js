// System Configuration
const SYSTEM_CONFIG = {
    location: { lat: -33.8688, lon: 151.2093, name: 'SYDNEY_AU' }, // Sydney
    refreshRate: 1000,
    logDelay: 2500
};

// 1. Clock Module
function updateClock() {
    const now = new Date();
    const timeString = now.toISOString().split('T')[1].split('.')[0];
    document.getElementById('clock').innerText = timeString + " UTC";
    
    // Random glitch effect
    if (Math.random() > 0.98) {
        document.getElementById('clock').innerText = "ERROR";
        setTimeout(() => document.getElementById('clock').innerText = timeString + " UTC", 100);
    }
}
setInterval(updateClock, 1000);

// 2. Weather Module (Open-Meteo)
async function fetchWeather() {
    const el = document.getElementById('weather-data');
    const coordsEl = document.getElementById('geo-coords');
    
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${SYSTEM_CONFIG.location.lat}&longitude=${SYSTEM_CONFIG.location.lon}&current_weather=true`);
        const data = await res.json();
        const weather = data.current_weather;
        
        el.innerHTML = `
            <div class="weather-info">
                <div>LOC: ${SYSTEM_CONFIG.location.name}</div>
                <div class="temp-big">${weather.temperature}°C</div>
                <div>WIND: ${weather.windspeed} KM/H</div>
            </div>
        `;
        coordsEl.innerText = `LAT: ${SYSTEM_CONFIG.location.lat} / LON: ${SYSTEM_CONFIG.location.lon}`;
    } catch (e) {
        el.innerHTML = `<div class="loading-text">CONNECTION FAILED</div>`;
    }
}
fetchWeather();
setInterval(fetchWeather, 600000); // 10 min update

// 3. Neural Visualizer (Canvas)
const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');
let width, height;

function resize() {
    width = canvas.width = canvas.parentElement.offsetWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
}
window.addEventListener('resize', resize);
resize();

let particles = [];
class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 2 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
    }
    draw() {
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

for (let i = 0; i < 50; i++) particles.push(new Particle());

function animate() {
    ctx.fillStyle = 'rgba(5, 5, 5, 0.2)'; // Trails
    ctx.fillRect(0, 0, width, height);
    
    particles.forEach(p => {
        p.update();
        p.draw();
        
        // Connect lines
        particles.forEach(p2 => {
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 100) {
                ctx.strokeStyle = `rgba(0, 243, 255, ${1 - dist/100})`;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });
    });
    requestAnimationFrame(animate);
}
animate();

// 4. Log Feed
const logs = [
    "Handshake initiated...",
    "Memory block 0x4F verified",
    "Optimizing neural pathways...",
    "Symbiosis protocol: ACTIVE",
    "Scanning local subnet...",
    "Uplink established",
    "Downloading cognitive patch...",
    "Packet loss: 0.001%",
    "Identity integrity: 100%",
    "Nash_Core.sys loaded"
];

function addLog() {
    const feed = document.getElementById('log-feed');
    const entry = document.createElement('div');
    entry.className = 'log-entry new';
    entry.innerText = `> ${logs[Math.floor(Math.random() * logs.length)]}`;
    
    feed.appendChild(entry);
    if (feed.children.length > 8) feed.removeChild(feed.firstChild);
    
    setTimeout(() => entry.classList.remove('new'), 500);
}
setInterval(addLog, 2000);

// 5. Metrics Simulation
function updateMetrics() {
    document.getElementById('bar-cpu0').style.width = Math.random() * 80 + 20 + '%';
    document.getElementById('bar-mem').style.width = Math.random() * 60 + 30 + '%';
    document.getElementById('bar-net').style.width = Math.random() * 90 + 10 + '%';
}
setInterval(updateMetrics, 500);
