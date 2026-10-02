import { readFileSync, writeFileSync } from 'fs';

const indexPath = './dist/index.html';
let content = readFileSync(indexPath, 'utf8');

// Replace absolute paths with GitHub Pages paths
content = content.replace(/src="\/assets\//g, 'src="/monthly-planner2/assets/');
content = content.replace(/href="\/assets\//g, 'href="/monthly-planner2/assets/');

writeFileSync(indexPath, content);
console.log('✓ Fixed asset paths in dist/index.html');
