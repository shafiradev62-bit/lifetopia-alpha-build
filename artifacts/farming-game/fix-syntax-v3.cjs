const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\Lenovo\\Downloads\\Pixel-Farm-Life\\Pixel-Farm-Life\\artifacts\\farming-game\\src\\pages\\FarmingGame.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// A very simple line-by-line cleaner for the known redundants
let lines = content.split(/\r?\n/);
let outputLines = [];
let skipRegex = /^\s+\)\}\s*$/;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Fix Quests section specifically
    if (line.includes("{q.completed ? '✅' : '⏳'} {q.title} ({q.current}/{q.target})")) {
        outputLines.push(line);
        outputLines.push('                      </div>');
        outputLines.push('                    ))}');
        outputLines.push('                  </div>');
        outputLines.push('               )}');
        // Now skip until we find next section
        while(i < lines.length && !lines[i].includes("activePanel === 'inventory'")) i++;
        i--; // backtrack to allow loop to see inventory line
        continue;
    }

    // Fix NFT section
    if (line.includes('<div key={i} style={{ background:\'#D4AF37\'')) {
        outputLines.push(line);
        outputLines.push('                        ))}');
        outputLines.push('                      </div>');
        outputLines.push('                     ) : <div style={{ fontSize:8, color: \'#5C4033\' }}>NO NFTS DETECTED</div>}');
        outputLines.push('                    <button className="wb gf" onClick={claimNFT} style={{ marginTop:12, width:\'100%\', fontSize:8 }}>CLAIM ALPHA NFT</button>');
        outputLines.push('                  </div>');
        outputLines.push('               )}');
        // Skip until shop
        while(i < lines.length && !lines[i].includes("activePanel === 'shop'")) i++;
        i--;
        continue;
    }
    
    // Fix Shop section
    if (line.includes('<div key={i} className="slot" style={{ width: \'100%\', height: 100, opacity: 0.1 }} />')) {
        outputLines.push(line);
        outputLines.push('                    ))}');
        outputLines.push('                  </div>');
        outputLines.push('               )}');
        // Skip until settings
        while(i < lines.length && !lines[i].includes("activePanel === 'settings'")) i++;
        i--;
        continue;
    }

    // Fix Settings section
    if (line.includes('V.0.9.5</div>')) {
        outputLines.push(line);
        outputLines.push('                  </div>');
        outputLines.push('               )}');
        // Skip until we find the end of the panel overlay div
        while(i < lines.length && !lines[i].trim().startsWith('</div>')) {
            if (lines[i].trim() === '</div>') break;
            i++;
        }
        i--;
        continue;
    }

    // General skip for redundant )}
    if (skipRegex.test(line) && i > 0 && skipRegex.test(lines[i-1])) {
        // Just skip it
        continue;
    }
    
    outputLines.push(line);
}

fs.writeFileSync(filePath, outputLines.join('\n'));
console.log('FarmingGame.tsx cleaned!');
