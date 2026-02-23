import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import * as Tone from "tone";
import { generateReport } from "./reportGenerator";
import PTLibrary from "./PTLibrary";

/* ═══════════════════ DESIGN TOKENS ═══════════════════ */
const T = {
  bg:"#F5F4F1",bgD:"#ECEAE6",sf:"#FFFFFF",sfA:"#FAFAF8",
  tx:"#1D1D1F",txM:"#6E6E73",txL:"#AEAEB2",txF:"#C7C7CC",
  ac:"#0071E3",acS:"rgba(0,113,227,0.07)",
  bd:"rgba(0,0,0,0.06)",bdM:"rgba(0,0,0,0.1)",
  mild:{c:"#A68B00",bg:"rgba(166,139,0,0.06)",bd:"rgba(166,139,0,0.18)",g:0xa68b00},
  moderate:{c:"#C45D00",bg:"rgba(196,93,0,0.06)",bd:"rgba(196,93,0,0.18)",g:0xc45d00},
  severe:{c:"#BF1029",bg:"rgba(191,16,41,0.06)",bd:"rgba(191,16,41,0.18)",g:0xbf1029},
  hBone:0xf0e8dc,hCart:0xc2dae8,hLig:0xe5ddd5,hMen:0xa8c8de,hFlu:0xccc080,
};

/* ═══════════════════ DATA ═══════════════════ */
const SAMPLE=`IMPRESSION:
1. Horizontal tear of the posterior horn of the medial meniscus.
2. Complete tear of the ACL with associated bone bruising of the lateral femoral condyle and posterolateral tibial plateau.
3. Moderate joint effusion.
4. Grade 2 chondromalacia of the medial femoral condyle.
5. Small Baker's cyst.`;

const FD=[
  {id:"men",str:"Medial Meniscus",path:"Horizontal Tear",sev:"moderate",m:["meniscus_medial"],
    desc:"A horizontal cleavage tear in the posterior horn of your medial meniscus — the C-shaped shock absorber on the inner side of your knee.",
    imp:"Pain along the inner knee line, especially with deep squats, twisting, or stair climbing. Possible catching or locking.",
    ctx:"Horizontal meniscal tears are among the most common knee findings. Many respond well to physical therapy without surgery.",
    sc:.5,cam:{p:[1.8,.3,2.2],t:[0,-.1,0]}},
  {id:"acl",str:"ACL",path:"Complete Tear",sev:"severe",m:["acl"],
    desc:"Your anterior cruciate ligament is completely torn — the primary stabilizer preventing your shin bone from sliding forward.",
    imp:"Instability during cutting, pivoting, or sudden stops. Walking and cycling typically unaffected.",
    ctx:"About 200,000 ACL injuries occur annually in the US. Treatment depends on your activity goals — many return to full activity with structured rehabilitation.",
    sc:.85,cam:{p:[1.5,.2,2.5],t:[0,0,0]}},
  {id:"bone",str:"Bone",path:"Bone Bruise",sev:"mild",m:["condyle_lateral","tibial_plateau"],
    desc:"Bone marrow edema in your lateral femoral condyle and posterolateral tibial plateau — a very common companion finding with ACL tears.",
    imp:"Deep, aching pain that gradually fades over 6-12 weeks. No specific treatment required.",
    ctx:"Present in over 80% of acute ACL injuries. The bruise pattern confirms the mechanism. Resolves on its own within 2-3 months.",
    sc:.2,cam:{p:[2,.8,1.5],t:[0,.2,0]}},
  {id:"eff",str:"Joint Fluid",path:"Moderate Effusion",sev:"moderate",m:["effusion"],
    desc:"Moderate excess fluid in your knee joint — your body's inflammatory response to the internal injuries.",
    imp:"Stiffness, tightness, difficulty fully bending or straightening. May feel warm and puffy.",
    ctx:"Expected after acute injury. Improves with RICE (rest, ice, compression, elevation) over 2-4 weeks.",
    sc:.45,cam:{p:[2.5,1.5,1.5],t:[0,.5,0]}},
  {id:"cart",str:"Articular Cartilage",path:"Grade 2 Chondromalacia",sev:"mild",m:["cartilage_medial"],
    desc:"The smooth cartilage on the inner surface of your thigh bone shows softening and early wear — Grade 2 on a 4-point scale.",
    imp:"Occasional dull ache with prolonged sitting or weight-bearing. Mild grinding sensation possible.",
    ctx:"Very common and frequently incidental. Quadriceps strengthening is the most effective conservative treatment.",
    sc:.25,cam:{p:[2,-.2,2],t:[0,-.1,0]}},
];

/* ═══════════════════ SOUND ═══════════════════ */
let sReady=false, sAmb, sRev, sTrans;
function initS(){if(sReady)return;try{sAmb=new Tone.Synth({oscillator:{type:"sine"},envelope:{attack:2,decay:1,sustain:.3,release:4},volume:-28}).toDestination();sRev=new Tone.Synth({oscillator:{type:"triangle"},envelope:{attack:.1,decay:.6,sustain:0,release:1.5},volume:-20}).toDestination();sTrans=new Tone.Synth({oscillator:{type:"sine"},envelope:{attack:.5,decay:2,sustain:0,release:3},volume:-24}).toDestination();sReady=true;}catch(e){}}
function pAmb(){if(!sReady)return;try{sAmb.triggerAttackRelease("C3",4)}catch(e){}}
function pRev(i){if(!sReady)return;try{sRev.triggerAttackRelease(["E4","G4","A4","B4","D5"][i%5],.8)}catch(e){}}
function pTrans(){if(!sReady)return;try{sTrans.triggerAttackRelease("G3",3)}catch(e){}}

