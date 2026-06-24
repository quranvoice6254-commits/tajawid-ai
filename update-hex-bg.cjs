const fs = require('fs');

function replaceFile(path, regex, replace) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(regex, replace);
  fs.writeFileSync(path, content, 'utf8');
}

replaceFile('src/components/RecitationMic.tsx', /bg-\[#f5fbf7\]/g, 'bg-brand-light');
replaceFile('src/components/RecitationMic.tsx', /bg-\[#fcfbf7\]/g, 'bg-bg-tertiary');

replaceFile('src/components/SmartQuiz.tsx', /bg-\[#f5fbf6\]/g, 'bg-bg-tertiary');
replaceFile('src/components/SmartQuiz.tsx', /bg-\[#f9fdfa\]/g, 'bg-bg-secondary');
replaceFile('src/components/SmartQuiz.tsx', /bg-\[#fafdfb\]/g, 'bg-bg-tertiary');

replaceFile('src/components/MatnExplainer.tsx', /bg-\[#f9fbf9\]/g, 'bg-bg-tertiary');
replaceFile('src/components/MatnExplainer.tsx', /bg-\[#faefe2\]\/40/g, 'bg-brand-light/40');
replaceFile('src/components/MatnExplainer.tsx', /bg-\[#f6faf8\]/g, 'bg-bg-tertiary');
replaceFile('src/components/MatnExplainer.tsx', /bg-\[#fcfbf9\]/g, 'bg-bg-tertiary');
replaceFile('src/components/MatnExplainer.tsx', /bg-\[#edf6f2\]/g, 'bg-brand-light/20');
replaceFile('src/components/MatnExplainer.tsx', /bg-\[#004d3d\]/g, 'bg-brand-primary');

replaceFile('src/components/AuthScreen.tsx', /bg-\[#f3f7f5\]/g, 'bg-bg-primary');
replaceFile('src/components/SmartAssistant.tsx', /bg-\[#fbfcfb\]\/50/g, 'bg-bg-primary/50');

