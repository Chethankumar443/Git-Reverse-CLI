import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('landing');
const destDir = path.resolve('dist');

// Ensure destDir exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Read and copy all files from srcDir to destDir
const files = fs.readdirSync(srcDir);
for (const file of files) {
  const srcFile = path.join(srcDir, file);
  const destFile = path.join(destDir, file);
  
  // Only copy files
  if (fs.statSync(srcFile).isFile()) {
    fs.copyFileSync(srcFile, destFile);
  }
}
console.log('Successfully copied landing assets to dist/');