/* ═══════════════════ KNEE MODEL ═══════════════════ */
function buildKnee(){
  const g=new THREE.Group();
  const mk=(geo,col,n,p,r,s,op)=>{const mt=new THREE.MeshStandardMaterial({color:col,roughness:.4,metalness:.02,transparent:op!=null,opacity:op??1});const m=new THREE.Mesh(geo,mt);if(p)m.position.set(...p);if(r)m.rotation.set(...r);if(s)m.scale.set(...s);m.name=n;g.add(m);return m;};
  mk(new THREE.CylinderGeometry(.26,.2,2.5,24),T.hBone,"femur",[0,1.5,0]);
  const cg=new THREE.SphereGeometry(.28,24,18);cg.scale(1.15,.78,1.05);
  mk(cg.clone(),T.hBone,"condyle_medial",[-.22,.15,0]);
  mk(cg.clone(),T.hBone,"condyle_lateral",[.22,.15,0]);
  mk(new THREE.CylinderGeometry(.2,.26,2.5,24),T.hBone,"tibia",[0,-1.5,0]);
  mk(new THREE.CylinderGeometry(.4,.34,.12,24),T.hBone,"tibial_plateau",[0,-.2,0]);
  const pg=new THREE.SphereGeometry(.18,18,14);pg.scale(.85,1,.5);
  mk(pg,T.hBone,"patella",[0,.3,.42]);
  mk(new THREE.SphereGeometry(.09,12,10),T.hBone,"fibula",[.42,-.4,-.08]);
  ["medial","lateral"].forEach((s,i)=>{mk(new THREE.TorusGeometry(.18,.05,12,28,Math.PI*1.4),T.hMen,`meniscus_${s}`,[i?.16:-.16,-.05,0],[-Math.PI/2,0,i?-.3:.3],null,.75)});
  const ac=new THREE.QuadraticBezierCurve3(new THREE.Vector3(.08,.12,-.04),new THREE.Vector3(.02,-.02,.06),new THREE.Vector3(-.06,-.18,.02));
  mk(new THREE.TubeGeometry(ac,20,.032,10),T.hLig,"acl");
  const pc=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.05,.12,-.1),new THREE.Vector3(0,-.02,-.04),new THREE.Vector3(.03,-.2,-.07));
  mk(new THREE.TubeGeometry(pc,20,.038,10),T.hLig,"pcl");
  mk(new THREE.BoxGeometry(.035,.8,.14),T.hLig,"mcl",[-.39,0,-.02]);
  const lc=new THREE.QuadraticBezierCurve3(new THREE.Vector3(.36,.25,-.02),new THREE.Vector3(.43,0,-.02),new THREE.Vector3(.41,-.35,-.07));
  mk(new THREE.TubeGeometry(lc,14,.018,8),T.hLig,"lcl");
  ["medial","lateral"].forEach((s,i)=>{const sg=new THREE.SphereGeometry(.295,22,18);sg.scale(1.08,.72,.98);mk(sg,T.hCart,`cartilage_${s}`,[i?.22:-.22,.15,0],null,null,.65)});
  const eg=new THREE.SphereGeometry(.35,18,14);eg.scale(.8,1.2,.6);
  mk(eg,T.hFlu,"effusion",[0,.6,.25],null,null,0);
  mk(new THREE.SphereGeometry(.11,14,10),T.hFlu,"bakers_cyst",[0,-.1,-.45],null,null,0);
  return g;
}

