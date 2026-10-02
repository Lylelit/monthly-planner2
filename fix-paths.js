import { readFileSync, writeFileSync } from 'fs';

const indexPath = './dist/index.html';
let content = readFileSync(indexPath, 'utf8');

// Replace absolute paths with relative paths
content = content.replace(/src="\/assets\//g, 'src="./assets/');
content = content.replace(/href="\/assets\//g, 'href="./assets/');

writeFileSync(indexPath, content);
console.log('✓ Fixed asset paths in dist/index.html');
