import * as fs from 'fs';

const filepath = 'src/pages/FarmingGame.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// Fix 1: Swap line 610 and 611 - close div first, then close map
content = content.replace(
  /(<button className="wb gf" style=\{\{ width:'100%', fontSize:6, padding:'8px 0' \}\} onClick=\{\(\) => buyItem\(item\.id, item\.price\)\}>BUY \(1\)<\/button>\r?\n)\s*\)\}\}\r?\n\s*<\/div>/g,
  '$1                     </div>\n                   ))}'
);

// Fix 2: Remove extra standalone ) line
content = content.replace(/\n\s*\)\s*\n\s*\{activePanel === 'settings'/, '\n               )}\n               {activePanel === \'settings\'');

fs.writeFileSync(filepath, content);
console.log('Syntax fixed!');
