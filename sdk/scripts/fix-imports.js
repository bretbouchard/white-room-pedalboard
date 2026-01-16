const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Regex to match relative imports without extensions
  const importRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g;

  let updated = false;
  const newContent = content.replace(importRegex, (match, importPath) => {
    if (!importPath.endsWith('.js') && !importPath.endsWith('.ts')) {
      updated = true;
      return `from '${importPath}.js'`;
    }
    return match;
  });

  if (updated) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed imports in: ${filePath}`);
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

// Start processing from the current directory
processDirectory(process.cwd());
