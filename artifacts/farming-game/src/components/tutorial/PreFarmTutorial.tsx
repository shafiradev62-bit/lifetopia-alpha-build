import { useEffect, useRef, useState } from "react";
import { MapType } from "../../game/Game";

type PointerDir = "down" | "right" | "left" | "up";
type DetailMeta = {
  toolSlot: number;
  navBtn?: "wallet" | "tasks" | "items" | "nfts" | "settings";
  targetPct?: { x: number; y: number };
  dir?: PointerDir;
};
type StoryStep = {
  id: string; title: string; map: MapType;
  bubble: string; details: string[]; detailMeta: DetailMeta[];
  portrait: string;
  compact?: boolean;
  showcase?: "shop" | "fishing" | "garden" | "suburban";
};
interface PreFarmTutorialProps {
  visible: boolean; onFinished: () => void; onMapFocus?: (map: MapType) => void;
}

const MAP_BG: Record<MapType, string> = {
  home: "/home_1774349990715.jpg",
  city: "/map_city_new.png",
  fishing: "/map_fishing_new.png",
  garden: "/map_garden_new.png",
  suburban: "/map_suburban_1774358176142.png",
};

const TOOLS = [
  { src: "/celurit_1774349990712.png", label: "HOE" },
  { src: "/kapak_1_1774349990715.png", label: "AXE" },
  { src: "/kapak_1774349990716.png", label: "MEGA AXE" },
  { src: "/teko_siram.png", label: "WATER" },
  { src: "/wheat.png", label: "WHEAT" },
  { src: "/tomato.png", label: "TOMATO" },
  { src: "/carrot.png", label: "CARROT" },
  { src: "/pumpkin.png", label: "PUMPKIN" },
];
const TY = 93, SX = [31,36,41,46,52,57,62,68], MY = 93, MX = [4,9,15,20,25], NY = 4;
const NX: Record<string,number> = { wallet:72, tasks:79, items:85, nfts:90, settings:96 };

