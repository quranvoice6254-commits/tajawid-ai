const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
}

const files = walkSync('./src').filter(f => f.endsWith('.tsx'));

const replacements = [
  { regex: /bg-zinc-[0-9]+\/?[0-9]*/g, replacement: 'bg-bg-tertiary' },
  { regex: /text-zinc-[0-9]+/g, replacement: 'text-text-secondary' },
  { regex: /border-zinc-[0-9]+/g, replacement: 'border-border-primary' },
  { regex: /border-gray-300/g, replacement: 'border-border-primary' },
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(({regex, replacement}) => {
    content = content.replace(regex, replacement);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
