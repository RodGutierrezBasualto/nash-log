const canvas = document.getElementById('libraryCanvas');
const ctx = canvas.getContext('2d');

// Config
const CONFIG = {
    nodeSize: 4,
    connectionDist: 150,
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
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction
        if (mouse.x) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 30) {
                this.hovered = true;
                this.size = CONFIG.nodeSize * 2;
            } else {
                this.hovered = false;
                this.size = CONFIG.nodeSize;
            }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Glow
        if (this.hovered || this === selectedNode) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
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
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < CONFIG.connectionDist) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(100, 100, 100, ${1 - dist/CONFIG.connectionDist})`;
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
    
    nodes.forEach(node => node.update());
    drawConnections();
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
    // Simple click detection
    const clicked = nodes.find(n => n.hovered);
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
    type.style.background = node.color; // Match badge to node color
    summary.innerText = node.data.summary;
    link.href = node.data.link;

    panel.classList.remove('hidden');
}

function closePanel() {
    selectedNode = null;
    document.getElementById('details-panel').classList.add('hidden');
}

document.getElementById('close-panel').addEventListener('click', closePanel);

// Boot
resize();
loadData();
animate();