const STEPS: StoryStep[] = [
  { id:"welcome", title:"WELCOME TO LIFETOPIA WORLD", map:"home", portrait:"/player_wave.png",
    bubble:"Welcome, Farmer! This is LIFETOPIA WORLD — a cozy farming life simulation on Solana. Your journey starts here on your very own farm.",
    details:["You are a farmer in Lifetopia World. Your goal: grow crops, earn GOLD, and build your legacy on the blockchain.","This is a PUBLIC ALPHA — your feedback shapes the future of this world. Every action you take is part of the experiment.","You can connect your Solana or EVM wallet to save progress, claim NFT boosts, and earn LFG tokens on-chain.","Let's begin your orientation. Follow the guide carefully — each step unlocks the next part of your farm life."],
    detailMeta:[{toolSlot:-1},{toolSlot:-1},{toolSlot:98,navBtn:"wallet",targetPct:{x:NX.wallet,y:NY},dir:"down"},{toolSlot:-1}] },
  { id:"farm", title:"YOUR FARM — THE CORE LOOP", map:"home", portrait:"/farm_till.png",
    bubble:"This is your FARM. The core gameplay loop happens right here. Every crop you grow earns you GOLD and EXP to level up.",
    details:["STEP 1 — Select the HOE (slot 1) from the toolbar below. It's the celurit icon on the far left.","STEP 2 — Click any dark soil plot in the grid to TILL the ground. Prepare soil before planting.","STEP 3 — After tilling, select a SEED (slots 5–8) from the toolbar. Wheat is the fastest crop.","STEP 4 — Click the tilled plot to PLANT your seed. Soil must be tilled first.","STEP 5 — Select the WATERING CAN (slot 4) and click the planted plot. Crops WILL NOT GROW without water!","STEP 6 — Wait for the crop to grow. You can see the progress % above each plot.","STEP 7 — When the crop shows 100% and sways, select the HOE again and click to HARVEST for GOLD!","BONUS — Use FERTILIZER to cut grow time in half. Fertilized plots glow green."],
    detailMeta:[{toolSlot:0,targetPct:{x:SX[0],y:TY},dir:"down"},{toolSlot:0,targetPct:{x:22,y:48},dir:"right"},{toolSlot:4,targetPct:{x:SX[4],y:TY},dir:"down"},{toolSlot:4,targetPct:{x:22,y:48},dir:"right"},{toolSlot:3,targetPct:{x:SX[3],y:TY},dir:"down"},{toolSlot:-1,targetPct:{x:22,y:48},dir:"right"},{toolSlot:0,targetPct:{x:SX[0],y:TY},dir:"down"},{toolSlot:-1,targetPct:{x:22,y:48},dir:"right"}] },
  { id:"crops", title:"CROP TYPES & REWARDS", map:"home", portrait:"/farm_harvest.png",
    bubble:"Each crop has different grow times and GOLD rewards. Choose wisely based on how long you plan to play.",
    details:["WHEAT (slot 5) — Fastest crop. Grows in ~2 min. Earns 5 GOLD. Great for beginners.","TOMATO (slot 6) — Medium speed. Grows in ~4 min. Earns 10 GOLD. Good balance.","CARROT (slot 7) — Slower growth. Grows in ~6 min. Earns 15 GOLD. Worth the wait.","PUMPKIN (slot 8) — Slowest crop. Grows in ~8 min. Earns 25 GOLD. Maximum reward.","RARE CROPS — Sometimes a crop spawns RARE (golden glow). Rare crops give 3x GOLD!","FERTILIZER BOOST — Fertilized crops grow in HALF the normal time. Stack with rare crops!"],
    detailMeta:[{toolSlot:4,targetPct:{x:SX[4],y:TY},dir:"down"},{toolSlot:5,targetPct:{x:SX[5],y:TY},dir:"down"},{toolSlot:6,targetPct:{x:SX[6],y:TY},dir:"down"},{toolSlot:7,targetPct:{x:SX[7],y:TY},dir:"down"},{toolSlot:-1,targetPct:{x:22,y:48},dir:"right"},{toolSlot:-1,targetPct:{x:22,y:48},dir:"right"}] },
  { id:"tools", title:"TOOLS & HOW TO USE THEM", map:"home", portrait:"/farm_weed.png",
    bubble:"Your toolbar holds all the tools you need. Each tool has a specific purpose. Right tool, right time.",
    details:["HOE [1] — Tills untilled soil AND harvests ready crops. Your most-used tool.","AXE [2] — Chops trees and rocks. Each chop earns 15 GOLD and EXP.","MEGA AXE [3] — Deals 2x damage to trees. Clears obstacles twice as fast.","WATERING CAN [4] — Waters tilled plots. Crops CANNOT grow without water.","WHEAT [5] TOMATO [6] CARROT [7] PUMPKIN [8] — Seed tools for planting crops.","KEYBOARD — Press 1–8 to select tools instantly. SHIFT to run. SPACE to jump!"],
    detailMeta:[{toolSlot:0,targetPct:{x:SX[0],y:TY},dir:"down"},{toolSlot:1,targetPct:{x:SX[1],y:TY},dir:"down"},{toolSlot:2,targetPct:{x:SX[2],y:TY},dir:"down"},{toolSlot:3,targetPct:{x:SX[3],y:TY},dir:"down"},{toolSlot:4,targetPct:{x:SX[4],y:TY},dir:"down"},{toolSlot:-1}] },
  { id:"city", title:"CITY SHOP", map:"city", portrait:"/player_wave.png", compact:true, showcase:"shop",
    bubble:"The CITY is your marketplace. Buy seeds and supplies here using your earned GOLD.",
    details:["Walk near a SHOP STALL and press [E] to open the market. Buy seeds to restock your farm.","The shop sells WHEAT, TOMATO, CARROT, PUMPKIN seeds — and FERTILIZER for faster growth.","Earn GOLD on the farm first, then reinvest here. This is the core economic loop."],
    detailMeta:[{toolSlot:-1},{toolSlot:-1},{toolSlot:-1}] },
  { id:"fishing", title:"FISHING SPOT", map:"fishing", portrait:"/player_idle.png", compact:true, showcase:"fishing",
    bubble:"FISHING earns extra GOLD while your crops grow. Cast your line and wait for a bite!",
    details:["Walk to the water's edge and click (or press E) to CAST your fishing line.","When the bobber flashes red and '!! PRESS E !!' appears — reel it in fast!","COMMON FISH = 8G · RARE FISH = 15G · EXOTIC FISH = 25G. Fish while crops grow!"],
    detailMeta:[{toolSlot:-1},{toolSlot:-1},{toolSlot:-1}] },
  { id:"garden", title:"SOCIAL GARDEN", map:"garden", portrait:"/player_wave.png", compact:true, showcase:"garden",
    bubble:"The GARDEN is the social hub. Meet other players, chill, and share your farming progress.",
    details:["NPC friends wander the garden paths. In the full game, these will be real players.","This is a SAFE ZONE — no farming mechanics. Just explore and enjoy the cozy atmosphere.","Future updates: CHAT, trade items, and show off your farm stats with other players."],
    detailMeta:[{toolSlot:-1},{toolSlot:-1},{toolSlot:-1}] },
  { id:"suburban", title:"SUBURBAN AREA", map:"suburban", portrait:"/player_idle.png", compact:true, showcase:"suburban",
    bubble:"The SUBURBAN area is a cozy residential zone. Explore the houses and enjoy the neighborhood.",
    details:["Walk around the suburban streets and explore the cozy houses and gardens.","This area will expand in future updates with more interactive buildings and NPCs.","Take a break from farming and enjoy the peaceful suburban atmosphere."],
    detailMeta:[{toolSlot:-1},{toolSlot:-1},{toolSlot:-1}] },
  { id:"quests", title:"DAILY QUESTS", map:"home", portrait:"/player_happy.png",
    bubble:"Complete DAILY QUESTS to earn bonus GOLD and unlock NFT eligibility.",
    details:["Open the TASKS panel (top-right) to see your active quests and progress.","QUEST 1 — Harvest 5 Crops: Use HOE on 5 ready crops. Reward: 30 GOLD.","QUEST 2 — Plant 10 Seeds: Plant any 10 seeds in tilled soil. Reward: 20 GOLD.","QUEST 3 — Earn 150 GOLD: Accumulate 150 GOLD from farming and fishing. Reward: 50 GOLD.","QUEST 4 — Chop 5 Trees: Use AXE on 5 trees or rocks. Reward: 25 GOLD.","QUEST 5 — Catch 3 Fish: Reel in 3 fish at the fishing spot. Reward: 35 GOLD.","Completing quests increases eligibility to CLAIM ALPHA NFTs — exclusive to early testers!"],
    detailMeta:[{toolSlot:98,navBtn:"tasks",targetPct:{x:NX.tasks,y:NY},dir:"down"},{toolSlot:0,targetPct:{x:NX.tasks,y:NY},dir:"down"},{toolSlot:4,targetPct:{x:NX.tasks,y:NY},dir:"down"},{toolSlot:-1,targetPct:{x:NX.tasks,y:NY},dir:"down"},{toolSlot:1,targetPct:{x:NX.tasks,y:NY},dir:"down"},{toolSlot:-1,targetPct:{x:NX.tasks,y:NY},dir:"down"},{toolSlot:-1}] },
  { id:"tips", title:"PRO TIPS & CONTROLS", map:"home", portrait:"/player_wave.png",
    bubble:"You're almost ready! Here are the essential controls to maximize your Lifetopia experience.",
    details:["MOVEMENT — WASD or Arrow Keys to move. Hold SHIFT to run. SPACE to jump!","TOOLS — Press 1–8 to select tools instantly. Click the farm grid to use the selected tool.","MAP TRAVEL — Use the MAP SELECTOR (bottom-left) to travel between all areas.","SETTINGS — Click the ⚙ button (top-right) to adjust audio and difficulty.","SAVE — Progress auto-saves every 10 seconds when your wallet is connected.","You're all set! Click START FARMING to begin. Good luck, and may your harvests be plentiful!"],
    detailMeta:[{toolSlot:-1},{toolSlot:-1,targetPct:{x:50,y:TY},dir:"down"},{toolSlot:99,targetPct:{x:MX[0],y:MY},dir:"down"},{toolSlot:98,navBtn:"settings",targetPct:{x:NX.settings,y:NY},dir:"down"},{toolSlot:98,navBtn:"wallet",targetPct:{x:NX.wallet,y:NY},dir:"down"},{toolSlot:-1}] },
];

