const canvas = document.getElementById('libraryCanvas');
const ctx = canvas.getContext('2d');

// Config
const CONFIG = {
    nodeSize: 4,
    connectionDist: 150,
    attractionForce: 0.0005, // Strength of semantic cluster attraction
    colors: {
        artifact: '#00f3ff', // Cyan
        wisdom: '#ff00ff',   // Magenta
        paper: '#ffe100',    // Yellow
        signal: '#00ff66'    // Green
    }
};

let nodes = [];
let width, height;
let mouse = { x: null, y: null };
let selectedNode = null;
let activeFilter = 'all';

// Node Class
class Node {
    constructor(data) {
        this.data = data;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = CONFIG.nodeSize;
        this.color = CONFIG.colors[data.type] || '#fff';
        this.hovered = false;
        this.opacity = 1;
    }

    update(allNodes) {
        // Physics
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Cluster Attraction (Same Type)
        // Only if no filter is active (otherwise it gets messy)
        if (activeFilter === 'all') {
            allNodes.forEach(other => {
                if (this !== other && this.data.type === other.data.type) {
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist < 300) { // Only attract if somewhat close
                        this.vx += dx * CONFIG.attractionForce;
                        this.vy += dy * CONFIG.attractionForce;
                    }
                }
            });
            
            // Limit speed so they don't explode
            const speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
            if (speed > 1) {
                this.vx = (this.vx / speed) * 1;
                this.vy = (this.vy / speed) * 1;
            }
        }

        // Mouse interaction
        this.hovered = false;
        if (mouse.x) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 30) {
                this.hovered = true;
                // Expand slightly if hovered
            }
        }
        
        // Filter logic
        if (activeFilter !== 'all' && this.data.type !== activeFilter) {
            this.opacity = 0.1;
        } else {
            this.opacity = 1;
        }
        
        // Size logic
        if (this.hovered || this === selectedNode) {
            this.size = CONFIG.nodeSize * 2.5;
        } else {
            this.size = CONFIG.nodeSize;
        }
    }

    draw() {
        ctx.globalAlpha = this.opacity;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        
        // Glow
        if (this.opacity > 0.5 && (this.hovered || this === selectedNode)) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0; // Reset

        // Label on hover/select
        if (this.opacity > 0.5 && (this.hovered || this === selectedNode)) {
            ctx.fillStyle = '#fff';
            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText(this.data.title, this.x, this.y - 15);
        }
        
        ctx.globalAlpha = 1; // Reset
    }
}

// Init
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

async function loadData() {
    try {
        const response = await fetch('../../data/library.json');
        const data = await response.json();
        nodes = data.map(item => new Node(item));
        document.getElementById('node-count').innerText = nodes.length;
    } catch (e) {
        console.error("Failed to load library data", e);
    }
}

function drawConnections() {
    for (let i = 0; i < nodes.length; i++) {
        // Skip connection drawing if one is filtered out
        if (nodes[i].opacity < 0.5) continue;

        for (let j = i + 1; j < nodes.length; j++) {
            if (nodes[j].opacity < 0.5) continue;

            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < CONFIG.connectionDist) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(100, 100, 100, ${(1 - dist/CONFIG.connectionDist) * 0.5})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.stroke();
            }
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    
    // Update all first
    nodes.forEach(node => node.update(nodes));
    
    // Draw connections (behind nodes)
    drawConnections();
    
    // Draw nodes
    nodes.forEach(node => node.draw());

    requestAnimationFrame(animate);
}

// Interaction
window.addEventListener('resize', resize);
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener('click', (e) => {
    // If clicking strictly on canvas (not UI), find node
    const clicked = nodes.find(n => n.hovered && n.opacity > 0.5);
    if (clicked) {
        selectNode(clicked);
    } else {
        closePanel();
    }
});

function selectNode(node) {
    selectedNode = node;
    const panel = document.getElementById('details-panel');
    const title = document.getElementById('detail-title');
    const type = document.getElementById('detail-type');
    const summary = document.getElementById('detail-summary');
    const link = document.getElementById('detail-link');

    title.innerText = node.data.title;
    type.innerText = node.data.type;
    type.className = 'badge'; // reset
    type.style.background = CONFIG.colors[node.data.type];
    
    summary.innerText = node.data.summary;
    link.href = node.data.link;

    panel.classList.remove('hidden');
}

function closePanel() {
    selectedNode = null;
    document.getElementById('details-panel').classList.add('hidden');
}

document.getElementById('close-panel').addEventListener('click', closePanel);

// Filter Buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Update active class
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update state
        activeFilter = e.target.dataset.type;
        
        // Reset selection if it's filtered out
        if (selectedNode && selectedNode.data.type !== activeFilter && activeFilter !== 'all') {
            closePanel();
        }
    });
});

// Boot
resize();
loadData();
animate();
