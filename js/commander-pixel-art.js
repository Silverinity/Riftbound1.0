/* RIFTBOUND — procedural pixel-art commander sprite sheets.
   Each commander gets an 8-frame horizontal sheet: 4 idle + 4 ability frames.
   Drawn at native 64x80 resolution; the battlefield scales with smoothing disabled. */
(() => {
  "use strict";
  const palettes = {
    warden: { dark:"#111827", base:"#263d66", mid:"#5276a8", hi:"#b7d6e8", cloth:"#1f765d", gold:"#d7b86a", glow:"#76d8ff", skin:"#d4b18c" },
    arcanist: { dark:"#171020", base:"#34204f", mid:"#69439a", hi:"#c3a0ed", cloth:"#43266f", gold:"#b58cff", glow:"#c28aff", skin:"#d7b6a0" },
    huntmaster: { dark:"#111b13", base:"#29482f", mid:"#527b42", hi:"#a7c96a", cloth:"#365b32", gold:"#c7a56b", glow:"#9bdb69", skin:"#d9ad83" },
    treasurer: { dark:"#211a10", base:"#66502b", mid:"#b68a39", hi:"#ffe2a0", cloth:"#eee0bd", gold:"#e5b84d", glow:"#ffd45c", skin:"#e0b99b" },
    pyromancer: { dark:"#241012", base:"#4c2020", mid:"#963a27", hi:"#f0a04b", cloth:"#68212b", gold:"#e8a34e", glow:"#ff6a27", skin:"#d6a18a" },
    necromancer: { dark:"#101b20", base:"#273d45", mid:"#45636b", hi:"#9cc7c1", cloth:"#293e56", gold:"#64d7b0", glow:"#59f0c5", skin:"#9bb8b0" }
  };
  const sheets = {};
  const rect = (c,x,y,w,h,color) => { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h))); };
  const line = (c,x1,y1,x2,y2,color,t=1) => {
    c.fillStyle=color;
    const dx=x2-x1,dy=y2-y1,steps=Math.max(Math.abs(dx),Math.abs(dy),1);
    for(let n=0;n<=steps;n++) rect(c,x1+dx*n/steps,y1+dy*n/steps,t,t,color);
  };
  const outlined = (c,x,y,w,h,fill,p) => { rect(c,x-1,y-1,w+2,h+2,p.dark); rect(c,x,y,w,h,fill); };
  function paint(id, frame, c) {
    const p=palettes[id], cast=frame>=4, f=frame%4, bob=(!cast && f===1)?-1:(!cast && f===3)?1:0;
    const sway=cast?[0,1,2,1][f]:[0,1,0,-1][f];
    c.save(); c.translate(0,bob);
    // grounded shadow and trailing mantle
    rect(c,18,74,29,3,"#080b12");
    outlined(c,19+sway,29,23,35,p.cloth,p);
    rect(c,18+sway,36,5,26,p.mid); rect(c,39+sway,35,3,27,p.hi);
    rect(c,22+sway,58,17,5,p.base);
    // legs, greaves and boots
    outlined(c,22+sway,54,9,17,p.base,p); outlined(c,34+sway,54,9,17,p.mid,p);
    rect(c,20+sway,69,12,5,p.dark); rect(c,33+sway,69,13,5,p.dark);
    rect(c,22+sway,70,7,1,p.gold); rect(c,36+sway,70,7,1,p.gold);
    // torso silhouette and layered tunic/armour
    outlined(c,20+sway,29,23,28,p.base,p);
    rect(c,22+sway,32,8,20,p.mid); rect(c,33+sway,32,7,18,p.hi);
    rect(c,30+sway,31,3,22,p.gold); rect(c,22+sway,49,20,4,p.dark);
    rect(c,29+sway,49,5,4,p.gold); rect(c,30+sway,50,3,2,p.hi);
    // shoulder plates, arms, gloves
    outlined(c,16+sway,30,8,9,p.mid,p); rect(c,17+sway,31,6,2,p.hi);
    outlined(c,39+sway,30,8,9,p.base,p); rect(c,40+sway,31,5,2,p.hi);
    rect(c,15+sway,39,6,10,p.mid); rect(c,41+sway,39,6,10,p.mid);
    rect(c,14+sway,47,8,5,p.dark); rect(c,40+sway,47,8,5,p.dark);
    // neck and head
    rect(c,27+sway,24,9,7,p.skin); outlined(c,23+sway,10,18,17,p.skin,p);
    rect(c,25+sway,18,14,4,p.dark); rect(c,27+sway,17,2,2,p.glow); rect(c,35+sway,17,2,2,p.glow);
    // distinct head silhouettes
    if(id==="warden"){
      outlined(c,21+sway,7,22,10,p.mid,p); rect(c,24+sway,8,15,2,p.hi); rect(c,30+sway,4,4,5,p.gold);
      rect(c,24+sway,20,16,3,p.dark);
    } else if(id==="arcanist"){
      rect(c,20+sway,11,24,7,p.base); rect(c,24+sway,5,16,9,p.cloth); rect(c,27+sway,2,10,7,p.mid);
      rect(c,31+sway,0,3,5,p.glow); rect(c,24+sway,19,16,4,p.dark);
    } else if(id==="huntmaster"){
      rect(c,20+sway,8,23,7,p.cloth); rect(c,24+sway,5,17,5,p.mid); rect(c,22+sway,14,20,3,p.dark);
      rect(c,37+sway,8,5,2,p.gold);
    } else if(id==="treasurer"){
      rect(c,21+sway,10,22,5,p.gold); rect(c,24+sway,5,3,7,p.hi); rect(c,30+sway,2,4,10,p.gold); rect(c,38+sway,5,3,7,p.hi);
      rect(c,24+sway,14,16,3,p.hi);
    } else if(id==="pyromancer"){
      rect(c,20+sway,11,23,13,p.cloth); rect(c,23+sway,5,5,9,p.glow); rect(c,31+sway,2,4,10,p.hi); rect(c,38+sway,7,4,8,p.mid);
      rect(c,24+sway,20,16,4,p.dark);
    } else {
      rect(c,19+sway,11,26,15,p.cloth); rect(c,23+sway,5,17,7,p.base); rect(c,29+sway,2,7,6,p.gold);
      rect(c,24+sway,17,16,3,p.dark); rect(c,30+sway,18,4,2,p.glow);
    }
    // character-specific weapon and signature silhouette
    if(id==="warden"){
      outlined(c,5,32,12,22,p.mid,p); rect(c,8,35,6,15,p.base); line(c,11,34,11,51,p.gold,2); line(c,7,42,16,42,p.gold,2);
      line(c,47,48,57,22,p.hi,2); line(c,45,47,50,42,p.gold,2);
    } else if(id==="arcanist"){
      line(c,51,51,55,9,p.gold,2); rect(c,50,6,10,3,p.glow); rect(c,52,3,5,9,p.mid); rect(c,54,5,2,5,"#fff2ff");
      rect(c,47,35,5,8,p.hi);
    } else if(id==="huntmaster"){
      line(c,48,21,57,61,p.gold,2); line(c,49,21,43,42,p.gold,1); line(c,44,42,57,61,p.hi,1);
      rect(c,10,26,4,8,p.gold); rect(c,8,23,3,3,p.hi);
    } else if(id==="treasurer"){
      line(c,51,53,54,13,p.gold,3); rect(c,49,8,10,5,p.hi); rect(c,52,4,4,5,p.gold);
      rect(c,8,29,4,4,p.gold); rect(c,53,29,4,4,p.gold);
    } else if(id==="pyromancer"){
      line(c,47,46,54,32,p.gold,2); rect(c,48,25,12,12,p.glow); rect(c,51,20,7,10,p.hi); rect(c,53,17,3,6,"#fff2b2");
    } else {
      line(c,51,54,55,10,p.hi,2); rect(c,49,6,11,3,p.glow); rect(c,52,3,5,9,p.mid); rect(c,54,5,2,5,"#effffb");
      rect(c,8,31,4,4,p.glow);
    }
    // ability-specific frames: lifted pose, spell geometry and particles
    if(cast){
      const pulse=[0,2,4,2][f];
      for(let n=0;n<4;n++){
        const px=8+n*13+(f%2)*2, py=58-(n%2)*8-pulse;
        rect(c,px,py,2,3,p.glow); rect(c,px+2,py-2,1,1,p.hi);
      }
      line(c,8,72,56,72,p.glow,1); line(c,13,75,51,75,p.gold,1);
      if(id==="warden"){
        outlined(c,4,29,13,27,p.glow,p); rect(c,8,32,5,20,p.mid); rect(c,10,35,2,14,p.hi);
        rect(c,17,27,3,3,p.glow); rect(c,3,54,4,3,p.glow);
      } else if(id==="arcanist"){
        rect(c,47,3,14,2,p.glow); rect(c,53,0,2,14,p.glow); rect(c,49,5,10,9,p.mid); rect(c,52,7,4,5,"#fff2ff");
        rect(c,45,16,3,3,p.glow); rect(c,59,16,3,3,p.glow);
      } else if(id==="huntmaster"){
        line(c,44,39,63,27,p.glow,2); line(c,44,39,63,45,p.hi,1); rect(c,60,25,4,4,p.hi);
        rect(c,55,35,5,3,p.glow); rect(c,48,28,3,3,p.gold);
      } else if(id==="treasurer"){
        for(const [x,y] of [[7,40],[53,31],[48,56],[15,60],[58,49]]){rect(c,x,y,5,5,p.gold);rect(c,x+1,y+1,2,2,p.hi);}
        rect(c,29,7,6,4,p.hi); rect(c,31,4,2,10,p.gold);
      } else if(id==="pyromancer"){
        rect(c,45,18,17,17,p.glow); rect(c,48,15,11,17,p.hi); rect(c,51,11,6,13,"#ffd16a");
        rect(c,53,8,3,7,"#fff2b2"); rect(c,42,28,4,4,p.gold);
      } else {
        for(const [x,y] of [[6,31],[53,28],[47,48],[13,53]]){rect(c,x,y,7,8,p.glow);rect(c,x+2,y+2,3,4,p.dark);rect(c,x+3,y+3,1,2,"#eafffa");}
        rect(c,30,5,5,5,p.hi); rect(c,31,6,3,3,p.glow);
      }
    }
    // extra armour seams and cloth pixel highlights
    rect(c,23+sway,38,2,5,p.hi); rect(c,38+sway,42,2,5,p.gold); rect(c,25+sway,60,2,6,p.hi);
    c.restore();
  }
  function makeSheet(id) {
    const sheet=document.createElement("canvas"); sheet.width=512; sheet.height=80;
    const c=sheet.getContext("2d",{alpha:true}); c.imageSmoothingEnabled=false;
    for(let frame=0;frame<8;frame++){c.save();c.translate(frame*64,0);paint(id,frame,c);c.restore();}
    return sheet;
  }
  for(const id of Object.keys(palettes)) sheets[id]=makeSheet(id);
  window.RiftboundCommanderSprites = {
    get(id){return sheets[id]||sheets.warden;},
    frameWidth:64, frameHeight:80, idleFrames:4, castFrames:4
  };
})();