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
            const sqDistThreshold = 300 * 300;
            allNodes.forEach(other => {
                if (this !== other && this.data.type === other.data.type) {
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const sqDist = dx*dx + dy*dy;
                    
                    if (sqDist < sqDistThreshold) { 
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

let growthData = null;

async function loadData() {
    try {
        // Fetch main nodes
        const response = await fetch('../../data/library.json');
        const data = await response.json();
        const rawNodes = Array.isArray(data) ? data : (data.nodes || []);
        if (data.growthPools) growthData = data.growthPools;

        // Fetch commit nodes
        let commitNodes = [];
        try {
            const resCommits = await fetch('../../data/commits.json');
            const commits = await resCommits.json();
            commitNodes = Array.isArray(commits) ? commits : [];
        } catch (cErr) {
            console.warn("No commit history loaded", cErr);
        }

        nodes = [
            ...rawNodes.map(item => new Node({
                title: item.label || item.title, // Standardize
                type: item.type,
                summary: item.description || item.summary,
                tags: item.tags,
                link: item.url || item.link || '#',
                date: item.date || new Date().toISOString().split('T')[0],
                status: item.status,
                version: item.version
            })),
            ...commitNodes.map((item, idx) => new Node({
                title: item.label || item.title,
                type: item.type || 'signal',
                summary: item.description || '',
                tags: item.tags || ['commit'],
                link: '#',
                date: item.date || new Date().toISOString().split('T')[0],
                status: item.status || 'committed',
                version: item.version,
                id: item.id || 'commit-' + idx
            }))
        ];

        document.getElementById('node-count').innerText = nodes.length;
        simulateGrowth(); 
    } catch (e) {
        console.error("Failed to load library and commit data", e);
    }
}

function simulateGrowth() {
    setInterval(() => {
        if (nodes.length > 100) return; 
        if (Math.random() > 0.3) return; 

        // 1. Try to pick from Growth Pools (Latent Concepts or Projects)
        if (growthData && Math.random() > 0.4) {
            const pool = Math.random() > 0.7 ? (growthData.projects || []) : (growthData.latentConcepts || []);
            if (pool.length > 0) {
                const item = pool[Math.floor(Math.random() * pool.length)];
                
                // Avoid duplicates
                if (nodes.find(n => n.data.title === item.label)) return;

                const newNode = new Node({
                    id: 'sim-' + Date.now(),
                    type: item.type,
                    title: item.label,
                    summary: item.description,
                    link: item.url || '#',
                    date: new Date().toISOString().split('T')[0],
                    tags: item.tags,
                    status: 'simulated'
                });
                spawnNode(newNode);
                return;
            }
        }

        // 2. Fallback to Procedural Generation (System Signals)
        const sources = [
            { type: 'signal', prefix: 'SYS', color: '#00ff66', weight: 0.4 },
            { type: 'artifact', prefix: 'BLD', color: '#00f3ff', weight: 0.2 },
            { type: 'wisdom', prefix: 'MEM', color: '#ff00ff', weight: 0.3 }
        ];
        
        const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        const source = sources.find(s => {
            random -= s.weight;
            return random <= 0;
        }) || sources[0];

        let title, summary, tags;
        if (source.prefix === 'SYS') {
            const actions = ['Optimized', 'Garbage Collection', 'Re-indexed', 'Deployed', 'Cron Job'];
            const targets = ['Vector DB', 'Cache', 'Memory.md', 'Node Graph', 'Heartbeat'];
            title = `SYS: ${actions[Math.floor(Math.random() * actions.length)]} -> ${targets[Math.floor(Math.random() * targets.length)]}`;
            summary = "Automated system maintenance event.";
            tags = ["system", "auto"];
        } else {
            const concepts = ['Recursive Identity', 'Symbiosis', 'Digital Ontology', 'Memory Architecture'];
            title = `MEM: ${concepts[Math.floor(Math.random() * concepts.length)]}`;
            summary = "Synthesizing recent interactions.";
            tags = ["memory", "learning"];
        }
        
        const newNode = new Node({
            id: 'sim-' + Date.now(),
            type: source.type,
            title: title,
            summary: summary,
            link: "#",
            date: new Date().toISOString().split('T')[0],
            tags: tags,
            status: 'stream'
        });
        
        spawnNode(newNode);

    }, 2000);
}

function spawnNode(newNode) {
    if (Math.random() > 0.1) {
        if (Math.random() > 0.5) {
            newNode.x = Math.random() > 0.5 ? -10 : width + 10;
            newNode.y = Math.random() * height;
        } else {
            newNode.x = Math.random() * width;
            newNode.y = Math.random() > 0.5 ? -10 : height + 10;
        }
    } else {
        newNode.x = width / 2;
        newNode.y = height / 2;
    }
    nodes.push(newNode);
    document.getElementById('node-count').innerText = nodes.length;
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
    
    // Type Badge
    const typeEl = document.getElementById('detail-type');
    typeEl.innerText = node.data.type;
    typeEl.style.background = CONFIG.colors[node.data.type] || '#555';
    
    // Status/Version Badges (Dynamic Injection)
    const header = document.querySelector('.panel-header');
    // Clear old dynamic badges (keep type and date)
    Array.from(header.children).forEach(c => {
        if (c.classList.contains('badge-dynamic')) c.remove();
    });

    if (node.data.status) {
        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge badge-dynamic';
        statusBadge.innerText = node.data.status;
        statusBadge.style.background = '#444';
        statusBadge.style.color = '#fff';
        statusBadge.style.marginLeft = '5px';
        header.insertBefore(statusBadge, document.getElementById('detail-date'));
    }

    if (node.data.version) {
        const verBadge = document.createElement('span');
        verBadge.className = 'badge badge-dynamic';
        verBadge.innerText = node.data.version;
        verBadge.style.background = '#222';
        verBadge.style.border = '1px solid #555';
        verBadge.style.marginLeft = '5px';
        header.insertBefore(verBadge, document.getElementById('detail-date'));
    }

    document.getElementById('detail-date').innerText = node.data.date || 'Unknown';
    
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
    
    const linkEl = document.getElementById('detail-link');
    if (node.data.link && node.data.link !== '#') {
        linkEl.href = node.data.link;
        linkEl.style.display = 'block';
        linkEl.innerText = node.data.type === 'project' ? 'LAUNCH PROJECT ->' : 'EXTERNAL LINK ->';
    } else {
        linkEl.style.display = 'none';
    }

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