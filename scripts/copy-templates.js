const fs = require('fs-extra');

fs.copySync('schematics/templates', 'dist/templates');
console.log('Templates copied to dist/templates');
