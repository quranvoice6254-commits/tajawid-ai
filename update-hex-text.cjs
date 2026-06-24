const fs = require('fs');

function replaceFile(path, regex, replace) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(regex, replace);
  fs.writeFileSync(path, content, 'utf8');
}

replaceFile('src/components/RecitationMic.tsx', /text-\[#0a5f3e\]/g, 'text-brand-primary');
