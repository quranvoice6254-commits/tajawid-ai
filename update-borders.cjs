const fs = require('fs');

function replaceFile(path, regex, replace) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(regex, replace);
  fs.writeFileSync(path, content, 'utf8');
}

replaceFile('src/components/ProfilePhotoPicker.tsx', /border-white/g, 'border-bg-secondary');
replaceFile('src/components/AuthScreen.tsx', /border-white/g, 'border-bg-secondary');
replaceFile('src/components/RecitationMic.tsx', /border-white/g, 'border-bg-secondary');
replaceFile('src/App.tsx', /peer-checked:after:border-white/g, 'peer-checked:after:border-bg-secondary');
