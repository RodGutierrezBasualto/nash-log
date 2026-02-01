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
        
        // Animation states
        this.currentRadius = 0; // Starts at 0 for pop-in effect
        this.targetRadius = CONFIG.nodeSize;
        
        this.currentOpacity = 0; // Starts invisible
        this.targetOpacity = 1;
        
        this.color = CONFIG.colors[data.type] || '#fff';
        this.hovered = false;
    }

    update(allNodes) {
        // Physics
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Cluster Attraction (Same Type)
        if (activeFilter === 'all') {
            allNodes.forEach(other => {
                if (this !== other && this.data.type === other.data.type) {
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist < 300) { 
                        this.vx += dx * CONFIG.attractionForce;
                        this.vy += dy * CONFIG.attractionForce;
                    }
                }
            });
            
            // Limit speed
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
            }
        }
        
        // Filter Logic -> Target Opacity
        if (activeFilter !== 'all' && this.data.type !== activeFilter) {
            this.targetOpacity = 0.1;
            this.targetRadius = CONFIG.nodeSize * 0.5; // Shrink if filtered
        } else {
            this.targetOpacity = 1;
            // Target Size Logic
            if (this.hovered || this === selectedNode) {
                this.targetRadius = CONFIG.nodeSize * 3.5; // Bigger pop
            } else {
                this.targetRadius = CONFIG.nodeSize;
            }
        }

        // Smooth Interpolation (Lerp)
        this.currentRadius += (this.targetRadius - this.currentRadius) * 0.1;
        this.currentOpacity += (this.targetOpacity - this.currentOpacity) * 0.05;
    }

    draw() {
        if (this.currentOpacity < 0.01) return; // Skip invisible

        ctx.globalAlpha = this.currentOpacity;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        
        // Glow effect
        if (this.currentOpacity > 0.5 && (this.hovered || this === selectedNode)) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0; // Reset

        // Label on hover/select
        if (this.currentOpacity > 0.5 && (this.hovered || this === selectedNode)) {
            ctx.fillStyle = '#fff';
            ctx.font = '11px JetBrains Mono';
            ctx.textAlign = 'center';
            // Offset label based on radius so it doesn't overlap
            ctx.fillText(this.data.title, this.x, this.y - (this.currentRadius + 10));
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
        // Stagger creation slightly for a "rain" effect? 
        // Or just let them all pop in naturally via the update loop (since they start r=0)
        nodes = data.map(item => new Node(item));
        document.getElementById('node-count').innerText = nodes.length;
    } catch (e) {
        console.error("Failed to load library data", e);
    }
}

function drawConnections() {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].currentOpacity < 0.3) continue;

        for (let j = i + 1; j < nodes.length; j++) {
            if (nodes[j].currentOpacity < 0.3) continue;

            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < CONFIG.connectionDist) {
                ctx.beginPath();
                // Make connections breathe slightly
                const breathe = 0.8 + Math.sin(Date.now() * 0.002) * 0.2;
                const alpha = (1 - dist/CONFIG.connectionDist) * 0.4 * breathe * Math.min(nodes[i].currentOpacity, nodes[j].currentOpacity);
                
                ctx.strokeStyle = `rgba(120, 120, 120, ${alpha})`;
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
    
    // Physics & Logic
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
    // Check if we clicked a node
    // Since sizes are dynamic, we check a slightly generous hitbox
    const clicked = nodes.find(n => {
        if (n.currentOpacity < 0.5) return false;
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        return Math.sqrt(dx*dx + dy*dy) < (n.currentRadius + 10);
    });

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
    type.className = 'badge'; 
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
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeFilter = e.target.dataset.type;
        
        if (selectedNode && selectedNode.data.type !== activeFilter && activeFilter !== 'all') {
            closePanel();
        }
    });
});

// Boot
resize();
loadData();
animate();
