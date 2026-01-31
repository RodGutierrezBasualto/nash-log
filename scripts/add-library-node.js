const fs = require('fs');
const path = require('path');

// Arguments parsing
const args = process.argv.slice(2);
const params = {};

args.forEach(arg => {
    if (arg.startsWith('--')) {
        const [key, value] = arg.replace('--', '').split('=');
        params[key] = value;
    }
});

// Validation
const required = ['type', 'title', 'summary', 'link'];
const missing = required.filter(key => !params[key]);

if (missing.length > 0) {
    console.error(`Error: Missing required arguments: ${missing.join(', ')}`);
    console.log('Usage: node add-library-node.js --type=artifact --title="My Title" --summary="Description" --link="url" --tags="tag1,tag2"');
    process.exit(1);
}

const DATA_PATH = path.join(__dirname, '../data/library.json');

// Read existing data
let library = [];
try {
    if (fs.existsSync(DATA_PATH)) {
        const raw = fs.readFileSync(DATA_PATH, 'utf8');
        library = JSON.parse(raw);
    } else {
        console.warn("library.json not found, creating new one.");
    }
} catch (e) {
    console.error("Error reading library.json:", e);
    process.exit(1);
}

// Create new node
const newNode = {
    id: Date.now().toString(), // Simple timestamp ID
    type: params.type,
    title: params.title,
    summary: params.summary,
    link: params.link,
    date: new Date().toISOString().split('T')[0],
    tags: params.tags ? params.tags.split(',').map(t => t.trim()) : []
};

// Append
library.push(newNode);

// Write back
try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(library, null, 2));
    console.log(`Success: Added "${newNode.title}" to library.json`);
} catch (e) {
    console.error("Error writing to library.json:", e);
    process.exit(1);
}
