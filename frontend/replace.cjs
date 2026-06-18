const fs = require('fs');
const file = 'c:/Users/Anas/Downloads/grid-tms-light-calendar/grid-tms/src/context/DataContext.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/`[a-z]+-\$\{Math\.random\(\)\.toString\(36\)\.substr\(2, 9\)\}`/g, 'crypto.randomUUID()');
fs.writeFileSync(file, content);
console.log('Done!');
