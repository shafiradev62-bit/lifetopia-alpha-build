import fs from 'fs';
import path from 'path';

const filePath = 'c:\\Users\\Lenovo\\Downloads\\Pixel-Farm-Life\\Pixel-Farm-Life\\artifacts\\farming-game\\src\\pages\\FarmingGame.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix redundant )}
content = content.replace(/\s+\)\}\r?\n\s+\)\}/g, '\n               )}');

// Fix Quests map and double )}
content = content.replace(/\{ds\.quests\.map\(q => \(\r?\n\s+<div key=\{q\.id\}[^>]*>\r?\n\s+\{q\.completed \? '✅' : '⏳'\} \{q\.title\} \(\{q\.current\}\/\{q\.target\}\)\r?\n\s+\)\)\}\r?\n\s+<\/div>\r?\n\s+\)\)\}\r?\n\s+<\/div>\r?\n\s+\)\}/g, (match) => {
    return `{ds.quests.map(q => (
                     <div key={q.id} style={{ borderBottom:'1px solid #8B5E3C', padding:'6px 0', fontSize:6 }}>
                       {q.completed ? '✅' : '⏳'} {q.title} ({q.current}/{q.target})
                     </div>
                   ))}
                 </div>
               )}`;
});

// Since the above might fail if spacing is tricky, let's use a simpler line-based approach for the obvious errors.
let lines = content.split(/\r?\n/);
let newLines = [];
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Line 558 redundant )}
    if (i === 557 && line.trim() === ')}' && lines[i-1].trim() === ')}') {
        continue; 
    }
    
    // Fix Quests section (561-569)
    if (i === 563 && line.trim() === '))}') {
        newLines.push('                      </div>');
        newLines.push('                    ))}');
        i += 2; // skip the next two lines which were incorrectly closed
        continue;
    }
    
    // Fix NFT section (595)
    if (i === 594 && line.trim() === '))}') {
        continue;
    }
    
    // General redundant )} followed by another )}
    if (line.trim() === ')}' && i < lines.length - 1 && lines[i+1].trim() === ')}') {
        // Skip this one if it's one of the known problematic spots
        if ([557, 568, 600, 616, 624].includes(i)) continue;
    }

    newLines.push(line);
}

// Actually, let's just do a very targeted string replacement for the exact broken blocks found in view_file.
content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/(\s+)\)\}\r?\n\s+\)\}\r?\n\s+\{activePanel === 'quests'/g, '$1)}\n               {activePanel === \'quests\'');
content = content.replace(/\{q\.completed \? '✅' : '⏳'\} \{q\.title\} \(\{q\.current\}\/\{q\.target\}\)\r?\n\s+\)\)\}\r?\n\s+<\/div>\r?\n\s+\)\)\}/g, "{q.completed ? '✅' : '⏳'} {q.title} ({q.current}/{q.target})\n                      </div>\n                    ))}");
content = content.replace(/\r?\n\s+\)\}\r?\n\s+\{activePanel === 'inventory'/g, '\n               {activePanel === \'inventory\'');
content = content.replace(/\{nfts\.map\(\(n, i\) => \(\r?\n\s+<div key=\{i\}[^>]*>\{n\}<\/div>\r?\n\s+\)\)\}\r?\n\s+\)\)\}/g, "{nfts.map((n, i) => (\n                          <div key={i} style={{ background:'#D4AF37', color:'#FFF', padding:6, borderRadius:4, fontSize:6 }}>{n}</div>\n                        ))}");
content = content.replace(/CLAIM ALPHA NFT<\/button>\r?\n\s+<\/div>\r?\n\s+\)\}\r?\n\s+\)\}/g, "CLAIM ALPHA NFT</button>\n                 </div>\n               )}");
content = content.replace(/Array\.from\(\{ length: Math\.max\(0, 4 - SHOP_ITEMS\.length\) \}\)\.map\(\(_, i\) => \(\r?\n\s+<div key=\{i\} className="slot" style=\{\{ width: '100%', height: 100, opacity: 0\.1 \}\} \/>\r?\n\s+\)\)\}\r?\n\s+<\/div>\r?\n\s+\)\}\r?\n\s+\)\}/g, "Array.from({ length: Math.max(0, 4 - SHOP_ITEMS.length) }).map((_, i) => (\n                      <div key={i} className=\"slot\" style={{ width: '100%', height: 100, opacity: 0.1 }} />\n                    ))\n                 }\n                 </div>\n               )}");
content = content.replace(/V\.0\.9\.5<\/div>\r?\n\s+<\/div>\r?\n\s+\)\}\r?\n\s+\)\}/g, "V.0.9.5</div>\n                 </div>\n               )}");

fs.writeFileSync(filePath, content);
console.log('Fixed syntax errors in FarmingGame.tsx');
