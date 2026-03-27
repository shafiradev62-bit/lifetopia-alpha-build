const fs = require('fs');

const filePath = 'c:\\Users\\Lenovo\\Downloads\\Pixel-Farm-Life\\Pixel-Farm-Life\\artifacts\\farming-game\\src\\pages\\FarmingGame.tsx';
let content = fs.readFileSync(filePath, 'utf8');

let lines = content.split(/\r?\n/);
let newLines = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Clean up lines 619-624
    if (i >= 618 && i <= 623) {
       // We'll replace these lines with the correct closings
       if (i === 618) {
           newLines.push('               )}'); // Close activePanel === \'settings\'
           newLines.push('            </div>'); // Close div at 504
           newLines.push('          </div>'); // Close div at 499
           newLines.push('        </div>'); // Close div at 498
           newLines.push('      )}'); // Close {activePanel && ( at 497
           // Skip ahead
           while(i < lines.length && !lines[i].includes('PREMIUM STYLED NOTIFICATIONS')) i++;
           i--; 
           continue;
       }
       continue;
    }
    
    newLines.push(line);
}

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Fixed nesting in FarmingGame.tsx');