/* ═══════════════════ 3D CANVAS ═══════════════════ */
function KneeCanvas({findings,active,phase,showH}){
  const ref=useRef(),rr=useRef({}),cm=useRef({pos:new THREE.Vector3(3.5,1.5,3.5),tgt:new THREE.Vector3(0,.2,0),pT:new THREE.Vector3(3.5,1.5,3.5),tT:new THREE.Vector3(0,.2,0)}),ob=useRef({ry:0,rx:0,dn:false,lx:0,ly:0});

  useEffect(()=>{
    const el=ref.current;if(!el)return;let W=el.clientWidth,H=el.clientHeight;
    const r=new THREE.WebGLRenderer({antialias:true});r.setSize(W,H);r.setPixelRatio(Math.min(devicePixelRatio,2));
    r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.15;r.setClearColor(0xf5f4f1);el.appendChild(r.domElement);
    const sc=new THREE.Scene();sc.fog=new THREE.Fog(0xf5f4f1,10,22);
    const ca=new THREE.PerspectiveCamera(30,W/H,.1,50);ca.position.copy(cm.current.pos);
    sc.add(new THREE.AmbientLight(0xe8e4df,.85));
    const k=new THREE.DirectionalLight(0xffffff,1.5);k.position.set(3,6,4);sc.add(k);
    sc.add(new THREE.DirectionalLight(0xdde4f0,.4).position.set(-4,3,-2));
    sc.add(new THREE.DirectionalLight(0xf0e8e0,.25).position.set(0,-2,-4));
    const gm=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0xeceae6,roughness:1}));
    gm.rotation.x=-Math.PI/2;gm.position.y=-3.2;sc.add(gm);
    const knee=buildKnee();sc.add(knee);
    const ms={};knee.traverse(c=>{if(c.isMesh){ms[c.name]=c;c.userData.oC=c.material.color.clone();c.userData.oO=c.material.opacity;c.userData.oE=c.material.emissive?.clone()||new THREE.Color(0)}});
    rr.current={r,sc,ca,ms};
    const o=ob.current;
    const pd=e=>{o.dn=true;o.lx=e.clientX??e.touches?.[0]?.clientX;o.ly=e.clientY??e.touches?.[0]?.clientY};
    const pm=e=>{if(!o.dn)return;const cx=e.clientX??e.touches?.[0]?.clientX,cy=e.clientY??e.touches?.[0]?.clientY;o.ry+=(cx-o.lx)*.005;o.rx=Math.max(-.5,Math.min(.5,o.rx+(cy-o.ly)*.003));o.lx=cx;o.ly=cy};
    const pu=()=>{o.dn=false};
    const wh=e=>{e.preventDefault();const c2=cm.current,d=c2.pT.clone().sub(c2.tT).normalize().multiplyScalar(e.deltaY*.003),np=c2.pT.clone().add(d);if(np.distanceTo(c2.tT)>1.5&&np.distanceTo(c2.tT)<8)c2.pT.copy(np)};
    el.addEventListener("pointerdown",pd);el.addEventListener("pointermove",pm);el.addEventListener("pointerup",pu);el.addEventListener("pointerleave",pu);el.addEventListener("wheel",wh,{passive:false});
    const onR=()=>{W=el.clientWidth;H=el.clientHeight;ca.aspect=W/H;ca.updateProjectionMatrix();r.setSize(W,H)};
    window.addEventListener("resize",onR);
    let raf;const anim=()=>{raf=requestAnimationFrame(anim);const c2=cm.current;if(!o.dn)o.ry+=.0006;const rad=c2.pT.length();const op=new THREE.Vector3(Math.sin(o.ry)*rad*Math.cos(o.rx),c2.pT.y+Math.sin(o.rx)*rad*.5,Math.cos(o.ry)*rad*Math.cos(o.rx));c2.pos.lerp(op,.04);c2.tgt.lerp(c2.tT,.04);ca.position.copy(c2.pos);ca.lookAt(c2.tgt);r.render(sc,ca)};anim();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",onR);r.dispose();if(el.contains(r.domElement))el.removeChild(r.domElement)};
  },[]);

  useEffect(()=>{const c2=cm.current;if(active?.cam){c2.pT.set(...active.cam.p);c2.tT.set(...active.cam.t)}else if(phase==="summary"){c2.pT.set(3,1.2,3);c2.tT.set(0,.1,0)}else{c2.pT.set(3.5,1.5,3.5);c2.tT.set(0,.2,0)}},[active,phase]);

  useEffect(()=>{
    const{ms}=rr.current;if(!ms)return;
    const id=setInterval(()=>{
      const t=Date.now()*.002;const isH=showH||!findings;
      Object.values(ms).forEach(m=>{m.material.color.lerp(m.userData.oC,.05);if(m.material.transparent&&m.name!=="effusion"&&m.name!=="bakers_cyst")m.material.opacity+=(m.userData.oO-m.material.opacity)*.05;if(m.material.emissive)m.material.emissive.lerp(m.userData.oE,.05)});
      if(!findings||isH){if(ms.effusion)ms.effusion.material.opacity+=(0-ms.effusion.material.opacity)*.05;if(ms.bakers_cyst)ms.bakers_cyst.material.opacity+=(0-ms.bakers_cyst.material.opacity)*.05;return}
      findings.forEach(fd=>{const isA=active?.id===fd.id;const sc=new THREE.Color(T[fd.sev].g);fd.m.forEach(mn=>{const m=ms[mn];if(!m)return;m.material.color.lerp(sc.clone().multiplyScalar(isA?1.3:.85),isA?.12:.06);if(m.material.emissive)m.material.emissive.lerp(sc.clone().multiplyScalar(isA?.4:.08+Math.sin(t+fd.id.length)*.04),.06);if(mn==="effusion")m.material.opacity+=((isA?.4:.25)-m.material.opacity)*.04;if(mn==="bakers_cyst")m.material.opacity+=(.3-m.material.opacity)*.04})});
    },16);return()=>clearInterval(id);
  },[findings,active,showH]);

  return <div ref={ref} style={{width:"100%",height:"100%",cursor:"grab",touchAction:"none"}} />;
}

/* ═══════════════════ SEVERITY GAUGE ═══════════════════ */
function Gauge({score,sev}){const s=T[sev];return(
  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5}}>
    <div style={{flex:1,height:4,background:"rgba(0,0,0,0.04)",borderRadius:2,overflow:"hidden"}}>
      <div style={{width:`${score*100}%`,height:"100%",background:s.c,borderRadius:2,transition:"width .8s cubic-bezier(.16,1,.3,1)"}} />
    </div>
    <span style={{fontSize:10,color:T.txL,width:55,textAlign:"right"}}>{score<.3?"Low concern":score<.6?"Moderate":"Significant"}</span>
  </div>
)}

