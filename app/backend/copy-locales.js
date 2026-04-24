const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src', 'i18n', 'locales');
const dest = path.join(__dirname, 'dist', 'i18n', 'locales');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

copyRecursiveSync(src, dest);
