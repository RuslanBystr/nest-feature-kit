const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) copyRecursive(srcPath, destPath);
        else fs.copyFileSync(srcPath, destPath);
    }
}

const fromFiles = path.resolve(__dirname, '../src/feature/files');
const toFiles = path.resolve(__dirname, '../dist/feature/files');
const fromSchema = path.resolve(__dirname, '../src/feature/schema.json');
const toSchemaDir = path.resolve(__dirname, '../dist/feature');

copyRecursive(fromFiles, toFiles);
if (!fs.existsSync(toSchemaDir)) fs.mkdirSync(toSchemaDir, { recursive: true });
if (fs.existsSync(fromSchema)) fs.copyFileSync(fromSchema, path.join(toSchemaDir, 'schema.json'));