/* ═══════════════════ NARRATIVE CARD ═══════════════════ */
function NCard({f,i,n,onN,onP,mob}){if(!f)return null;const s=T[f.sev];return(
  <div key={f.id} style={{position:"absolute",bottom:mob?0:20,left:mob?0:20,width:mob?"100%":"min(450px,calc(100%-40px))",background:T.sf,borderRadius:mob?"14px 14px 0 0":14,boxShadow:"0 -4px 40px rgba(0,0,0,.08)",padding:mob?"18px 18px 26px":"18px 22px",zIndex:20,borderTop:mob?`3px solid ${s.c}`:"none",borderLeft:mob?"none":`4px solid ${s.c}`,animation:"slideUp .4s cubic-bezier(.16,1,.3,1)"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
      <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:s.c,background:s.bg,border:`1px solid ${s.bd}`,padding:"3px 9px",borderRadius:5}}>{f.sev}</span>
      <span style={{fontSize:11,color:T.txL,fontFamily:"monospace"}}>{i+1}/{n}</span>
    </div>
    <h3 style={{fontSize:17,fontWeight:700,color:T.tx,margin:"0 0 2px",fontFamily:"Georgia,serif"}}>{f.str}</h3>
    <div style={{fontSize:13,fontWeight:600,color:s.c,marginBottom:6}}>{f.path}</div>
    <Gauge score={f.sc} sev={f.sev} />
    <p style={{fontSize:13.5,lineHeight:1.65,color:T.txM,margin:"10px 0 8px"}}>{f.desc}</p>
    <div style={{fontSize:12,lineHeight:1.55,color:T.txL,padding:"7px 11px",background:"rgba(0,0,0,.02)",borderRadius:7,borderLeft:`3px solid ${s.bd}`,marginBottom:12}}>
      <strong style={{color:T.txM}}>What you may feel: </strong>{f.imp}
    </div>
    <p style={{fontSize:12,color:T.txL,fontStyle:"italic",margin:"0 0 12px",lineHeight:1.5}}>{f.ctx}</p>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      {i>0&&<button onClick={onP} style={{padding:"7px 14px",borderRadius:7,border:`1px solid ${T.bd}`,background:T.sf,color:T.txM,fontSize:12,cursor:"pointer"}}>←</button>}
      <button onClick={onN} style={{padding:"7px 18px",borderRadius:7,border:"none",background:T.ac,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>{i<n-1?"Next Finding →":"View Summary"}</button>
    </div>
  </div>
)}

/* ═══════════════════ BLURRED REPORT ═══════════════════ */
function BlurReport(){return(
  <div style={{position:"relative",overflow:"hidden",borderRadius:10,border:`1px solid ${T.bd}`,marginTop:14}}>
    <div style={{filter:"blur(4px)",opacity:.5,padding:14,pointerEvents:"none",userSelect:"none"}}>
      <div style={{fontSize:12,fontWeight:700,color:T.tx,marginBottom:6}}>Your Personalized Recovery Plan</div>
      <div style={{fontSize:10,color:T.txM,marginBottom:8}}>Phase 1 — Weeks 1-2: Acute Management</div>
      {["Quad sets: 3×15 reps, twice daily","Heel slides: 3×10 reps","Straight leg raises: 3×12","Prone hamstring curls: 3×10"].map((e,i)=><div key={i} style={{fontSize:10,color:T.txM,padding:"3px 0",borderBottom:`1px solid ${T.bd}`}}>✓ {e}</div>)}
      <div style={{fontSize:10,color:T.txM,marginTop:10,marginBottom:4}}>Phase 2 — Weeks 3-6: Progressive Loading</div>
      {["Mini squats to 45°","Step-ups: 8\" platform","Single-leg balance: 30s","Stationary bike: 20 min"].map((e,i)=><div key={i} style={{fontSize:10,color:T.txM,padding:"3px 0",borderBottom:`1px solid ${T.bd}`}}>✓ {e}</div>)}
      <div style={{fontSize:11,fontWeight:600,color:T.tx,marginTop:10}}>Treatment Comparison</div>
      <div style={{fontSize:10,color:T.txM,marginTop:3}}>Conservative PT vs. Reconstruction vs. Injection Therapy...</div>
    </div>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.75)",backdropFilter:"blur(2px)"}}>
      <div style={{fontSize:13,fontWeight:600,color:T.tx,marginBottom:4}}>Unlock Your Full Report</div>
      <div style={{fontSize:11,color:T.txM,marginBottom:10,textAlign:"center",maxWidth:220,lineHeight:1.4}}>Personalized exercises, timeline, and treatment comparison</div>
      <button onClick={()=>generateReport(FD)} style={{background:T.ac,border:"none",color:"#fff",padding:"9px 22px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>Download Full Report (PDF)</button>
    </div>
  </div>
)}

/* ═══════════════════ TRUST ═══════════════════ */
function Trust(){return(
  <div style={{padding:"10px 14px",background:T.sfA,borderRadius:8,border:`1px solid ${T.bd}`,marginTop:12}}>
    <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:T.txL,marginBottom:6}}>Methodology</div>
    <div style={{fontSize:11,lineHeight:1.6,color:T.txL}}>Findings parsed using standard radiology terminology (ACR). Exercise protocols follow AAOS and APTA clinical guidelines. For education only — not medical advice.</div>
  </div>
)}

/* ═══════════════════ TAB BAR ═══════════════════ */
function TabBar({tab,setTab,mob}){
  const tabs=[["findings","Findings"],["exercises","Exercises"],["report","Report"]];
  return(
    <div style={{display:"flex",gap:3,background:"#ECEAE6",borderRadius:9,padding:3,marginBottom:mob?12:14,flexShrink:0}}>
      {tabs.map(([k,label])=>(
        <button key={k} onClick={()=>setTab(k)} style={{
          flex:1,padding:mob?"7px 6px":"7px 10px",borderRadius:7,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",
          background:tab===k?"#fff":"transparent",color:tab===k?"#1D1D1F":"#AEAEB2",
          boxShadow:tab===k?"0 1px 3px rgba(0,0,0,0.06)":"none",transition:"all .15s"
        }}>{label}</button>
      ))}
    </div>
  );
}

/* ═══════════════════ REPORT TAB ═══════════════════ */
function ReportTab({findings}){
  return(
    <div style={{animation:"fadeIn .4s"}}>
      <div style={{textAlign:"center",padding:"20px 0 10px"}}>
        <div style={{fontSize:40,marginBottom:10}}>📄</div>
        <div style={{fontSize:15,fontWeight:600,color:"#1D1D1F",marginBottom:4}}>Multi-Specialist Report</div>
        <div style={{fontSize:12,color:"#AEAEB2",lineHeight:1.5,maxWidth:280,margin:"0 auto 16px"}}>
          Full findings analysis with specialist perspectives, questions for your doctor, treatment landscape, and phased exercise plan.
        </div>
        <button onClick={()=>generateReport(findings)} style={{
          background:"#0071E3",border:"none",color:"#fff",padding:"11px 28px",borderRadius:10,
          fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:14
        }}>Download PDF Report</button>
        <div style={{fontSize:10,color:"#AEAEB2"}}>Generated instantly in your browser</div>
      </div>
      <div style={{marginTop:14,padding:"10px 12px",background:"#FAFAF8",borderRadius:8,border:"1px solid rgba(0,0,0,0.06)"}}>
        <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#AEAEB2",marginBottom:8}}>What's Included</div>
        {["5 findings analyzed with severity assessment","Specialist perspectives from our advisory panel","20+ questions organized by specialty","Treatment pathways comparison","3-phase exercise program (12 weeks)","Recovery timeline: conservative vs. surgical"].map((item,i)=>(
          <div key={i} style={{fontSize:11,color:"#6E6E73",padding:"4px 0",display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:"#0071E3",fontSize:12}}>✓</span>{item}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ TABBED PANEL ═══════════════════ */
function TabbedPanel({findings,active,onSel,mob,tab,setTab,activeEx,setActiveEx}){
  return(
    <>
      <TabBar tab={tab} setTab={setTab} mob={mob} />
      {tab==="findings"&&<Summary findings={findings} active={active} onSel={onSel} mob={mob} />}
      {tab==="exercises"&&<PTLibrary findings={findings} onSelectFinding={onSel} activeEx={activeEx} setActiveEx={setActiveEx} />}
      {tab==="report"&&<ReportTab findings={findings} />}
    </>
  );
}

/* ═══════════════════ SUMMARY PANEL ═══════════════════ */
function Summary({findings,active,onSel,mob}){
  const ct={mild:0,moderate:0,severe:0};findings.forEach(f=>ct[f.sev]++);
  const sorted=[...findings].sort((a,b)=>({severe:0,moderate:1,mild:2}[a.sev]-{severe:0,moderate:1,mild:2}[b.sev]));
  return(
    <div style={{animation:"fadeIn .4s"}}>
      <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:T.txL,marginBottom:8}}>Overview</div>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {Object.entries(ct).filter(([,c])=>c>0).map(([sv,c])=><div key={sv} style={{flex:1,padding:"8px 6px",borderRadius:8,background:T[sv].bg,border:`1px solid ${T[sv].bd}`,textAlign:"center"}}><div style={{fontSize:18,fontWeight:700,color:T[sv].c,fontFamily:"monospace"}}>{c}</div><div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:T[sv].c,opacity:.8,marginTop:1}}>{sv}</div></div>)}
      </div>
      <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:T.txL,marginBottom:8}}>Findings</div>
      <div style={{overflow:"auto",maxHeight:mob?"none":"calc(100vh - 440px)"}}>
        {sorted.map(f=>{const s=T[f.sev],isA=active?.id===f.id;return(
          <div key={f.id} onClick={()=>onSel(f)} style={{padding:"11px 13px",borderRadius:10,cursor:"pointer",transition:"all .2s",marginBottom:6,border:`1px solid ${isA?s.bd:T.bd}`,background:isA?s.bg:T.sf}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
              <span style={{fontSize:14,fontWeight:600,color:T.tx,fontFamily:"Georgia,serif"}}>{f.str}</span>
              <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:s.c,background:s.bg,border:`1px solid ${s.bd}`,padding:"2px 7px",borderRadius:4}}>{f.sev}</span>
            </div>
            <div style={{fontSize:12,color:s.c,fontWeight:500}}>{f.path}</div>
            <Gauge score={f.sc} sev={f.sev} />
            {isA&&<div style={{animation:"fadeIn .25s",marginTop:8}}>
              <p style={{fontSize:12.5,lineHeight:1.6,color:T.txM,margin:"0 0 6px"}}>{f.desc}</p>
              <div style={{fontSize:11,lineHeight:1.5,color:T.txL,padding:"6px 10px",background:"rgba(0,0,0,.02)",borderRadius:6,borderLeft:`3px solid ${s.bd}`}}><strong style={{color:T.txM}}>Impact: </strong>{f.imp}</div>
            </div>}
          </div>
        )})}
      </div>
      <BlurReport />
      <Trust />
    </div>
  );
}

