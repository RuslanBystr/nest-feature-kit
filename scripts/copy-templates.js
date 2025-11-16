const fs = require('fs-extra');
const path = require('path');

fs.copySync('schematics/templates', 'dist/templates');
console.log('Templates copied to dist/templates');

const schemaSrc = path.join('schematics', 'schema.json');
const schemaDest = path.join('dist', 'schematics', 'schema.json');
fs.ensureDirSync(path.dirname(schemaDest));
fs.copyFileSync(schemaSrc, schemaDest);
console.log('Schema copied to dist/schematics/schema.json');