const HAND_IMG = "/tunjuk.png";
const HW = 40;  // display width
const HH = 70;  // display height (taller than wide, portrait)

// tunjuk.png naturally points UP (finger at top)
function handPos(t:{x:number;y:number}, dir:PointerDir, W:number, H:number) {
  const tx=(t.x/100)*W, ty=(t.y/100)*H;
  const gap = 12; // px between fingertip and target edge

  if(dir==="down")  return {left:tx-HW/2, top:ty-HH-gap, rotate:180}; // point finger DOWN
  if(dir==="up")    return {left:tx-HW/2, top:ty+gap,    rotate:0};   // point finger UP
  if(dir==="right") return {left:tx-HW-gap, top:ty-HH/2, rotate:90};  // point finger RIGHT
  return                  {left:tx+gap,  top:ty-HH/2,   rotate:-90}; // point finger LEFT
}

// ── Showcase components ──────────────────────────────────────────────────────
function ShopShowcase() {
  const items = [{name:"WHEAT",price:"5G",img:"/wheat.png"},{name:"TOMATO",price:"10G",img:"/tomato.png"},{name:"CARROT",price:"15G",img:"/carrot.png"},{name:"PUMPKIN",price:"25G",img:"/pumpkin.png"}];
  return (
    <div style={{background:"linear-gradient(180deg,#CE9E64,#8D5A32)",border:"4px solid #5C4033",borderRadius:12,padding:"12px 14px",boxShadow:"0 6px 0 #3a2212",width:300}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#FFD700",textShadow:"1px 1px #000",marginBottom:10,textAlign:"center"}}>SHOP CATALOG</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {items.map(it=>(
          <div key={it.name} style={{background:"#8B5E3C",border:"2px solid #5C4033",borderRadius:8,padding:8,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <img src={it.img} style={{width:32,height:32,imageRendering:"pixelated"}} alt={it.name}/>
            <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:5,color:"#FFE4B5",textAlign:"center"}}>{it.name} SEED</div>
            <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#FFD700"}}>{it.price}</div>
            <div style={{background:"linear-gradient(180deg,#FFD700,#C8A020)",border:"2px solid #5C4033",borderRadius:999,padding:"3px 10px",fontFamily:"'Press Start 2P',monospace",fontSize:5,color:"#3E2723"}}>BUY</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FishingShowcase() {
  return (
    <div style={{background:"linear-gradient(180deg,#CE9E64,#8D5A32)",border:"4px solid #5C4033",borderRadius:12,padding:"14px 18px",boxShadow:"0 6px 0 #3a2212",width:270,textAlign:"center"}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#FFD700",textShadow:"1px 1px #000",marginBottom:12}}>FISHING SPOT</div>
      <div style={{display:"flex",justifyContent:"center",gap:14,alignItems:"center",marginBottom:12}}>
        <img src="/ikan.png" style={{width:60,height:60,imageRendering:"pixelated",filter:"drop-shadow(0 0 8px rgba(255,215,0,0.5))"}} alt="fish"/>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[{l:"COMMON",g:"8G",c:"#FFE4B5"},{l:"RARE",g:"15G",c:"#FFD700"},{l:"EXOTIC",g:"25G",c:"#FFD700"}].map(f=>(
            <div key={f.l} style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:5,color:f.c,width:48,textShadow:"1px 1px #000"}}>{f.l}</div>
              <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#FFD700",textShadow:"1px 1px #000"}}>{f.g}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"linear-gradient(180deg,#A07844,#7B502C)",border:"3px solid #5C4033",borderRadius:999,padding:"6px 10px",fontFamily:"'Press Start 2P',monospace",fontSize:6,color:"#FFD700",textShadow:"1px 1px #000",boxShadow:"0 4px 0 #3a2212",animation:"pft-blink 1s step-end infinite"}}>PRESS E TO REEL</div>
    </div>
  );
}

function GardenShowcase() {
  const npcs=[{name:"FRIEND 1",color:"#FF6B6B",img:"/player_wave.png"},{name:"FRIEND 2",color:"#FFD700",img:"/player_happy.png"},{name:"FRIEND 3",color:"#90EE90",img:"/player_idle.png"}];
  return (
    <div style={{background:"linear-gradient(180deg,#CE9E64,#8D5A32)",border:"4px solid #5C4033",borderRadius:12,padding:"14px 16px",boxShadow:"0 6px 0 #3a2212",width:290}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#FFD700",textShadow:"1px 1px #000",marginBottom:12,textAlign:"center"}}>SOCIAL GARDEN</div>
      <div style={{display:"flex",justifyContent:"center",gap:10}}>
        {npcs.map(n=>(
          <div key={n.name} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{background:"linear-gradient(135deg,#8B5E3C,#5E3A24)",border:`3px solid ${n.color}`,borderRadius:8,padding:6,width:58,height:58,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 8px ${n.color}66`}}>
              <img src={n.img} style={{height:46,imageRendering:"pixelated"}} alt={n.name}/>
            </div>
            <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:5,color:n.color,textShadow:"1px 1px #000"}}>{n.name}</div>
          </div>
        ))}
      </div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:5,color:"#FFE4B5",textAlign:"center",marginTop:10,opacity:0.9,textShadow:"1px 1px #000"}}>MEET REAL PLAYERS SOON</div>
    </div>
  );
}

function SuburbanShowcase() {
  // Pixel-art house vectors drawn with CSS — no emoji
  const houses = [
    { roof: "#C0392B", wall: "#E8D5B7", label: "HOUSE A" },
    { roof: "#2980B9", wall: "#D5E8E0", label: "HOUSE B" },
    { roof: "#27AE60", wall: "#E8E0D5", label: "HOUSE C" },
  ];
  return (
    <div style={{background:"linear-gradient(180deg,#CE9E64,#8D5A32)",border:"4px solid #5C4033",borderRadius:12,padding:"14px 18px",boxShadow:"0 6px 0 #3a2212",width:270,textAlign:"center"}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#FFD700",textShadow:"1px 1px #000",marginBottom:12}}>SUBURBAN AREA</div>
      <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:10}}>
        {houses.map((h,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            {/* Pixel house: roof triangle + wall rectangle */}
            <div style={{position:"relative",width:44,height:44}}>
              {/* Roof */}
              <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"22px solid transparent",borderRight:"22px solid transparent",borderBottom:`18px solid ${h.roof}`}}/>
              {/* Wall */}
              <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:32,height:26,background:h.wall,border:"2px solid #5C4033",borderRadius:2}}>
                {/* Door */}
                <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:8,height:12,background:"#5C4033",borderRadius:"2px 2px 0 0"}}/>
              </div>
            </div>
            <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:4,color:"#FFE4B5",textShadow:"1px 1px #000"}}>{h.label}</div>
          </div>
        ))}
      </div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:6,color:"#FFE4B5",opacity:0.9,textShadow:"1px 1px #000"}}>EXPLORE THE NEIGHBORHOOD</div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:5,color:"#FFE4B5",opacity:0.6,marginTop:6}}>MORE CONTENT COMING SOON</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PreFarmTutorial({ visible, onFinished, onMapFocus }: PreFarmTutorialProps) {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [detailIndex, setDetailIndex] = useState(-1);
  const [typedBubble, setTypedBubble] = useState("");
  const [finished, setFinished] = useState(false);
  const [cSize, setCSize] = useState({ w: 1280, h: 720 });
  const containerRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];
  const isCompact = !!step.compact;
  const totalSteps = STEPS.length;
  const totalDetails = step.details.length;
  const curDetail = detailIndex + 1;
  const pct = Math.round(((stepIndex * 10 + Math.max(0, detailIndex + 1)) / (totalSteps * 10)) * 100);
  const meta: DetailMeta | null = detailIndex >= 0 ? step.detailMeta[detailIndex] : null;
  const activeSlot = meta?.toolSlot ?? -1;
  const activeNav = meta?.navBtn;

  useEffect(() => {
    const m = () => { if (containerRef.current) { const r = containerRef.current.getBoundingClientRect(); setCSize({ w: r.width, h: r.height }); } };
    m(); window.addEventListener("resize", m); return () => window.removeEventListener("resize", m);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setStarted(false); setStepIndex(0); setDetailIndex(-1); setTypedBubble(""); setFinished(false);
    const t = setTimeout(() => setStarted(true), 320);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => { if (visible && started) onMapFocus?.(step.map); }, [visible, started, step.map, onMapFocus]);

  useEffect(() => {
    if (!visible || !started) return;
    if (typingRef.current) clearInterval(typingRef.current);
    setTypedBubble("");
    let i = 0;
    const text = detailIndex === -1 ? step.bubble : step.details[detailIndex];
    if (!text) return;
    typingRef.current = setInterval(() => {
      i += 2; setTypedBubble(text.slice(0, i));
      if (i >= text.length && typingRef.current) clearInterval(typingRef.current);
    }, 14);
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [visible, started, stepIndex, detailIndex, step.bubble, step.details]);

  const skipTyping = () => {
    if (typingRef.current) clearInterval(typingRef.current);
    setTypedBubble((detailIndex === -1 ? step.bubble : step.details[detailIndex]) || "");
  };
  const handleNext = () => {
    const text = detailIndex === -1 ? step.bubble : step.details[detailIndex];
    if (typedBubble.length < (text?.length || 0)) { skipTyping(); return; }
    if (detailIndex < step.details.length - 1) { setDetailIndex(d => d + 1); return; }
    if (stepIndex < STEPS.length - 1) { setStepIndex(i => i + 1); setDetailIndex(-1); return; }
    setFinished(true); onFinished();
  };
  const handleSkip = () => { setFinished(true); onFinished(); };

  if (!visible || finished) return null;

  let hand: { left: number; top: number; rotate: number } | null = null;
  if (!isCompact && meta?.targetPct && meta.dir) hand = handPos(meta.targetPct, meta.dir, cSize.w, cSize.h);

  const handInBottom = hand ? hand.top > cSize.h * 0.5 : false;
  const dialogueAtTop = handInBottom;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
    @keyframes pft-blink{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes pft-bob{0%,100%{transform:rotate(var(--rot,0deg)) translate(0,0)}50%{transform:rotate(var(--rot,0deg)) translate(0,5px)}}
    .pft-wb{font-family:'Press Start 2P',monospace;background:linear-gradient(180deg,#CE9E64,#8D5A32);border:3px solid #5C4033;border-radius:999px;color:#FFF5E0;cursor:pointer;box-shadow:0 4px 0 #3a2212,inset 0 1px 1px rgba(255,255,255,0.45);transition:all 0.08s;padding:8px 18px;font-size:8px;text-shadow:1px 1px 1px #000}
    .pft-wb:hover{background:linear-gradient(180deg,#D9B380,#AD7D54);transform:translateY(-2px);box-shadow:0 6px 0 #3a2212}
    .pft-wb:active{transform:translateY(2px);box-shadow:0 2px 0 #3a2212}
    .pft-wb.primary{background:linear-gradient(180deg,#FFD700,#C8A020);color:#3E2723;text-shadow:none;box-shadow:0 4px 0 #7a5c00}
    .pft-wb.primary:hover{background:linear-gradient(180deg,#FFE44D,#D4AF37)}
    .hud-tray-pft{background:linear-gradient(180deg,#A07844,#7B502C);padding:10px 18px;border-radius:40px;border:4px solid #5C4033;box-shadow:0 10px 0 rgba(0,0,0,0.5),inset 0 2px 8px rgba(255,255,255,0.25);display:flex;gap:8px;position:absolute;bottom:25px;left:50%;transform:translateX(-50%);z-index:12}
    .hud-slot-pft{width:52px;height:52px;background:linear-gradient(135deg,#8B5E3C,#5E3A24);border:3px solid #4D2D18;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;transition:all 0.15s}
    .hud-slot-pft.active{background:linear-gradient(135deg,#FFE4B5,#D4AF37);border-color:#FFF;box-shadow:0 0 18px rgba(255,215,0,0.7),inset 0 0 5px #FFF}
    .map-sel-pft{background:linear-gradient(180deg,#A07844,#7B502C);padding:8px 15px;border-radius:40px;border:4px solid #5C4033;box-shadow:0 10px 0 rgba(0,0,0,0.5);display:flex;gap:6px;position:absolute;bottom:25px;left:25px;z-index:12}
    .map-btn-pft{font-family:'Press Start 2P',monospace;background:linear-gradient(180deg,#CE9E64,#8D5A32);border:3px solid #5C4033;border-radius:999px;color:#FFF5E0;cursor:pointer;box-shadow:0 4px 0 #3a2212;padding:7px 10px;font-size:7px;text-shadow:1px 1px 1px #000}
    .map-btn-pft.active{background:linear-gradient(180deg,#FFD700,#C8A020);color:#3E2723;text-shadow:none;box-shadow:0 4px 0 #7a5c00}
    .map-btn-pft.hl{box-shadow:0 0 14px rgba(255,215,0,0.8),0 4px 0 #7a5c00}
    .topnav-pft{position:absolute;top:20px;right:20px;display:flex;gap:8px;align-items:center;z-index:12}
    .tnav-btn{font-family:'Press Start 2P',monospace;background:linear-gradient(180deg,#CE9E64,#8D5A32);border:3px solid #5C4033;border-radius:999px;color:#FFF5E0;box-shadow:0 4px 0 #3a2212;padding:8px 14px;font-size:8px;text-shadow:1px 1px 1px #000}
    .tnav-btn.hl{background:linear-gradient(180deg,#FFD700,#C8A020);color:#3E2723;text-shadow:none;box-shadow:0 4px 0 #7a5c00,0 0 16px rgba(255,215,0,0.6)}
  `;

  // ── COMPACT MODE (city/fishing/garden/suburban) ──────────────────────────
  if (isCompact) {
    return (
      <div ref={containerRef} style={{ position:"absolute", inset:0, zIndex:9500, overflow:"hidden", pointerEvents:"none" }}>
        <style>{CSS}</style>
        {/* No overlay, no background — game world shows through fully */}

        {/* Corner card — bottom-right, small, semi-transparent, pointerEvents on */}
        <div style={{
          position:"absolute", bottom:20, right:20,
          zIndex:100, pointerEvents:"auto",
          display:"flex", flexDirection:"column", gap:10, alignItems:"flex-end",
        }}>
          {/* Showcase visual */}
          {step.showcase === "shop"     && <ShopShowcase />}
          {step.showcase === "fishing"  && <FishingShowcase />}
          {step.showcase === "garden"   && <GardenShowcase />}
          {step.showcase === "suburban" && <SuburbanShowcase />}

          {/* Compact dialogue card */}
          <div
            onClick={skipTyping}
            style={{
              background:"#f4c692", border:"6px solid #5C4033", borderRadius:4,
              boxShadow:"0 12px 40px rgba(0,0,0,0.7), inset 0 0 0 3px #8B5E3C",
              display:"flex", overflow:"hidden", cursor:"pointer",
              width: step.showcase === "shop" ? 300 : step.showcase === "fishing" ? 270 : step.showcase === "garden" ? 290 : 270,
            }}
          >
            <div style={{width:8,background:"#4a2c1a",borderRight:"3px solid #8B5E3C",flexShrink:0}}/>
            <div style={{flex:1,padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:6,color:"#8B4513",letterSpacing:1}}>
                {detailIndex===-1 ? `◆ ${step.title}` : `TIP ${curDetail}/${totalDetails}`}
              </div>
              <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:10,lineHeight:"1.8",color:"#3a2212",textShadow:"1px 1px 0 rgba(255,255,255,0.35)",minHeight:40}}>
                {typedBubble}
                <span style={{display:"inline-block",width:2,height:11,background:"#3a2212",marginLeft:2,animation:"pft-blink 0.7s step-end infinite",verticalAlign:"middle"}}/>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="pft-wb" style={{fontSize:6,padding:"6px 12px"}} onClick={e=>{e.stopPropagation();handleSkip();}}>SKIP</button>
                <button className="pft-wb primary" style={{fontSize:6,padding:"6px 12px"}} onClick={e=>{e.stopPropagation();handleNext();}}>
                  {stepIndex===STEPS.length-1&&detailIndex===step.details.length-1?"START ▶":detailIndex<step.details.length-1?"NEXT ▶":"NEXT ▶"}
                </button>
              </div>
            </div>
            <div style={{width:8,background:"#4a2c1a",borderLeft:"3px solid #8B5E3C",flexShrink:0}}/>
          </div>
        </div>

        {/* Progress pill — top-left, minimal */}
        <div style={{
          position:"absolute",top:15,left:15,zIndex:20,pointerEvents:"none",
          background:"linear-gradient(180deg,#CE9E64,#8D5A32)",
          border:"3px solid #5C4033",borderRadius:12,
          padding:"6px 12px",boxShadow:"0 4px 0 #3a2212",
          display:"flex",flexDirection:"column",gap:4,minWidth:180,
        }}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:6,color:"#FFE4B5",textShadow:"1px 1px #000"}}>CHAPTER {stepIndex+1}/{totalSteps}</div>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:6,color:"#3E2723"}}>{step.title}</div>
          <div style={{height:6,background:"#5C4033",borderRadius:4,overflow:"hidden",border:"1px solid #3a2212"}}>
            <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#FFD700,#C8A020)",borderRadius:4,transition:"width 0.4s"}}/>
          </div>
        </div>
      </div>
    );
  }

  // ── FULL MODE (farm/home steps) ──────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ position:"absolute", inset:0, zIndex:9500, overflow:"hidden", pointerEvents:"auto" }}>
      <style>{CSS}</style>

      {/* Background */}
      <div style={{position:"absolute",inset:0,backgroundImage:`url(${MAP_BG[step.map]||MAP_BG.home})`,backgroundSize:"cover",backgroundPosition:"center",transform:"scale(1.04)",transition:"background-image 0.5s"}}/>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.38)",zIndex:1}}/>

      {/* Progress */}
      <div style={{position:"absolute",top:15,left:15,zIndex:20,background:"linear-gradient(180deg,#CE9E64,#8D5A32)",border:"3px solid #5C4033",borderRadius:12,padding:"8px 14px",boxShadow:"0 4px 0 #3a2212",display:"flex",flexDirection:"column",gap:5,minWidth:200}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:6,color:"#FFE4B5",textShadow:"1px 1px #000"}}>CHAPTER {stepIndex+1}/{totalSteps}</div>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#3E2723",textShadow:"1px 1px rgba(255,255,255,0.3)"}}>{step.title}</div>
        {detailIndex>=0&&<div style={{fontFamily:"'Press Start 2P',monospace",fontSize:6,color:"#5C4033"}}>TIP {curDetail}/{totalDetails}</div>}
        <div style={{height:7,background:"#5C4033",borderRadius:4,overflow:"hidden",border:"1px solid #3a2212"}}>
          <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#FFD700,#C8A020)",borderRadius:4,transition:"width 0.4s"}}/>
        </div>
      </div>

      {/* Top nav replica */}
      <div className="topnav-pft">
        <div className="tnav-btn" style={{fontSize:8,padding:"6px 15px"}}>LVL 1</div>
        {(["wallet","tasks","items","nfts"] as const).map(k=>(
          <div key={k} className={`tnav-btn ${activeNav===k?"hl":""}`}>{k.toUpperCase()}</div>
        ))}
        <div className="tnav-btn" style={{color:"#FFD700"}}>G 0</div>
        <div className={`tnav-btn ${activeNav==="settings"?"hl":""}`} style={{fontSize:8,padding:"6px 10px"}}>SET</div>
      </div>

      {/* Map selector replica */}
      <div className="map-sel-pft">
        {(["Farm","City","Fishing","Garden","Suburban"] as const).map((label,i)=>{
          const ids:MapType[]=["home","city","fishing","garden","suburban"];
          const isCur=ids[i]===step.map, isHl=activeSlot===99&&isCur;
          return <div key={label} className={`map-btn-pft ${isCur?"active":""} ${isHl?"hl":""}`}>{label.toUpperCase()}</div>;
        })}
      </div>

      {/* Toolbar replica */}
      <div className="hud-tray-pft">
        {TOOLS.map((tool,i)=>{
          const isActive=activeSlot===i;
          return (
            <div key={i} className={`hud-slot-pft ${isActive?"active":""}`}>
              <img src={tool.src} style={{width:34}} alt={tool.label}/>
              {isActive&&<div style={{position:"absolute",top:-16,left:"50%",transform:"translateX(-50%)",fontFamily:"'Press Start 2P',monospace",fontSize:5,color:"#FFD700",textShadow:"1px 1px #000",whiteSpace:"nowrap",background:"rgba(0,0,0,0.75)",padding:"2px 5px",borderRadius:3}}>{tool.label}</div>}
            </div>
          );
        })}
      </div>

      {/* Hand pointer */}
      {hand && (
        <img src={HAND_IMG} alt="" style={{
          position:"absolute", left:hand.left, top:hand.top,
          width:HW, height:HH,
          imageRendering:"pixelated",
          zIndex:50, pointerEvents:"none",
          transform:`rotate(${hand.rotate}deg)`,
          transformOrigin:"center center",
          animation:"pft-bob 0.7s ease-in-out infinite",
          ["--rot" as any]: `${hand.rotate}deg`,
          filter:"drop-shadow(2px 3px 5px rgba(0,0,0,0.8))",
          transition:"left 0.25s ease, top 0.25s ease",
        }}/>
      )}

      {/* Dialogue box */}
      <div onClick={skipTyping} style={{
        position:"absolute", left:"50%",
        top:dialogueAtTop? (cSize.h < 500 ? 10 : 90) : "auto", 
        bottom:dialogueAtTop?"auto" : (cSize.h < 500 ? 55 : 100),
        transform:"translateX(-50%)",
        width:"min(1120px,96%)",
        maxHeight: cSize.h < 500 ? "40%" : "auto",
        background:"#f4c692", border: cSize.h < 500 ? "4px solid #5C4033" : "8px solid #5C4033", borderRadius:4,
        boxShadow:"0 15px 40px rgba(0,0,0,0.8),inset 0 0 0 2px #8B5E3C",
        display:"flex", zIndex:100, overflow:"hidden", cursor:"pointer",
      }}>
        <div style={{width:12,background:"#4a2c1a",borderRight:"4px solid #8B5E3C",flexShrink:0}}/>
        <div style={{flex:1,padding: cSize.h < 500 ? "10px 14px" : "18px 22px",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize: cSize.h < 500 ? 5 : 7,color:"#8B4513",letterSpacing:1}}>
            {detailIndex===-1?`◆ ${step.title}`:`TIP ${curDetail}/${totalDetails} — ${step.title}`}
          </div>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize: cSize.h < 500 ? 8 : 12,lineHeight:"1.9",color:"#3a2212",textShadow:"1px 1px 0 rgba(255,255,255,0.35)",minHeight: cSize.h < 500 ? 30 : 50}}>
            {typedBubble}
            <span style={{display:"inline-block",width:2,height:13,background:"#3a2212",marginLeft:2,animation:"pft-blink 0.7s step-end infinite",verticalAlign:"middle"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"'Press Start 2P',monospace",fontSize: cSize.h < 500 ? 4 : 5,color:"rgba(58,34,18,0.45)"}}>CLICK TO SKIP TYPING</div>
            <div style={{display:"flex",gap:10}}>
              <button className="pft-wb" style={{fontSize: cSize.h < 500 ? 6 : 8, padding: "6px 12px"}} onClick={e=>{e.stopPropagation();handleSkip();}}>SKIP ALL</button>
              <button className="pft-wb primary" style={{fontSize: cSize.h < 500 ? 6 : 8, padding: "6px 14px"}} onClick={e=>{e.stopPropagation();handleNext();}}>
                {stepIndex===STEPS.length-1&&detailIndex===step.details.length-1? (cSize.h < 500 ? "START" : "START FARMING ▶") : detailIndex<step.details.length-1?"NEXT TIP ▶":"NEXT ▶"}
              </button>
            </div>
          </div>
        </div>
        <div style={{width: cSize.h < 500 ? 110 : 210, borderLeft: cSize.h < 500 ? "4px solid #5C4033" : "8px solid #5C4033",background: "#e0b080",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <div style={{background:"#f4c692",padding: cSize.h < 500 ? 4 : 8,border: cSize.h < 500 ? "2px solid #5C4033" : "4px solid #5C4033",borderRadius:4,marginBottom:8,width: cSize.h < 500 ? 70 : 136,height: cSize.h < 500 ? 70 : 136,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
            <img src={step.portrait} style={{height: cSize.h < 500 ? 64 : 124,imageRendering:"pixelated"}} alt=""/>
          </div>
          <div style={{background:"#3a2212",color:"#FFF5E0",padding:"2px 8px",fontFamily:"'Press Start 2P',monospace",fontSize: cSize.h < 500 ? 5 : 7,borderRadius:4}}>GUIDE</div>
          <div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap",justifyContent:"center",padding:"0 8px"}}>
            {STEPS.map((_,i)=>(
              <div key={i} style={{width:7,height:7,borderRadius:"50%",background:i===stepIndex?"#FFD700":i<stepIndex?"#8BC34A":"rgba(255,255,255,0.25)",border:"1px solid rgba(0,0,0,0.3)",transition:"all 0.3s"}}/>
            ))}
          </div>
        </div>
        <div style={{width:12,background:"#4a2c1a",borderLeft:"4px solid #8B5E3C",flexShrink:0}}/>
      </div>
    </div>
  );
}
