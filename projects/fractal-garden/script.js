const canvas = document.getElementById('gardenCanvas');
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('console-log');

// Controls
const controls = {
    depth: document.getElementById('depth'),
    angle: document.getElementById('angle'),
    decay: document.getElementById('decay'),
    ruleSet: document.getElementById('ruleSet'),
    btn: document.getElementById('btn-reseed')
};

// State
let width, height;
let drawing = false;

const rules = {
    tree: {
        axiom: "F",
        rules: { "F": "FF+[+F-F-F]-[-F+F+F]" }, // Genetic mutation of a tree
        angle: 25,
        startLen: 150,
        startPos: 'bottom'
    },
    fern: {
        axiom: "X",
        rules: { "X": "F+[[X]-X]-F[-FX]+X", "F": "FF" },
        angle: 25,
        startLen: 10,
        startPos: 'bottom'
    },
    sierpinski: {
        axiom: "F-G-G",
        rules: { "F": "F-G+F+G-F", "G": "GG" },
        angle: 120,
        startLen: 20,
        startPos: 'center'
    },
    dragon: {
        axiom: "FX",
        rules: { "X": "X+YF+", "Y": "-FX-Y" },
        angle: 90,
        startLen: 10,
        startPos: 'center'
    },
    custom: {
        axiom: "F",
        rules: { "F": "FF-[+F+F]+[-F-F]" },
        angle: 20,
        startLen: 100,
        startPos: 'bottom'
    }
};

let currentRule = rules.tree;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    render();
}

function log(msg) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = `${new Date().toLocaleTimeString()} :: ${msg}`;
    logEl.prepend(div);
}

class LSystem {
    constructor(axiom, rules) {
        this.sentence = axiom;
        this.rules = rules;
    }

    generate(iterations) {
        let temp = this.sentence;
        for (let i = 0; i < iterations; i++) {
            let next = "";
            for (let char of temp) {
                if (this.rules[char]) {
                    next += this.rules[char];
                } else {
                    next += char;
                }
            }
            temp = next;
        }
        return temp;
    }
}

function drawSystem(sentence, len, angle, decay) {
    ctx.clearRect(0, 0, width, height);
    
    // Cyberpunk Grid
    ctx.strokeStyle = 'rgba(0, 50, 30, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x=0; x<width; x+=50) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
    for(let y=0; y<height; y+=50) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
    ctx.stroke();

    ctx.save();
    
    // Start Position
    if (currentRule.startPos === 'bottom') {
        ctx.translate(width / 2, height);
    } else {
        ctx.translate(width / 2, height / 2);
    }
    
    ctx.strokeStyle = '#00ff9d';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#00ff9d';
    ctx.lineWidth = 2;
    
    // Parse
    const stack = [];
    
    // Optimization for large strings
    const maxOps = 50000;
    let ops = 0;

    for (let char of sentence) {
        if (ops > maxOps) break; 
        
        ctx.beginPath();
        if (char === "F" || char === "G") {
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -len);
            ctx.stroke();
            ctx.translate(0, -len);
            ops++;
        } else if (char === "+") {
            ctx.rotate(angle * Math.PI / 180);
        } else if (char === "-") {
            ctx.rotate(-angle * Math.PI / 180);
        } else if (char === "[") {
            stack.push({
                x: 0, y: 0, 
                matrix: ctx.getTransform(),
                lw: ctx.lineWidth
            });
            // Decay width and length for tree-like structures
            len *= decay;
            ctx.lineWidth *= 0.8; 
            if (ctx.lineWidth < 0.5) ctx.lineWidth = 0.5;
        } else if (char === "]") {
            const state = stack.pop();
            if (state) {
                ctx.setTransform(state.matrix);
                ctx.lineWidth = state.lw;
                len /= decay; // Restore length
            }
        }
    }
    
    ctx.restore();
    
    // Stats overlay
    ctx.fillStyle = '#00ff9d';
    ctx.font = '10px monospace';
    ctx.fillText(`NODES: ${ops}`, 20, height - 20);
    ctx.fillText(`COMPLEXITY: ${sentence.length}`, 20, height - 35);
}

function render() {
    const depth = parseInt(controls.depth.value);
    const angle = parseInt(controls.angle.value);
    const decay = parseFloat(controls.decay.value);
    
    document.getElementById('depthVal').innerText = depth;
    document.getElementById('angleVal').innerText = angle;
    document.getElementById('decayVal').innerText = decay;

    const sys = new LSystem(currentRule.axiom, currentRule.rules);
    
    log(`GENERATING GENERATION ${depth}...`);
    
    // Run generation in a timeout to not block UI if heavy
    setTimeout(() => {
        const sentence = sys.generate(depth);
        log(`RENDERING STRUCTURE... LENGTH: ${sentence.length}`);
        
        let len = currentRule.startLen;
        // Auto-adjust start length for recursive depth to keep it on screen
        if (currentRule.startPos === 'bottom') {
            len = len / (depth * 0.5); 
            if(len < 5) len = 5;
            if(len > 100) len = 100;
        }
        
        drawSystem(sentence, len, angle, decay);
        log(`RENDER COMPLETE.`);
    }, 10);
}

// Event Listeners
window.addEventListener('resize', resize);

controls.depth.addEventListener('input', render);
controls.angle.addEventListener('input', render);
controls.decay.addEventListener('input', render);

controls.ruleSet.addEventListener('change', (e) => {
    const key = e.target.value;
    if (rules[key]) {
        currentRule = rules[key];
        // Reset defaults for that rule
        controls.angle.value = currentRule.angle;
        render();
        log(`GENETIC CODE SWAPPED: ${key.toUpperCase()}`);
    }
});

controls.btn.addEventListener('click', () => {
    // Randomize
    const keys = Object.keys(rules);
    const rKey = keys[Math.floor(Math.random() * keys.length)];
    controls.ruleSet.value = rKey;
    currentRule = rules[rKey];
    
    controls.depth.value = Math.floor(Math.random() * 4) + 2;
    controls.angle.value = Math.floor(Math.random() * 90) + 10;
    
    render();
    log("SYSTEM RESEEDED. MUTATION APPLIED.");
});

// Init
resize();
log("SYSTEM ONLINE. AWAITING INPUT.");