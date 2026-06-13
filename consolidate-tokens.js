#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mapping of old classes to new semantic tokens
// Order matters — more specific patterns first
const mappings = [
  // Backgrounds
  [/\bbg-white\b/g, 'bg-background'],
  [/\bbg-gray-50\b/g, 'bg-muted/50'],
  [/\bbg-gray-100\b/g, 'bg-muted'],
  [/\bbg-gray-200\b/g, 'bg-muted'],
  [/\bbg-gray-300\b/g, 'bg-muted'],
  [/\bbg-gray-400\b/g, 'bg-muted'],
  [/\bbg-gray-700\b/g, 'bg-foreground/20'],
  [/\bbg-gray-800\b/g, 'bg-foreground/10'],
  [/\bbg-gray-900\b/g, 'bg-foreground'],

  // Text
  [/\btext-gray-900\b/g, 'text-foreground'],
  [/\btext-gray-800\b/g, 'text-foreground'],
  [/\btext-gray-700\b/g, 'text-foreground/80'],
  [/\btext-gray-600\b/g, 'text-muted-foreground'],
  [/\btext-gray-500\b/g, 'text-muted-foreground'],
  [/\btext-gray-400\b/g, 'text-muted-foreground/70'],
  [/\btext-gray-300\b/g, 'text-muted-foreground/50'],
  [/\btext-gray-200\b/g, 'text-muted-foreground/30'],

  // Borders
  [/\bborder-gray-100\b/g, 'border-border/50'],
  [/\bborder-gray-200\b/g, 'border-border'],
  [/\bborder-gray-300\b/g, 'border-border'],
  [/\bborder-gray-400\b/g, 'border-border/80'],
  [/\bborder-gray-600\b/g, 'border-foreground/20'],
  [/\bborder-gray-700\b/g, 'border-foreground/30'],
];

// Files to process
const result = execSync(
  `grep -rln "#[0-9a-fA-F]\\{3,6\\}\\|bg-white\\|bg-gray\\|text-gray\\|border-gray" components/ app/ --include="*.tsx"`,
  { cwd: path.join(__dirname, '..', 'threadcub-app-mvp'), encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

// Actually, just process files passed via stdin or hardcoded paths
const targetDirs = ['components', 'app'];

function getAllTsxFiles(dir, baseDir) {
  const results = [];
  const fullDir = path.join(baseDir, dir);
  if (!fs.existsSync(fullDir)) return results;
  
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsxFiles(path.join(dir, entry.name), baseDir));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const baseDir = process.cwd();
let totalFiles = 0;
let totalReplacements = 0;
const log = [];

for (const dir of targetDirs) {
  const files = getAllTsxFiles(dir, baseDir);
  
  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    let fileReplacements = 0;
    
    for (const [pattern, replacement] of mappings) {
      const before = content;
      content = content.replace(pattern, replacement);
      const count = (before.match(pattern) || []).length;
      fileReplacements += count;
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFiles++;
      totalReplacements += fileReplacements;
      log.push(`✓ ${filePath.replace(baseDir + '/', '')} — ${fileReplacements} replacements`);
    }
  }
}

console.log('\n=== Token Consolidation Complete ===\n');
log.forEach(l => console.log(l));
console.log(`\nTotal: ${totalReplacements} replacements across ${totalFiles} files`);