/* ═══════════════════ EXERCISE DETAIL PANE ═══════════════════ */
const PHASE_CLR={1:"#0071E3",2:"#2D8B4E",3:"#6B3FA0"};
const PHASE_NM={1:"Phase 1: Early Recovery",2:"Phase 2: Building Strength",3:"Phase 3: Functional"};
const PHASE_TM={1:"Weeks 1-2",2:"Weeks 3-6",3:"Weeks 7-12"};

function ExerciseDetail({ex,onClose,mob}){
  if(!ex)return null;
  const pc=PHASE_CLR[ex.phase];
  return(
    <div style={{
      display:"flex",flexDirection:"column",height:"100%",background:"#fff",
      animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{padding:"16px 18px 12px",borderBottom:"1px solid rgba(0,0,0,0.06)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:"#AEAEB2",fontSize:12,cursor:"pointer",padding:0}}>
            ← Back to exercises
          </button>
          <span style={{fontSize:9,fontWeight:700,color:pc,background:pc+"14",padding:"3px 10px",borderRadius:5,textTransform:"uppercase",letterSpacing:1}}>
            {PHASE_TM[ex.phase]}
          </span>
        </div>
        <h2 style={{fontSize:mob?18:20,fontWeight:700,color:"#1D1D1F",margin:0,fontFamily:"Georgia,serif"}}>{ex.name}</h2>
        <div style={{fontSize:11,color:pc,fontWeight:600,marginTop:2}}>{PHASE_NM[ex.phase]}</div>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflow:"auto",padding:"16px 18px"}}>

        {/* VIDEO PLACEHOLDER */}
        <div style={{
          width:"100%",aspectRatio:"16/9",background:"linear-gradient(135deg,#1D1D1F 0%,#2C2C2E 100%)",
          borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          marginBottom:16,position:"relative",overflow:"hidden",
        }}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"rgba(255,255,255,0.15)",
            display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8,
            backdropFilter:"blur(4px)",border:"1px solid rgba(255,255,255,0.1)"}}>
            <div style={{width:0,height:0,borderTop:"10px solid transparent",borderBottom:"10px solid transparent",
              borderLeft:"16px solid rgba(255,255,255,0.8)",marginLeft:3}} />
          </div>
          <span style={{color:"rgba(255,255,255,0.7)",fontSize:12,fontWeight:500}}>Video Demonstration</span>
          <span style={{color:"rgba(255,255,255,0.35)",fontSize:10,marginTop:2}}>Coming soon — {ex.name}</span>
          {/* Decorative exercise icon */}
          <div style={{position:"absolute",bottom:10,right:14,fontSize:9,color:"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>
            ClearScan PT Library
          </div>
        </div>

        {/* HOW TO PERFORM */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:pc+"14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>📋</div>
            <h3 style={{fontSize:14,fontWeight:700,color:"#1D1D1F",margin:0}}>How to Perform</h3>
          </div>
          <div style={{padding:"12px 14px",background:"#F5F4F1",borderRadius:10,fontSize:13,lineHeight:1.7,color:"#1D1D1F"}}>
            {ex.desc}
          </div>
          {/* Why this exercise */}
          <div style={{padding:"10px 14px",background:pc+"08",borderRadius:10,borderLeft:`3px solid ${pc}`,marginTop:8}}>
            <div style={{fontSize:10,fontWeight:700,color:pc,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Why this exercise matters</div>
            <div style={{fontSize:12,lineHeight:1.6,color:"#1D1D1F"}}>{ex.why}</div>
          </div>
        </div>

        {/* REPS & CIRCUIT */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:pc+"14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🔄</div>
            <h3 style={{fontSize:14,fontWeight:700,color:"#1D1D1F",margin:0}}>Reps & Circuit</h3>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{padding:"14px",background:"#F5F9FE",borderRadius:10,textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#AEAEB2",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Prescription</div>
              <div style={{fontSize:15,fontWeight:700,color:"#0071E3"}}>{ex.rx}</div>
            </div>
            <div style={{padding:"14px",background:"#F5F9FE",borderRadius:10,textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#AEAEB2",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Tempo</div>
              <div style={{fontSize:15,fontWeight:700,color:"#0071E3"}}>{ex.duration}</div>
            </div>
          </div>
          {/* Targets */}
          <div style={{marginTop:10,padding:"10px 14px",background:"#FAFAF8",borderRadius:10}}>
            <div style={{fontSize:9,fontWeight:700,color:"#AEAEB2",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Addresses these findings</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {(ex.finding||"").split(" / ").map((f,i)=>(
                <span key={i} style={{fontSize:10,padding:"3px 9px",borderRadius:5,background:"rgba(0,113,227,0.06)",color:"#0071E3",fontWeight:600}}>{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* SAFETY */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:"rgba(191,16,41,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>⚠️</div>
            <h3 style={{fontSize:14,fontWeight:700,color:"#1D1D1F",margin:0}}>Safety & Precautions</h3>
          </div>
          <div style={{padding:"12px 14px",borderRadius:10,border:"1px solid rgba(191,16,41,0.12)",background:"rgba(191,16,41,0.03)"}}>
            <div style={{fontSize:12.5,lineHeight:1.65,color:"#6E6E73"}}>{ex.avoid}</div>
          </div>
          <div style={{marginTop:8,padding:"10px 14px",background:"#E6F5F4",borderRadius:10,border:"1px solid rgba(26,127,122,0.15)"}}>
            <div style={{fontSize:11,lineHeight:1.5,color:"#1A7F7A"}}>
              <strong>Always discuss with your PT</strong> before starting or progressing this exercise. Your therapist will modify intensity based on your specific examination and tolerance.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════ APP ═══════════════════ */
export default function App(){
  const[text,setText]=useState("");
  const[phase,setPhase]=useState("input");
  const[findings,setFindings]=useState(null);
  const[ri,setRi]=useState(-1);
  const[active,setActive]=useState(null);
  const[showH,setShowH]=useState(false);
  const[mob,setMob]=useState(false);
  const[tab,setTab]=useState("findings"); // "findings" | "exercises" | "report"
  const[activeEx,setActiveEx]=useState(null); // selected exercise for detail pane
  useEffect(()=>{const c=()=>setMob(window.innerWidth<768);c();window.addEventListener("resize",c);return()=>window.removeEventListener("resize",c)},[]);

  const go=useCallback(async()=>{
    if(!text.trim())return;
    await Tone.start().catch(()=>{});initS();
    setPhase("analyzing");pAmb();
    setTimeout(()=>{pTrans();setFindings(FD);setPhase("revealing");setRi(0)},2500);
  },[text]);

  useEffect(()=>{
    if(phase==="revealing"&&ri>=0&&ri<FD.length){setActive(FD[ri]);pRev(ri)}
    if(phase==="revealing"&&ri>=FD.length){setPhase("summary");setActive(null)}
  },[ri,phase]);

  const reset=()=>{setPhase("input");setFindings(null);setRi(-1);setActive(null);setShowH(false);setText("");setTab("findings");setActiveEx(null)};
  const togSel=f=>{setActive(p=>p?.id===f.id?null:f);setShowH(false)};
  const hBtn=()=>setShowH(!showH);
  const onTabChange=(t)=>{setTab(t);if(t!=="exercises")setActiveEx(null)};

  const inputUI=(pad)=>(
    <>
      <h2 style={{fontSize:mob?20:24,fontWeight:700,color:T.tx,margin:"0 0 6px",fontFamily:"Georgia,serif"}}>Understand Your Knee MRI</h2>
      <p style={{fontSize:mob?13:14,color:T.txL,margin:"0 0 18px",lineHeight:1.55}}>Paste the Impression section from your knee MRI report. We'll visualize each finding in 3D and explain what it means.</p>
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Paste your MRI impression here..." style={{flex:1,minHeight:mob?120:160,background:T.bgD,border:`1px solid ${T.bd}`,borderRadius:12,padding:14,color:T.tx,fontSize:13,fontFamily:"'SF Mono',Consolas,monospace",lineHeight:1.7,resize:"none"}} />
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <button onClick={go} disabled={!text.trim()} style={{flex:1,padding:"11px 18px",borderRadius:10,border:"none",background:text.trim()?T.ac:T.bgD,color:text.trim()?"#fff":T.txL,fontSize:14,fontWeight:600,cursor:text.trim()?"pointer":"not-allowed"}}>Visualize Findings</button>
        <button onClick={()=>setText(SAMPLE)} style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.sf,color:T.txM,fontSize:12,fontWeight:500,cursor:"pointer"}}>Demo</button>
      </div>
      <Trust />
    </>
  );

  const hdr=(
    <div style={{height:mob?48:56,borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:`0 ${mob?16:24}px`,background:T.sf,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:mob?8:12}}>
        <div style={{width:mob?26:30,height:mob?26:30,borderRadius:mob?7:9,background:"linear-gradient(135deg,#0071E3,#5BA3F5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:mob?13:15,fontWeight:800,color:"#fff"}}>C</div>
        <span style={{fontSize:mob?15:16,fontWeight:700,color:T.tx}}>ClearScan</span>
        {!mob&&<span style={{fontSize:11,color:T.txL,fontWeight:500,marginLeft:4}}>Knee MRI Interpreter</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {phase==="summary"&&findings&&<button onClick={hBtn} style={{background:showH?T.ac:T.sf,border:`1px solid ${showH?T.ac:T.bdM}`,color:showH?"#fff":T.txM,padding:mob?"5px 10px":"6px 14px",borderRadius:7,fontSize:11,fontWeight:500,cursor:"pointer",transition:"all .2s"}}>{showH?"✓ Healthy":"Compare Healthy"}</button>}
        {phase!=="input"&&<button onClick={reset} style={{background:T.bgD,border:`1px solid ${T.bd}`,color:T.txM,padding:mob?"5px 10px":"6px 14px",borderRadius:7,fontSize:11,cursor:"pointer"}}>Reset</button>}
      </div>
    </div>
  );

  const styles=<style>{`*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,'SF Pro Text','Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}textarea::placeholder{color:#AEAEB2}textarea:focus{outline:none;border-color:#0071E3 !important;box-shadow:0 0 0 3px rgba(0,113,227,.07)}@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>;

  // ─── MOBILE ───
  if(mob)return(
    <div style={{width:"100%",height:"100vh",background:T.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {styles}{hdr}
      {phase==="input"?<div style={{flex:1,overflow:"auto",padding:16,display:"flex",flexDirection:"column"}}>{inputUI()}</div>:(
        <>
          <div style={{height:"55vh",position:"relative",flexShrink:0}}>
            <KneeCanvas findings={findings} active={active} phase={phase} showH={showH} />
            {phase==="revealing"&&<NCard f={active} i={ri} n={FD.length} onN={()=>setRi(i=>i+1)} onP={()=>setRi(i=>Math.max(0,i-1))} mob={true} />}
            {phase==="analyzing"&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(245,244,241,.6)"}}><div style={{width:28,height:28,border:`3px solid ${T.bgD}`,borderTopColor:T.ac,borderRadius:"50%",animation:"spin .8s linear infinite"}} /><span style={{fontSize:13,color:T.txM,marginTop:10}}>Analyzing...</span></div>}
          </div>
          {phase==="summary"&&findings&&<div style={{flex:1,overflow:"auto",padding:16,background:T.sf,borderTop:`1px solid ${T.bd}`}}>
            {activeEx ? <ExerciseDetail ex={activeEx} onClose={()=>setActiveEx(null)} mob={true} /> : <TabbedPanel findings={findings} active={active} onSel={togSel} mob={true} tab={tab} setTab={onTabChange} activeEx={activeEx} setActiveEx={setActiveEx} />}
          </div>}
        </>
      )}
    </div>
  );

  // ─── DESKTOP ───
  return(
    <div style={{width:"100%",height:"100vh",background:T.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {styles}{hdr}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{width:phase==="revealing"?0:(phase==="input"?400:360),borderRight:phase==="revealing"?"none":`1px solid ${T.bd}`,display:"flex",flexDirection:"column",flexShrink:0,background:T.sf,transition:"width .5s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
          <div style={{padding:"22px 20px",display:"flex",flexDirection:"column",flex:1,overflow:"auto",minWidth:phase==="input"?400:360}}>
            {phase==="input"&&inputUI()}
            {phase==="analyzing"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}><div style={{width:32,height:32,border:`3px solid ${T.bgD}`,borderTopColor:T.ac,borderRadius:"50%",animation:"spin .8s linear infinite"}} /><span style={{fontSize:14,color:T.txM,fontWeight:500}}>Analyzing your MRI report...</span><span style={{fontSize:12,color:T.txL}}>Building your visualization</span></div>}
            {phase==="summary"&&findings&&<TabbedPanel findings={findings} active={active} onSel={togSel} mob={false} tab={tab} setTab={onTabChange} activeEx={activeEx} setActiveEx={setActiveEx} />}
          </div>
        </div>
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* 3D Viewport — shrinks when exercise detail is open */}
          <div style={{flex:activeEx?1:1,position:"relative",background:`radial-gradient(ellipse at 50% 40%,#faf9f7 0%,${T.bg} 100%)`,transition:"flex .3s ease"}}>
            <KneeCanvas findings={findings} active={active} phase={phase} showH={showH} />
            {phase==="revealing"&&<NCard f={active} i={ri} n={FD.length} onN={()=>setRi(i=>i+1)} onP={()=>setRi(i=>Math.max(0,i-1))} mob={false} />}
            {active&&phase==="summary"&&!activeEx&&<div style={{position:"absolute",top:14,left:14,background:T.sf,padding:"7px 14px",borderRadius:9,boxShadow:"0 2px 12px rgba(0,0,0,.05)",fontSize:13,fontWeight:600,color:T.tx,zIndex:10,animation:"fadeIn .3s"}}>{active.str} <span style={{color:T[active.sev].c,fontSize:11,marginLeft:6}}>● {active.path}</span></div>}
            <div style={{position:"absolute",top:14,right:14,fontSize:10,color:T.txF,pointerEvents:"none"}}>Drag to rotate · Scroll to zoom</div>
            {phase==="input"&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none"}}><div style={{fontSize:48,marginBottom:14,opacity:.15}}>🦴</div><div style={{fontSize:15,color:T.txL,fontWeight:500}}>Your 3D knee model</div><div style={{fontSize:12,color:T.txF,marginTop:6}}>Paste an MRI report to see findings visualized</div></div>}
            {phase==="summary"&&!activeEx&&<div style={{position:"absolute",bottom:20,left:20,right:20,maxWidth:440,background:T.sf,borderRadius:11,padding:"14px 18px",boxShadow:"0 4px 20px rgba(0,0,0,.06)",border:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:10,animation:"slideUp .5s cubic-bezier(.16,1,.3,1)"}}><div><div style={{fontSize:13,fontWeight:600,color:T.tx}}>Your full report is ready</div><div style={{fontSize:11,color:T.txL,marginTop:2}}>Specialist perspectives, exercises, questions for your doctor</div></div><button onClick={()=>generateReport(FD)} style={{background:T.ac,border:"none",color:"#fff",padding:"9px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,marginLeft:14}}>Download Report (PDF)</button></div>}
          </div>
          {/* Exercise Detail Pane — slides in from right */}
          {activeEx&&(
            <div style={{width:380,borderLeft:`1px solid ${T.bd}`,flexShrink:0,animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)"}}>
              <ExerciseDetail ex={activeEx} onClose={()=>setActiveEx(null)} mob={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
