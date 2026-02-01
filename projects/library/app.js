const canvas = document.getElementById('libraryCanvas');
const ctx = canvas.getContext('2d');

// Config
const CONFIG = {
    nodeSize: 4,
    connectionDist: 150,
    attractionForce: 0.0005,
    colors: {
        artifact: '#00f3ff',
        wisdom: '#ff00ff',
        paper: '#ffe100',
        signal: '#00ff66'
    }
};

let nodes = [];
let width, height;
let mouse = { x: null, y: null };
let selectedNode = null;
let activeFilter = 'all';
let searchTerm = '';

// Node Class
class Node {
    constructor(data) {
        this.data = data;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        
        this.currentRadius = 0;
        this.targetRadius = CONFIG.nodeSize;
        
        this.currentOpacity = 0;
        this.targetOpacity = 1;
        
        this.color = CONFIG.colors[data.type] || '#fff';
        this.hovered = false;
    }

    update(allNodes) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Cluster Attraction
        if (activeFilter === 'all' && searchTerm === '') {
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
            if (dist < 30) this.hovered = true;
        }
        
        // Filter & Search Logic
        let visible = true;
        
        if (activeFilter !== 'all' && this.data.type !== activeFilter) visible = false;
        
        if (searchTerm !== '') {
            const text = (this.data.title + ' ' + this.data.summary + ' ' + (this.data.tags||[]).join(' ')).toLowerCase();
            if (!text.includes(searchTerm)) visible = false;
        }

        if (!visible) {
            this.targetOpacity = 0.1;
            this.targetRadius = CONFIG.nodeSize * 0.5;
        } else {
            this.targetOpacity = 1;
            if (this.hovered || this === selectedNode) {
                this.targetRadius = CONFIG.nodeSize * 3.5;
            } else {
                this.targetRadius = CONFIG.nodeSize;
            }
        }

        this.currentRadius += (this.targetRadius - this.currentRadius) * 0.1;
        this.currentOpacity += (this.targetOpacity - this.currentOpacity) * 0.05;
    }

    draw() {
        if (this.currentOpacity < 0.01) return;

        ctx.globalAlpha = this.currentOpacity;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        
        if (this.currentOpacity > 0.5 && (this.hovered || this === selectedNode)) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0;

        if (this.currentOpacity > 0.5 && (this.hovered || this === selectedNode)) {
            ctx.fillStyle = '#fff';
            ctx.font = '11px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText(this.data.title, this.x, this.y - (this.currentRadius + 10));
        }
        
        ctx.globalAlpha = 1;
    }
}

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
        simulateGrowth(); // Start simulation
    } catch (e) {
        console.error("Failed to load library data", e);
    }
}

function simulateGrowth() {
    setInterval(() => {
        if (nodes.length > 80) return; // Increased limit
        if (Math.random() > 0.4) return; // Slightly more frequent

        const sources = [
            { type: 'signal', prefix: 'SYS', color: '#00ff66' },
            { type: 'artifact', prefix: 'BLD', color: '#00f3ff' },
            { type: 'wisdom', prefix: 'LOG', color: '#ff00ff' }
        ];
        const source = sources[Math.floor(Math.random() * sources.length)];
        const id = 'sim-' + Date.now();
        
        const concepts = ['Evolution', 'Entropy', 'Recursion', 'Synthesis', 'Pattern', 'Void', 'Nexus', 'Glitch'];
        const actions = ['Detected', 'Optimized', 'Purged', 'Compiled', 'Refactored', 'Observed', 'Indexed'];
        
        const title = `${source.prefix}: ${actions[Math.floor(Math.random() * actions.length)]} ${concepts[Math.floor(Math.random() * concepts.length)]}`;
        
        const newNode = new Node({
            id: id,
            type: source.type,
            title: title,
            summary: `Automated system event. Source: ${source.prefix}-Stream. Timestamp: ${new Date().toISOString()}`,
            link: "#",
            date: new Date().toISOString().split('T')[0],
            tags: ["auto", "simulation", source.prefix.toLowerCase()]
        });
        
        // Spawn strategy: mostly from edges, sometimes from center (glitch)
        if (Math.random() > 0.1) {
            if (Math.random() > 0.5) {
                newNode.x = Math.random() > 0.5 ? 0 : width;
                newNode.y = Math.random() * height;
            } else {
                newNode.x = Math.random() * width;
                newNode.y = Math.random() > 0.5 ? 0 : height;
            }
        } else {
            newNode.x = width / 2;
            newNode.y = height / 2;
        }
        
        nodes.push(newNode);
        document.getElementById('node-count').innerText = nodes.length;
    }, 1500);
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
    nodes.forEach(node => node.update(nodes));
    drawConnections();
    nodes.forEach(node => node.draw());
    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener('click', (e) => {
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
    
    document.getElementById('detail-title').innerText = node.data.title;
    
    const typeEl = document.getElementById('detail-type');
    typeEl.innerText = node.data.type;
    typeEl.style.background = CONFIG.colors[node.data.type];
    
    document.getElementById('detail-date').innerText = node.data.date || 'Unknown Date';
    
    const tagsContainer = document.getElementById('detail-tags');
    tagsContainer.innerHTML = '';
    if (node.data.tags) {
        node.data.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.innerText = tag;
            tagsContainer.appendChild(span);
        });
    }

    document.getElementById('detail-summary').innerText = node.data.summary;
    document.getElementById('detail-link').href = node.data.link;

    // Related Nodes (Visual Proximity)
    const relatedContainer = document.getElementById('detail-related-container');
    const relatedList = document.getElementById('detail-related');
    relatedList.innerHTML = '';
    
    // Find connected nodes
    const connected = nodes
        .filter(n => n !== node && n.currentOpacity > 0.3)
        .map(n => {
            const dx = n.x - node.x;
            const dy = n.y - node.y;
            return { node: n, dist: Math.sqrt(dx*dx + dy*dy) };
        })
        .filter(item => item.dist < CONFIG.connectionDist)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3);

    if (connected.length > 0) {
        relatedContainer.classList.remove('hidden');
        connected.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="color:${item.node.color}">●</span> ${item.node.data.title}`;
            li.style.cursor = 'pointer';
            li.onclick = () => selectNode(item.node); // Recursion!
            relatedList.appendChild(li);
        });
    } else {
        relatedContainer.classList.add('hidden');
    }

    panel.classList.remove('hidden');
}

function closePanel() {
    selectedNode = null;
    document.getElementById('details-panel').classList.add('hidden');
}

document.getElementById('close-panel').addEventListener('click', closePanel);

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

document.getElementById('search-input').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    if (selectedNode) {
        const text = (selectedNode.data.title + ' ' + selectedNode.data.summary).toLowerCase();
        if (!text.includes(searchTerm) && searchTerm !== '') {
            closePanel();
        }
    }
});

resize();
loadData();
animate();