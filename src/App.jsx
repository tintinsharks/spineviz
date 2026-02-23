import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import * as Tone from "tone";
import { generateReport } from "./reportGenerator";
import PTLibrary from "./PTLibrary";
import { extractFindings, dedupeFindings } from "./kneeNLP";
import { mapToVisualization } from "./kneeContentLibrary";

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

const DEMO_FD=[
  {id:"men",str:"Medial Meniscus",path:"Horizontal Tear",sev:"moderate",m:["meniscus_medial"],
    desc:"A horizontal cleavage tear in the posterior horn of your medial meniscus — the C-shaped shock absorber on the inner side of your knee.",
    imp:"Pain along the inner knee line, especially with deep squats, twisting, or stair climbing. Possible catching or locking.",
    ctx:"Horizontal meniscal tears are among the most common knee findings. Many respond well to physical therapy without surgery.",
    sc:.5,cam:{p:[1.8,.3,2.2],t:[0,-.1,0]},
    lenses:[
      {spec:"Sports Medicine Ortho",color:"#0071E3",text:"Horizontal tears are often degenerative and many can be managed conservatively. If ACL reconstruction is pursued, the meniscus is typically evaluated during the same procedure. The key question is whether this tear is stable or unstable."},
      {spec:"Physical Therapy",color:"#1A7F7A",text:"For conservative management, targeted strengthening of quadriceps and hip musculature reduces mechanical load through the medial compartment. Avoid deep squatting and pivoting until cleared."},
      {spec:"Trauma Ortho",color:"#C45D00",text:"The posterior horn location is important. Options range from partial meniscectomy (trimming) to meniscal repair (suturing). Repair is preferred when feasible, as preserving meniscal tissue protects the joint long-term."},
    ],
    questions:["Is my meniscal tear contributing to symptoms, or could it be managed conservatively?","If you operate on the ACL, will you also address the meniscus?","Would you repair or trim, and what's the difference in recovery?","How does meniscus repair change the rehabilitation timeline?"],
    timeline:"Conservative: 3-6 weeks to return to most activities. Post-repair: 4-6 weeks restricted weight-bearing, 3-4 months full recovery.",
    selfAssess:[
      {q:"Do you experience clicking, popping, or a snapping sensation in the knee?",why:"Mechanical symptoms suggest an unstable fragment that may flip or catch — this often changes the treatment approach from conservative to surgical."},
      {q:"Does your knee ever lock — get stuck in a position where you can't fully straighten it?",why:"True locking (not just stiffness) indicates a displaced meniscal fragment blocking the joint. This is an important distinction your surgeon needs to know."},
      {q:"Do you feel catching or something \"getting in the way\" when bending or straightening?",why:"Catching suggests the torn portion is intermittently interfering with joint mechanics, which may indicate an unstable tear."},
      {q:"Where exactly is your pain — can you point to the spot with one finger?",why:"Pain precisely on the medial joint line supports the meniscus as a pain generator. Diffuse pain suggests other sources may be contributing."},
      {q:"Is the pain worse going downstairs versus upstairs?",why:"Downstairs loads the meniscus more due to compressive and shear forces during eccentric quad loading. This pattern is classic for meniscal pain."},
      {q:"Does deep squatting — like sitting on your heels — reproduce the pain?",why:"Deep flexion compresses the posterior horn where your tear is located. If this is pain-free, the tear may be less clinically significant."},
    ],
    treatments:[
      {name:"Physical Therapy (Conservative)",type:"conservative",color:"#2D8B4E",
        desc:"Structured strengthening of quadriceps, hamstrings, and hip stabilizers to reduce mechanical load through the meniscus. Avoidance of deep flexion and pivoting during initial phase.",
        timeline:"4-8 weeks to see meaningful improvement. Many horizontal tears become asymptomatic with rehab alone.",
        pros:"No surgery, no recovery downtime, low risk. Effective for many horizontal/degenerative tears.",
        cons:"May not resolve mechanical symptoms (catching/locking). Tear remains present on imaging."},
      {name:"Partial Meniscectomy (Trimming)",type:"surgical",color:"#0071E3",
        desc:"Arthroscopic removal of the torn, unstable portion of the meniscus. Quick outpatient procedure (~30-45 minutes). Often done during ACL reconstruction if planned.",
        timeline:"Return to most activities in 2-4 weeks. Rehab is faster than meniscal repair.",
        pros:"Fast recovery, immediate relief of mechanical symptoms. Can be done during ACL reconstruction.",
        cons:"Removes protective tissue — long-term, less meniscus means more cartilage wear. Irreversible."},
      {name:"Meniscal Repair (Suturing)",type:"surgical",color:"#6B3FA0",
        desc:"Arthroscopic suturing of the tear to preserve meniscal tissue. Repairability depends on tear location, pattern, and blood supply. Best outcomes when combined with ACL reconstruction.",
        timeline:"4-6 weeks restricted weight-bearing. Full recovery 3-4 months. Slower than meniscectomy.",
        pros:"Preserves meniscal tissue, protects cartilage long-term. 80-90% healing rate with concurrent ACL reconstruction.",
        cons:"Slower rehab, weight-bearing restrictions early on. Not all tears are repairable — surgeon assesses at time of arthroscopy."},
      {name:"Corticosteroid Injection",type:"interventional",color:"#C45D00",
        desc:"Intra-articular injection to reduce inflammation and pain, facilitating earlier participation in physical therapy.",
        timeline:"Relief within 2-5 days. Effects typically last 4-8 weeks.",
        pros:"Can break the pain/swelling cycle. Allows rehab progression. No recovery time.",
        cons:"Temporary effect. Repeated injections may affect cartilage health. Discuss timing relative to any planned surgery."},
    ],
  },
  {id:"acl",str:"ACL",path:"Complete Tear",sev:"severe",m:["acl"],
    desc:"Your anterior cruciate ligament is completely torn — the primary stabilizer preventing your shin bone from sliding forward.",
    imp:"Instability during cutting, pivoting, or sudden stops. Walking and cycling typically unaffected.",
    ctx:"About 200,000 ACL injuries occur annually in the US. Treatment depends on your activity goals — many return to full activity with structured rehabilitation.",
    sc:.85,cam:{p:[1.5,.2,2.5],t:[0,0,0]},
    lenses:[
      {spec:"Sports Medicine Ortho",color:"#0071E3",text:"The decision between surgical reconstruction and conservative management depends heavily on your activity goals. For patients wanting to return to cutting/pivoting sports, reconstruction is generally recommended. For straight-line activities, structured PT may restore functional stability without surgery."},
      {spec:"Pain Medicine",color:"#6B3FA0",text:"The ACL itself is often not the primary pain generator after the acute phase. Much of the ongoing pain may come from associated bone bruising, effusion, and altered biomechanics. If pain persists beyond expectations, there may be interventional options worth discussing."},
      {spec:"Physiatry / Rehab",color:"#2D8B4E",text:"Regardless of whether surgery is pursued, early rehabilitation focusing on quad activation, ROM restoration, and swelling control is universally recommended. \"Prehab\" before surgery is associated with better post-operative outcomes."},
    ],
    questions:["Based on my age and activity level, would you recommend reconstruction or PT?","If I pursue PT first, what signs would tell us surgery is needed?","What graft type would you recommend, and why?","What is the realistic timeline for returning to my specific activities?","Are there factors in my MRI that make my case more complex than typical?"],
    timeline:"Conservative: 3-6 months structured PT. Surgical: 6-9 months total recovery, return to sport 9-12 months.",
    selfAssess:[
      {q:"Does your knee feel like it's going to \"give way\" or buckle — especially when pivoting, turning, or stepping off a curb?",why:"Functional instability is the primary indication for ACL reconstruction. Patients who experience frequent giving-way episodes are more likely to benefit from surgery."},
      {q:"Did you hear or feel a \"pop\" at the time of injury?",why:"An audible pop at injury is reported in ~70% of ACL tears and helps confirm the diagnosis. Share this with your surgeon — it's part of the clinical picture."},
      {q:"What activities and sports are important to you? Do you play sports that involve cutting, pivoting, or jumping?",why:"Your activity goals are the single most important factor in the reconstruction vs. conservative decision. Cutting/pivoting sports (basketball, soccer, skiing) generally favor surgical repair."},
      {q:"Have you had any episodes where the knee gave out and then swelled up significantly afterward?",why:"Recurrent giving-way episodes with re-swelling suggest ongoing joint damage from instability — this shifts the balance toward surgical reconstruction."},
      {q:"Can you walk without limping? Can you go up and down stairs comfortably?",why:"Good functional baseline walking and stair ability suggest the surrounding muscles are compensating well, which is important for either treatment path."},
      {q:"Do you feel confident pushing off the injured leg to change direction quickly?",why:"This tests your subjective sense of knee trust. If you instinctively don't trust the knee during quick movements, that's clinically meaningful instability."},
    ],
    treatments:[
      {name:"Structured Physical Therapy (Conservative)",type:"conservative",color:"#2D8B4E",
        desc:"Intensive rehabilitation focusing on quadriceps/hamstring strengthening, proprioception training, and neuromuscular control. Goal is to build enough dynamic stability to compensate for the absent ACL.",
        timeline:"3-6 months structured program. Re-evaluation at 6-12 weeks for stability assessment.",
        pros:"Avoids surgery and surgical risks. Many patients achieve functional stability. Can always proceed to surgery later if needed.",
        cons:"Does not restore anatomic ACL. Higher risk of re-injury with cutting/pivoting sports. Requires excellent rehab compliance."},
      {name:"ACL Reconstruction — Patellar Tendon Graft",type:"surgical",color:"#0071E3",
        desc:"Bone-patellar tendon-bone autograft. Considered the \"gold standard\" for athletes. Harvests the central third of your patellar tendon with bone plugs for rigid fixation.",
        timeline:"6-9 months total recovery. Return to sport typically 9-12 months with clearance testing.",
        pros:"Strongest initial fixation (bone-to-bone healing). Lowest re-tear rate in high-level athletes. Most studied graft option.",
        cons:"Anterior knee pain and kneeling discomfort in 10-20% of patients. Donor site morbidity."},
      {name:"ACL Reconstruction — Hamstring Graft",type:"surgical",color:"#0071E3",
        desc:"Semitendinosus and gracilis tendons harvested from the same leg. Smaller incision, less anterior knee pain than patellar tendon graft.",
        timeline:"Similar to patellar tendon — 6-9 months recovery.",
        pros:"Less kneeling pain. Smaller incision. Good option for non-contact sports and recreational athletes.",
        cons:"Soft tissue-to-bone healing (slower integration). Slight hamstring weakness may persist. Slightly higher re-tear rate in some studies."},
      {name:"ACL Reconstruction — Quadriceps Tendon Graft",type:"surgical",color:"#0071E3",
        desc:"Increasingly popular option using a strip of the quadriceps tendon. Combines advantages of both patellar and hamstring grafts.",
        timeline:"6-9 months recovery, similar protocol to other grafts.",
        pros:"Strong graft with bone plug. Less kneeling pain than patellar tendon. Thicker graft tissue.",
        cons:"Newer technique — less long-term outcome data. Temporary quad weakness during recovery."},
      {name:"Prehabilitation (Before Surgery)",type:"conservative",color:"#1A7F7A",
        desc:"Structured PT program done before reconstruction to optimize quad strength, reduce swelling, and restore full ROM. Evidence shows prehab improves post-surgical outcomes.",
        timeline:"2-6 weeks before surgery. Goal: full extension, minimal swelling, good quad activation.",
        pros:"Better post-surgical outcomes. Faster early rehab milestones. Reduces post-op complications.",
        cons:"Delays surgery by a few weeks (this is generally considered beneficial, not a true drawback)."},
    ],
  },
  {id:"bone",str:"Bone",path:"Bone Bruise",sev:"mild",m:["condyle_lateral","tibial_plateau"],
    desc:"Bone marrow edema in your lateral femoral condyle and posterolateral tibial plateau — a very common companion finding with ACL tears.",
    imp:"Deep, aching pain that gradually fades over 6-12 weeks. No specific treatment required.",
    ctx:"Present in over 80% of acute ACL injuries. The bruise pattern confirms the mechanism. Resolves on its own within 2-3 months.",
    sc:.2,cam:{p:[2,.8,1.5],t:[0,.2,0]},
    lenses:[
      {spec:"Trauma Ortho",color:"#C45D00",text:"This bruise pattern is seen in the vast majority of acute ACL injuries and provides diagnostic confirmation of the injury mechanism. It does not require specific treatment and resolves on its own within 2-3 months."},
      {spec:"Pain Medicine",color:"#6B3FA0",text:"Bone bruises can be a significant pain source in the early weeks. If pain is disproportionate to expectations, your physician can discuss whether protective weight-bearing modifications or anti-inflammatory strategies would help."},
    ],
    questions:["Is this bruise pattern typical for my type of injury?","Will this affect the surgical plan or timing?","Do I need to limit weight-bearing because of the bone bruise?"],
    timeline:"Typically resolves in 2-3 months without specific treatment. Pain usually improves significantly within 4-6 weeks.",
    selfAssess:[
      {q:"When you press on the outer side of your knee, does it reproduce a deep aching pain?",why:"Point tenderness directly over the bruise location confirms it as an active pain source. If pressing there doesn't hurt, the bruise may not be contributing much to your symptoms."},
      {q:"Is weight-bearing more painful than expected given your other injuries?",why:"Disproportionate pain with weight-bearing suggests the bone bruise is a significant contributor and may warrant temporary use of crutches or a brace."},
      {q:"Is the pain improving week over week, even slowly?",why:"Bone bruises should show gradual linear improvement. If pain plateaus or worsens, it's important to share that with your physician."},
    ],
    treatments:[
      {name:"Activity Modification + Time",type:"conservative",color:"#2D8B4E",
        desc:"The primary treatment is tincture of time. Avoid high-impact activities that load the bruised area. Weight-bearing as tolerated with progression as pain allows.",
        timeline:"Significant improvement within 4-6 weeks. Full resolution typically 2-3 months.",
        pros:"No intervention required. Heals reliably on its own.",
        cons:"Can be a significant pain source in early weeks. May slow early rehab progression."},
      {name:"Protected Weight-Bearing",type:"conservative",color:"#1A7F7A",
        desc:"Crutches or a hinged brace to offload the bruised bone during the most painful early period. Typically only needed for 1-2 weeks.",
        timeline:"1-2 weeks of crutch use, then progressive loading.",
        pros:"Reduces pain, allows more comfortable early rehab participation.",
        cons:"Prolonged crutch use can cause deconditioning. Usually only needed briefly."},
      {name:"Anti-Inflammatory Protocol",type:"interventional",color:"#C45D00",
        desc:"NSAIDs (ibuprofen, naproxen) for 1-2 weeks to manage pain and inflammation from the bone bruise. Discuss with your physician regarding timing relative to healing.",
        timeline:"Short-term use during the acute phase (1-2 weeks).",
        pros:"Effective pain control, allows earlier rehab engagement.",
        cons:"Some evidence suggests NSAIDs may slow bone healing. Discuss risks and benefits with your physician."},
    ],
  },
  {id:"eff",str:"Joint Fluid",path:"Moderate Effusion",sev:"moderate",m:["effusion"],
    desc:"Moderate excess fluid in your knee joint — your body's inflammatory response to the internal injuries.",
    imp:"Stiffness, tightness, difficulty fully bending or straightening. May feel warm and puffy.",
    ctx:"Expected after acute injury. Improves with RICE (rest, ice, compression, elevation) over 2-4 weeks.",
    sc:.45,cam:{p:[2.5,1.5,1.5],t:[0,.5,0]},
    lenses:[
      {spec:"Physiatry / Rehab",color:"#2D8B4E",text:"Reducing effusion is the most important early goal because swelling directly inhibits quad activation (arthrogenic muscle inhibition). RICE protocol and gentle ROM exercises are first-line."},
      {spec:"Pain Medicine",color:"#6B3FA0",text:"If effusion persists beyond 4-6 weeks despite conservative measures, aspiration with or without corticosteroid injection may be considered to break the inflammatory cycle and facilitate rehab."},
    ],
    questions:["Should the fluid be drained (aspirated)?","What's normal swelling vs. concerning swelling at this stage?","How will effusion affect my rehabilitation timeline?"],
    timeline:"Acute effusion typically resolves in 2-4 weeks with RICE. Persistent effusion beyond 6 weeks may warrant aspiration.",
    selfAssess:[
      {q:"Is the swelling getting better, staying the same, or getting worse over the past week?",why:"The trajectory matters more than the amount. Improving swelling suggests the inflammatory process is resolving normally. Worsening or static swelling may need intervention."},
      {q:"Can you fully straighten your knee? Can you bend it to at least 90 degrees?",why:"Loss of full extension (straightening) is more concerning than loss of flexion. If you can't fully straighten, the effusion may be significant enough to inhibit rehab progress."},
      {q:"Does the knee feel warm to the touch compared to the other side?",why:"Warmth indicates active inflammation. Persistent warmth beyond 2-3 weeks, especially with increasing swelling, should be reported to your physician."},
      {q:"Does the swelling increase after activity and then decrease with rest?",why:"Activity-related swelling that resolves with rest is mechanical (expected). Swelling that persists regardless of activity level may indicate ongoing inflammation needing attention."},
    ],
    treatments:[
      {name:"RICE Protocol",type:"conservative",color:"#2D8B4E",
        desc:"Rest, Ice (20 min 4-6x/day), Compression (ace wrap or sleeve), Elevation (above heart level). The foundation of acute effusion management.",
        timeline:"Noticeable improvement within 3-7 days. Most acute effusion resolves in 2-4 weeks.",
        pros:"No risk, no cost, highly effective for acute effusion. Can start immediately.",
        cons:"Requires discipline and consistency. May not resolve chronic or recurrent effusion."},
      {name:"Aspiration (Joint Drainage)",type:"interventional",color:"#C45D00",
        desc:"Your physician uses a needle to remove excess fluid from the joint. Provides immediate relief and allows fluid analysis to rule out infection or other causes.",
        timeline:"Immediate relief. May need to be repeated if fluid reaccumulates.",
        pros:"Instant reduction in pressure and stiffness. Allows quad activation to resume. Fluid can be analyzed diagnostically.",
        cons:"Minor procedure discomfort. Fluid may reaccumulate if the underlying cause persists. Small infection risk."},
      {name:"Corticosteroid Injection",type:"interventional",color:"#6B3FA0",
        desc:"Often combined with aspiration — after draining the fluid, a corticosteroid is injected into the joint to reduce inflammation and prevent rapid reaccumulation.",
        timeline:"Anti-inflammatory effect peaks at 2-5 days. Can last 4-8 weeks.",
        pros:"Breaks the inflammatory cycle. Reduces reaccumulation risk compared to aspiration alone.",
        cons:"Repeated steroid injections may affect cartilage health. Discuss timing if surgery is planned (surgeons often prefer 6-8 weeks between injection and surgery)."},
      {name:"Compression Sleeve",type:"conservative",color:"#1A7F7A",
        desc:"Medical-grade compression knee sleeve worn during daily activities and exercise. Provides continuous gentle compression to manage swelling.",
        timeline:"Ongoing use during acute phase and rehab.",
        pros:"Simple, low-cost, can be worn during PT exercises. Provides proprioceptive feedback.",
        cons:"Does not treat the cause. Ensure proper sizing — too tight restricts circulation."},
    ],
  },
  {id:"cart",str:"Articular Cartilage",path:"Grade 2 Chondromalacia",sev:"mild",m:["cartilage_medial"],
    desc:"The smooth cartilage on the inner surface of your thigh bone shows softening and early wear — Grade 2 on a 4-point scale.",
    imp:"Occasional dull ache with prolonged sitting or weight-bearing. Mild grinding sensation possible.",
    ctx:"Very common and frequently incidental. Quadriceps strengthening is the most effective conservative treatment.",
    sc:.25,cam:{p:[2,-.2,2],t:[0,-.1,0]},
    lenses:[
      {spec:"Pain Medicine",color:"#6B3FA0",text:"Grade 2 cartilage changes are found on a very large proportion of knee MRIs in adults over 30, often with no symptoms at all. This finding may be incidental — present before your injury and not contributing to your current symptoms. Discuss with your physician."},
      {spec:"Physical Therapy",color:"#1A7F7A",text:"The strongest evidence for managing early cartilage changes is quadriceps and gluteal strengthening, which reduces compressive load through the medial compartment. Low-impact activities like cycling and swimming are well-tolerated."},
    ],
    questions:["Is this cartilage finding likely causing my pain, or is it incidental?","Will this get worse over time?","Are there any injections (PRP, viscosupplementation) worth considering?","Should I change my exercise habits long-term to protect the cartilage?"],
    timeline:"Grade 2 changes are typically managed long-term with strength maintenance. Not expected to progress rapidly with appropriate exercise.",
    selfAssess:[
      {q:"Did you have inner knee pain or grinding before this injury, or is this entirely new?",why:"Pre-existing symptoms suggest the cartilage finding was already symptomatic. If this is entirely new pain, the cartilage change is more likely incidental and the acute injuries are the primary pain sources."},
      {q:"Do you feel or hear grinding (crepitus) when bending your knee through its range of motion?",why:"Crepitus with Grade 2 changes is common and usually not dangerous, but it helps your physician gauge how symptomatic the cartilage surface is for you specifically."},
      {q:"Is there pain when sitting for long periods with the knee bent (\"movie theater sign\")?",why:"Anterior knee pain after prolonged sitting is a classic sign of patellofemoral cartilage involvement. If present, your physician may want to assess patellar tracking."},
      {q:"Does going downstairs cause more pain than going upstairs?",why:"Eccentric loading on stairs creates higher compressive forces through the articular cartilage. This pattern suggests the cartilage is a functional pain contributor."},
      {q:"Do you notice swelling after activities that don't bother the other knee?",why:"If routine activities cause swelling in the injured knee but not the healthy one, the cartilage surface may be more reactive and worth monitoring long-term."},
    ],
    treatments:[
      {name:"Quadriceps & Gluteal Strengthening",type:"conservative",color:"#2D8B4E",
        desc:"The strongest evidence-based treatment for Grade 2 cartilage changes. Stronger muscles reduce compressive load through the cartilage surface. Focus on quad sets, mini squats, leg press, and hip abduction.",
        timeline:"Ongoing — this is a long-term maintenance program, not a short-term fix.",
        pros:"Most effective intervention for early cartilage changes. Protects against progression. No side effects.",
        cons:"Requires consistent effort. Benefits take 6-8 weeks to become noticeable."},
      {name:"Activity Modification",type:"conservative",color:"#1A7F7A",
        desc:"Shift toward lower-impact activities (cycling, swimming, elliptical) as the primary exercise modalities. Minimize repetitive deep knee flexion under load.",
        timeline:"Ongoing lifestyle adjustment.",
        pros:"Reduces cartilage wear. Maintains cardiovascular fitness through alternative activities.",
        cons:"May require modifying sport or activity preferences."},
      {name:"Viscosupplementation (Hyaluronic Acid)",type:"interventional",color:"#C45D00",
        desc:"Injection of hyaluronic acid into the joint to supplement the natural joint fluid. Intended to improve lubrication and reduce friction across the cartilage surface.",
        timeline:"Series of 1-3 injections over several weeks. Effects may last 3-6 months.",
        pros:"May reduce pain in some patients. Minimal side effects. Can delay need for more invasive treatments.",
        cons:"Evidence is mixed — some studies show benefit, others do not. Insurance coverage varies. Generally more effective for higher-grade cartilage disease."},
      {name:"PRP (Platelet-Rich Plasma)",type:"interventional",color:"#6B3FA0",
        desc:"Injection of concentrated platelets from your own blood to stimulate cartilage healing. Growing body of research but not yet established standard of care.",
        timeline:"1-3 injections. Results assessed at 6-12 weeks.",
        pros:"Uses your own biology. Emerging evidence for cartilage symptom relief. Low risk profile.",
        cons:"Not covered by most insurance. Evidence is promising but not definitive. Varying preparation protocols between clinics."},
      {name:"NSAIDs (As Needed)",type:"conservative",color:"#2D8B4E",
        desc:"Over-the-counter anti-inflammatories (ibuprofen, naproxen) for flare-ups when cartilage symptoms are bothersome. Not a long-term solution.",
        timeline:"As-needed during symptomatic flares.",
        pros:"Effective for acute symptom relief. Widely available.",
        cons:"Not recommended for chronic daily use (GI, kidney, cardiovascular risks). Masks symptoms without treating cause."},
    ],
  },
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
      <button onClick={()=>generateReport(findings)} style={{background:T.ac,border:"none",color:"#fff",padding:"9px 22px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>Download Full Report (PDF)</button>
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
function TabBar({tab,setTab,mob,paid}){
  const tabs=[["findings","Findings"],["treatments","Treatments"],["report","Report"],["exercises","Exercises"]];
  return(
    <div style={{display:"flex",gap:3,background:"#ECEAE6",borderRadius:9,padding:3,marginBottom:mob?12:14,flexShrink:0}}>
      {tabs.map(([k,label])=>(
        <button key={k} onClick={()=>setTab(k)} style={{
          flex:1,padding:mob?"7px 6px":"7px 10px",borderRadius:7,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",
          background:tab===k?"#fff":"transparent",color:tab===k?"#1D1D1F":"#AEAEB2",
          boxShadow:tab===k?"0 1px 3px rgba(0,0,0,0.06)":"none",transition:"all .15s",
        }}>{label}</button>
      ))}
    </div>
  );
}

/* ═══════════════════ REPORT TAB — Clinical Intake ═══════════════════ */

const MEDICAL_CONDITIONS=[
  "Diabetes","Osteoporosis","Rheumatoid Arthritis","Osteoarthritis","Heart Disease",
  "Blood Clotting Disorder","Obesity (BMI > 30)","Previous Knee Surgery","Steroid Use",
  "Autoimmune Condition","Peripheral Neuropathy","Chronic Pain Syndrome",
];

// Generate finding-aware questions
function getIntakeQuestions(findings){
  const hasACL=findings.some(f=>f.id?.includes("acl")||f.str?.includes("ACL"));
  const hasMeniscus=findings.some(f=>f.id?.includes("meniscus")||f.str?.includes("Meniscus"));
  const hasSurgical=findings.some(f=>f.sev==="severe");
  const hasCartilage=findings.some(f=>f.id?.includes("cartilage")||f.str?.includes("Cartilage"));

  const qs=[];

  // Q1 — always: instability / mechanical symptoms (yes/no)
  qs.push({
    id:"instability",type:"yesno",
    q: hasACL
      ? "Does your knee give way or feel unstable when changing direction or stepping off a curb?"
      : hasMeniscus
      ? "Does your knee catch, lock, or feel like something is getting in the way?"
      : "Do you have difficulty bearing full weight on the affected knee?",
    why: hasACL
      ? "Functional instability is the primary factor in deciding between reconstruction and conservative management."
      : "Mechanical symptoms help determine whether surgical intervention may be needed.",
  });

  // Q2 — always: pain severity (slider 0-10)
  qs.push({
    id:"pain",type:"slider",min:0,max:10,
    q:"Rate your current pain level at its worst during daily activities.",
    labels:["No pain","Moderate","Severe"],
    why:"Pain severity helps calibrate treatment urgency and guides medication recommendations.",
  });

  // Q3 — always: activity goals (multi-select)
  qs.push({
    id:"goals",type:"tags",
    q:"What activities are important to you? Select all that apply.",
    options:["Running","Cutting/Pivoting Sports","Weightlifting","Hiking","Cycling","Swimming","Yoga/Flexibility","Walking Daily","Desk Work Only","Return to Competition"],
    why:"Your activity goals are the single most important factor in choosing between treatment approaches.",
  });

  // Q4 — contextual: prior treatment or surgery history (yes/no + conditional)
  qs.push({
    id:"prior",type:"yesno",
    q: hasSurgical
      ? "Have you had any previous surgery on this knee?"
      : hasCartilage
      ? "Have you had knee injections (cortisone, gel, PRP) in the past?"
      : "Have you tried physical therapy for this knee before?",
    why:"Prior treatments and their outcomes significantly influence the next steps your physician will recommend.",
  });

  // Q5 — always: medical history (tag selector)
  qs.push({
    id:"history",type:"conditions",
    q:"Do you have any of these conditions? Select all that apply.",
    options:MEDICAL_CONDITIONS,
    why:"Certain conditions affect healing, surgical risk, and medication options. This helps your care team plan safely.",
  });

  return qs;
}

function ReportTab({findings,onGenerateReport,onComplete}){
  const[step,setStep]=useState(0); // 0=intro, 1-5=questions, 6=complete
  const[answers,setAnswers]=useState({});
  const questions=getIntakeQuestions(findings||[]);
  const total=questions.length;

  const setAnswer=(id,val)=>setAnswers(p=>({...p,[id]:val}));
  const current=questions[step-1];
  const canNext=step===0||
    (current?.type==="yesno"&&answers[current.id]!=null)||
    (current?.type==="slider"&&answers[current.id]!=null)||
    (current?.type==="tags"&&answers[current.id]?.length>0)||
    (current?.type==="conditions"); // conditions are optional

  // ─── Intro ───
  if(step===0) return(
    <div style={{animation:"fadeIn .4s",textAlign:"center",padding:"16px 0"}}>
      <div style={{fontSize:36,marginBottom:10}}>📋</div>
      <div style={{fontSize:16,fontWeight:700,color:"#1D1D1F",marginBottom:4,fontFamily:"Georgia,serif"}}>Build Your Report</div>
      <div style={{fontSize:12,color:"#6E6E73",lineHeight:1.6,maxWidth:280,margin:"0 auto 20px"}}>
        Answer {total} quick questions so we can personalize your report to your specific situation, goals, and medical history.
      </div>
      <button onClick={()=>setStep(1)} style={{
        background:"#0071E3",border:"none",color:"#fff",padding:"11px 32px",borderRadius:10,
        fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 12px rgba(0,113,227,0.2)",
      }}>Start Assessment</button>
      <div style={{fontSize:10,color:"#AEAEB2",marginTop:10}}>Takes about 30 seconds</div>
    </div>
  );

  // ─── Complete ───
  if(step>total) return(
    <div style={{animation:"fadeIn .4s",textAlign:"center",padding:"16px 0"}}>
      <div style={{fontSize:36,marginBottom:10}}>✅</div>
      <div style={{fontSize:16,fontWeight:700,color:"#1D1D1F",marginBottom:4,fontFamily:"Georgia,serif"}}>Assessment Complete</div>
      <div style={{fontSize:12,color:"#6E6E73",lineHeight:1.6,maxWidth:280,margin:"0 auto 16px"}}>
        Your personalized report is ready with recommendations based on your {findings?.length||0} findings, activity goals, and medical history.
      </div>
      <button onClick={()=>onGenerateReport?.(findings,answers)} style={{
        background:"#0071E3",border:"none",color:"#fff",padding:"11px 28px",borderRadius:10,
        fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 12px rgba(0,113,227,0.2)",marginBottom:10,
      }}>Download PDF Report</button>
      <div style={{fontSize:10,color:"#AEAEB2",marginBottom:14}}>Generated instantly in your browser</div>
      {/* Answer summary */}
      <div style={{textAlign:"left",padding:"10px 12px",background:"#FAFAF8",borderRadius:8,border:"1px solid rgba(0,0,0,0.06)"}}>
        <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#AEAEB2",marginBottom:8}}>Your Responses</div>
        {questions.map((q,i)=>{
          const a=answers[q.id];
          let display="—";
          if(q.type==="yesno")display=a===true?"Yes":a===false?"No":"—";
          if(q.type==="slider")display=a!=null?`${a}/10`:"—";
          if(q.type==="tags"||q.type==="conditions")display=a?.length>0?a.join(", "):"None selected";
          return(
            <div key={i} style={{marginBottom:8,paddingBottom:8,borderBottom:i<questions.length-1?"1px solid rgba(0,0,0,0.04)":"none"}}>
              <div style={{fontSize:10,color:"#AEAEB2",marginBottom:2}}>Q{i+1}</div>
              <div style={{fontSize:11,color:"#1D1D1F",fontWeight:600,marginBottom:2}}>{q.q}</div>
              <div style={{fontSize:11,color:"#0071E3"}}>{display}</div>
            </div>
          );
        })}
      </div>
      <button onClick={()=>{setStep(0);setAnswers({})}} style={{marginTop:10,background:"none",border:"1px solid rgba(0,0,0,0.08)",color:"#AEAEB2",padding:"6px 14px",borderRadius:6,fontSize:10,cursor:"pointer"}}>Retake Assessment</button>
    </div>
  );

  // ─── Question card ───
  const val=answers[current.id];
  return(
    <div style={{animation:"fadeIn .25s",padding:"8px 0"}}>
      {/* Progress */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <div style={{flex:1,height:4,background:"#ECEAE6",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(step/total)*100}%`,background:"#0071E3",borderRadius:2,transition:"width .3s"}} />
        </div>
        <span style={{fontSize:10,color:"#AEAEB2",fontWeight:600,flexShrink:0}}>{step}/{total}</span>
      </div>

      {/* Question */}
      <div style={{fontSize:14,fontWeight:700,color:"#1D1D1F",lineHeight:1.5,marginBottom:4,fontFamily:"Georgia,serif"}}>{current.q}</div>
      <div style={{fontSize:10,color:"#AEAEB2",lineHeight:1.5,marginBottom:14,fontStyle:"italic"}}>{current.why}</div>

      {/* ── Yes/No ── */}
      {current.type==="yesno"&&(
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[true,false].map(v=>(
            <button key={String(v)} onClick={()=>setAnswer(current.id,v)} style={{
              flex:1,padding:"14px 12px",borderRadius:10,border:`2px solid ${val===v?"#0071E3":"rgba(0,0,0,0.08)"}`,
              background:val===v?"rgba(0,113,227,0.06)":"#fff",cursor:"pointer",
              fontSize:14,fontWeight:700,color:val===v?"#0071E3":"#6E6E73",transition:"all .15s",
            }}>{v?"Yes":"No"}</button>
          ))}
        </div>
      )}

      {/* ── Slider ── */}
      {current.type==="slider"&&(
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
            <input type="range" min={current.min} max={current.max} step={1}
              value={val!=null?val:0}
              onChange={e=>setAnswer(current.id,parseInt(e.target.value))}
              style={{flex:1,accentColor:"#0071E3",height:6}}
            />
            <div style={{
              width:40,height:40,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",
              background:val!=null?(val<=3?"#E8F5EC":val<=6?"#FFF3E0":"#FEECEF"):"#F5F4F1",
              fontSize:18,fontWeight:800,fontFamily:"monospace",flexShrink:0,
              color:val!=null?(val<=3?"#2D8B4E":val<=6?"#C45D00":"#BF1029"):"#AEAEB2",
              transition:"all .2s",
            }}>{val!=null?val:"—"}</div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            {current.labels.map((l,i)=>(
              <span key={i} style={{fontSize:9,color:"#AEAEB2",fontWeight:600}}>{l}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Tag selector (activities) ── */}
      {current.type==="tags"&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {current.options.map(opt=>{
            const sel=(val||[]).includes(opt);
            return(
              <button key={opt} onClick={()=>{
                const cur=val||[];
                setAnswer(current.id,sel?cur.filter(x=>x!==opt):[...cur,opt]);
              }} style={{
                padding:"8px 14px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",
                border:`1.5px solid ${sel?"#0071E3":"rgba(0,0,0,0.08)"}`,
                background:sel?"rgba(0,113,227,0.06)":"#fff",
                color:sel?"#0071E3":"#6E6E73",transition:"all .15s",
              }}>{sel?"✓ ":""}{opt}</button>
            );
          })}
        </div>
      )}

      {/* ── Conditions (medical history tags) ── */}
      {current.type==="conditions"&&(
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {current.options.map(opt=>{
              const sel=(val||[]).includes(opt);
              return(
                <button key={opt} onClick={()=>{
                  const cur=val||[];
                  setAnswer(current.id,sel?cur.filter(x=>x!==opt):[...cur,opt]);
                }} style={{
                  padding:"6px 11px",borderRadius:7,fontSize:10,fontWeight:600,cursor:"pointer",
                  border:`1.5px solid ${sel?"#6B3FA0":"rgba(0,0,0,0.06)"}`,
                  background:sel?"rgba(107,63,160,0.06)":"#fff",
                  color:sel?"#6B3FA0":"#6E6E73",transition:"all .15s",
                }}>{sel?"✓ ":""}{opt}</button>
              );
            })}
          </div>
          <div style={{fontSize:10,color:"#AEAEB2",marginTop:8}}>Select all that apply, or skip if none.</div>
        </div>
      )}

      {/* Navigation */}
      <div style={{display:"flex",gap:8}}>
        {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{
          padding:"10px 18px",borderRadius:8,border:"1px solid rgba(0,0,0,0.08)",
          background:"#fff",color:"#6E6E73",fontSize:12,fontWeight:600,cursor:"pointer",
        }}>← Back</button>}
        <button onClick={()=>{if(step===total){onComplete?.(answers)}setStep(s=>s+1)}} disabled={!canNext} style={{
          flex:1,padding:"10px 18px",borderRadius:8,border:"none",
          background:canNext?"#0071E3":"#ECEAE6",color:canNext?"#fff":"#AEAEB2",
          fontSize:12,fontWeight:700,cursor:canNext?"pointer":"not-allowed",transition:"all .2s",
        }}>{step===total?"Complete Assessment":"Next →"}</button>
      </div>
    </div>
  );
}

/* ═══════════════════ TREATMENTS TAB (Left Panel) ═══════════════════ */
function TreatmentsTab({findings,activeTx,setActiveTx,txFinding}){
  // Collect all treatments grouped by finding, ordered conservative → interventional → surgical
  const TYPE_ORDER={conservative:0,interventional:1,surgical:2};
  return(
    <div style={{animation:"fadeIn .4s"}}>
      <div style={{padding:"6px 10px",background:"#E6F5F4",borderRadius:8,border:"1px solid rgba(26,127,122,0.15)",marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:"#1A7F7A",marginBottom:2}}>NOT A RECOMMENDATION</div>
        <div style={{fontSize:11,lineHeight:1.5,color:"#6E6E73"}}>These are options typically discussed for your findings. The right treatment depends on your examination, goals, and your physician's assessment.</div>
      </div>

      {findings.map(f=>{
        if(!f.treatments||f.treatments.length===0)return null;
        const sc=f.sev==="severe"?"#BF1029":f.sev==="moderate"?"#C45D00":"#A68B00";
        const sorted=[...f.treatments].sort((a,b)=>(TYPE_ORDER[a.type]||0)-(TYPE_ORDER[b.type]||0));
        return(
          <div key={f.id} style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <span style={{fontSize:9,fontWeight:700,color:sc,background:sc+"12",padding:"2px 7px",borderRadius:4,textTransform:"uppercase",letterSpacing:1}}>{f.sev}</span>
              <span style={{fontSize:12,fontWeight:700,color:"#1D1D1F",fontFamily:"Georgia,serif"}}>{f.str}</span>
            </div>
            {sorted.map((tx,i)=>{
              const isSel=activeTx?.name===tx.name&&txFinding?.id===f.id;
              return(
                <div key={i} onClick={()=>setActiveTx(tx,f)} style={{
                  padding:"8px 10px",marginBottom:3,borderRadius:7,cursor:"pointer",
                  border:`1px solid ${isSel?tx.color+"44":"rgba(0,0,0,0.05)"}`,
                  background:isSel?tx.color+"08":"#fff",transition:"all .15s",
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
                    <div style={{width:5,height:5,borderRadius:3,background:tx.color,flexShrink:0}} />
                    <span style={{fontSize:11.5,fontWeight:600,color:"#1D1D1F",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.name}</span>
                  </div>
                  <span style={{fontSize:7,fontWeight:700,color:tx.color,background:tx.color+"10",padding:"2px 5px",borderRadius:3,textTransform:"uppercase",letterSpacing:.5,flexShrink:0}}>{tx.type}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════ TREATMENT DETAIL (Right Pane) ═══════════════════ */
function TreatmentDetail({tx,finding,onClose,allFindings,paid,onUnlock}){
  if(!tx||!finding)return null;
  if(!paid) return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#fff",animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
      <div style={{padding:"16px 18px 12px",borderBottom:"1px solid rgba(0,0,0,0.06)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <button onClick={()=>onClose("close")} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:"#AEAEB2",fontSize:12,cursor:"pointer",padding:0}}>← Back</button>
        </div>
        <h2 style={{fontSize:18,fontWeight:700,color:"#1D1D1F",margin:0,fontFamily:"Georgia,serif"}}>{tx.name}</h2>
        <div style={{fontSize:11,color:"#6E6E73",marginTop:2}}>For: {finding.str} — {finding.path}</div>
      </div>
      <LockedPreview onUnlock={onUnlock} features={["Detailed treatment description","Expected timeline and milestones","Pros and considerations analysis","Alternative treatment comparison","Treatment spectrum positioning"]}>
        <div style={{padding:"16px 18px"}}>
          <div style={{marginBottom:16,padding:"12px 14px",background:"#F5F4F1",borderRadius:10,fontSize:12.5,lineHeight:1.65,color:"#1D1D1F"}}>{tx.desc}</div>
          <div style={{marginBottom:16,padding:"12px 14px",background:"#E8F5EC",borderRadius:10,borderLeft:"3px solid #2D8B4E",fontSize:12,lineHeight:1.6}}>{tx.timeline}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{padding:12,borderRadius:10,background:"rgba(45,139,78,0.05)",border:"1px solid rgba(45,139,78,0.1)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#2D8B4E",marginBottom:4}}>PROS</div>
              <div style={{fontSize:11,color:"#6E6E73",lineHeight:1.5}}>{tx.pros}</div>
            </div>
            <div style={{padding:12,borderRadius:10,background:"rgba(191,16,41,0.03)",border:"1px solid rgba(191,16,41,0.1)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#BF1029",marginBottom:4}}>CONSIDERATIONS</div>
              <div style={{fontSize:11,color:"#6E6E73",lineHeight:1.5}}>{tx.cons}</div>
            </div>
          </div>
        </div>
      </LockedPreview>
    </div>
  );
  const sc=finding.sev==="severe"?"#BF1029":finding.sev==="moderate"?"#C45D00":"#A68B00";
  const TYPE_LABELS={conservative:"Conservative",interventional:"Interventional",surgical:"Surgical"};
  const TYPE_ICONS={conservative:"🟢",interventional:"🟡",surgical:"🔵"};

  // Build a simple timeline visualization
  const timelineSteps = tx.timeline.split(/[.,;]/).filter(s=>s.trim().length>5).map(s=>s.trim());

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#fff",animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"16px 18px 12px",borderBottom:"1px solid rgba(0,0,0,0.06)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:"#AEAEB2",fontSize:12,cursor:"pointer",padding:0}}>← Back</button>
          <span style={{fontSize:9,fontWeight:700,color:tx.color,background:tx.color+"12",padding:"3px 10px",borderRadius:5,textTransform:"uppercase",letterSpacing:1}}>{TYPE_LABELS[tx.type]}</span>
        </div>
        <h2 style={{fontSize:18,fontWeight:700,color:"#1D1D1F",margin:0,fontFamily:"Georgia,serif"}}>{tx.name}</h2>
        <div style={{fontSize:11,color:sc,fontWeight:600,marginTop:2}}>For: {finding.str} — {finding.path}</div>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflow:"auto",padding:"16px 18px"}}>

        {/* Approach spectrum */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:9,fontWeight:700,color:"#AEAEB2",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Treatment Spectrum</div>
          <div style={{display:"flex",alignItems:"center",height:32,background:"#F5F4F1",borderRadius:8,overflow:"hidden",position:"relative"}}>
            <div style={{flex:1,textAlign:"center",fontSize:9,fontWeight:700,color:tx.type==="conservative"?tx.color:"#AEAEB2",background:tx.type==="conservative"?tx.color+"12":"transparent",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s"}}>CONSERVATIVE</div>
            <div style={{width:1,height:16,background:"rgba(0,0,0,0.08)"}} />
            <div style={{flex:1,textAlign:"center",fontSize:9,fontWeight:700,color:tx.type==="interventional"?tx.color:"#AEAEB2",background:tx.type==="interventional"?tx.color+"12":"transparent",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s"}}>INTERVENTIONAL</div>
            <div style={{width:1,height:16,background:"rgba(0,0,0,0.08)"}} />
            <div style={{flex:1,textAlign:"center",fontSize:9,fontWeight:700,color:tx.type==="surgical"?tx.color:"#AEAEB2",background:tx.type==="surgical"?tx.color+"12":"transparent",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s"}}>SURGICAL</div>
          </div>
        </div>

        {/* What it involves */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:tx.color+"14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>📋</div>
            <h3 style={{fontSize:14,fontWeight:700,color:"#1D1D1F",margin:0}}>What It Involves</h3>
          </div>
          <div style={{padding:"12px 14px",background:"#F5F4F1",borderRadius:10,fontSize:13,lineHeight:1.7,color:"#1D1D1F"}}>{tx.desc}</div>
        </div>

        {/* Timeline visualization */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:"rgba(45,139,78,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>⏱</div>
            <h3 style={{fontSize:14,fontWeight:700,color:"#1D1D1F",margin:0}}>Expected Timeline</h3>
          </div>
          <div style={{padding:"12px 14px",background:"#E8F5EC",borderRadius:10,borderLeft:"3px solid #2D8B4E"}}>
            {timelineSteps.map((step,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:i<timelineSteps.length-1?8:0}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,marginTop:2}}>
                  <div style={{width:8,height:8,borderRadius:4,background:"#2D8B4E"}} />
                  {i<timelineSteps.length-1&&<div style={{width:1,height:16,background:"rgba(45,139,78,0.2)",marginTop:2}} />}
                </div>
                <div style={{fontSize:12,lineHeight:1.5,color:"#1D1D1F"}}>{step}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Advantages & Considerations — side by side */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:"rgba(0,113,227,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>⚖️</div>
            <h3 style={{fontSize:14,fontWeight:700,color:"#1D1D1F",margin:0}}>Pros & Considerations</h3>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{padding:"12px",background:"rgba(45,139,78,0.04)",borderRadius:10,border:"1px solid rgba(45,139,78,0.12)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#2D8B4E",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>✓ Advantages</div>
              <div style={{fontSize:12,lineHeight:1.65,color:"#1D1D1F"}}>{tx.pros}</div>
            </div>
            <div style={{padding:"12px",background:"rgba(191,16,41,0.03)",borderRadius:10,border:"1px solid rgba(191,16,41,0.1)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#BF1029",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>⚠ Considerations</div>
              <div style={{fontSize:12,lineHeight:1.65,color:"#1D1D1F"}}>{tx.cons}</div>
            </div>
          </div>
        </div>

        {/* Other treatments for this finding */}
        {finding.treatments&&finding.treatments.length>1&&<div style={{marginBottom:16}}>
          <div style={{fontSize:9,fontWeight:700,color:"#AEAEB2",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Other Options for {finding.str}</div>
          <div style={{borderRadius:8,border:"1px solid rgba(0,0,0,0.06)",overflow:"hidden"}}>
            {finding.treatments.filter(t=>t.name!==tx.name).map((alt,i,arr)=>(
              <div key={i} onClick={()=>onClose("switch",alt,finding)} style={{
                padding:"8px 10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",
                borderBottom:i<arr.length-1?"1px solid rgba(0,0,0,0.04)":"none",
                transition:"background .15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAF8"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:5,height:5,borderRadius:3,background:alt.color}} />
                  <span style={{fontSize:11,fontWeight:500,color:"#1D1D1F"}}>{alt.name}</span>
                </div>
                <span style={{color:"#AEAEB2",fontSize:10}}>→</span>
              </div>
            ))}
          </div>
        </div>}

        {/* Disclaimer */}
        <div style={{padding:"8px 10px",background:"#E6F5F4",borderRadius:8,border:"1px solid rgba(26,127,122,0.12)"}}>
          <div style={{fontSize:10,lineHeight:1.5,color:"#1A7F7A"}}>
            This is general information about this treatment approach. Your physician will recommend a specific plan based on your examination, imaging, goals, and medical history.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ TABBED PANEL ═══════════════════ */
function TabbedPanel({findings,active,onSel,mob,tab,setTab,activeEx,setActiveEx,activeTx,setActiveTx,txFinding,paid,onUnlock}){
  return(
    <>
      <TabBar tab={tab} setTab={setTab} mob={mob} paid={paid} />
      {tab==="findings"&&<Summary findings={findings} active={active} onSel={onSel} mob={mob} />}
      {tab==="exercises"&&<PTLibrary findings={findings} onSelectFinding={onSel} activeEx={activeEx} setActiveEx={setActiveEx} assessAnswers={assessAnswers} />}
      {tab==="treatments"&&<TreatmentsTab findings={findings} activeTx={activeTx} setActiveTx={(tx,f)=>setActiveTx(tx,f)} txFinding={txFinding} />}
      {tab==="report"&&<ReportTab findings={findings} onGenerateReport={(f,a)=>generateReport(f)} onComplete={(a)=>setAssessAnswers(a)} />}
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

/* ═══════════════════ PAYWALL COMPONENTS ═══════════════════ */
const PRICE="$5";
const PRICE_LABEL="Full ClearScan Report";

function PaywallBanner({onUnlock,compact}){
  return(
    <div style={{
      background:"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",borderRadius:compact?8:12,
      padding:compact?"12px 14px":"18px 20px",margin:compact?"8px 0":"12px 0",
      display:"flex",alignItems:compact?"center":"flex-start",
      justifyContent:"space-between",gap:12,flexDirection:compact?"row":"column",
    }}>
      <div>
        <div style={{fontSize:compact?12:14,fontWeight:700,color:"#fff",marginBottom:compact?0:4}}>
          {compact?"Unlock full report":"Unlock Your Complete Report"}
        </div>
        {!compact&&<div style={{fontSize:12,color:"rgba(255,255,255,0.8)",lineHeight:1.5}}>
          Specialist perspectives, treatment comparison, PT exercises with video, self-assessment questions, and downloadable PDF report.
        </div>}
      </div>
      <button onClick={onUnlock} style={{
        background:"#fff",border:"none",color:"#0071E3",padding:compact?"7px 14px":"11px 22px",
        borderRadius:8,fontSize:compact?11:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
        boxShadow:"0 2px 8px rgba(0,0,0,0.15)",
      }}>{PRICE} — Unlock</button>
    </div>
  );
}

function LockedSection({title,icon,children,paid,onUnlock,previewLines}){
  if(paid)return children;
  return(
    <div style={{position:"relative",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{width:24,height:24,borderRadius:7,background:"rgba(0,0,0,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{icon}</div>
        <h3 style={{fontSize:14,fontWeight:700,color:"#1D1D1F",margin:0}}>{title}</h3>
        <span style={{fontSize:8,fontWeight:700,color:"#0071E3",background:"rgba(0,113,227,0.08)",padding:"2px 6px",borderRadius:3,textTransform:"uppercase",letterSpacing:1}}>PRO</span>
      </div>
      {/* Blurred preview */}
      <div style={{position:"relative",overflow:"hidden",maxHeight:previewLines?previewLines*22:80}}>
        <div style={{filter:"blur(4px)",opacity:.5,pointerEvents:"none",userSelect:"none"}}>
          {children}
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"100%",
          background:"linear-gradient(transparent 0%, rgba(255,255,255,0.9) 60%, #fff 100%)",
          display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:8}}>
          <button onClick={onUnlock} style={{
            background:"#0071E3",border:"none",color:"#fff",padding:"7px 16px",
            borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",
            boxShadow:"0 2px 8px rgba(0,113,227,0.25)",
            display:"flex",alignItems:"center",gap:4,
          }}>🔒 Unlock with {PRICE_LABEL}</button>
        </div>
      </div>
    </div>
  );
}

function LockedPreview({children,onUnlock,features}){
  return(
    <div style={{position:"relative",overflow:"hidden",flex:1,minHeight:0}}>
      <div style={{filter:"blur(5px)",opacity:.45,pointerEvents:"none",userSelect:"none",overflow:"hidden",maxHeight:"100%"}}>
        {children}
      </div>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        background:"linear-gradient(transparent 0%, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0.92) 60%, rgba(255,255,255,0.98) 100%)",
        padding:"20px 16px",textAlign:"center"}}>
        <div style={{background:"#fff",borderRadius:14,padding:"24px 22px",boxShadow:"0 8px 32px rgba(0,0,0,0.08)",border:"1px solid rgba(0,0,0,0.06)",maxWidth:300}}>
          <div style={{fontSize:32,marginBottom:10}}>🔓</div>
          <div style={{fontSize:16,fontWeight:700,color:"#1D1D1F",marginBottom:6,fontFamily:"Georgia,serif"}}>Unlock Full Access</div>
          <div style={{fontSize:12,color:"#6E6E73",lineHeight:1.6,marginBottom:14}}>
            Get the complete picture — everything you need to prepare for your appointment.
          </div>
          <div style={{textAlign:"left",marginBottom:16}}>
            {features.map((f,i)=>(
              <div key={i} style={{fontSize:11,color:"#6E6E73",padding:"3px 0",display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:"#0071E3",fontSize:11,flexShrink:0}}>✓</span>{f}
              </div>
            ))}
          </div>
          <button onClick={onUnlock} style={{
            width:"100%",background:"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",border:"none",color:"#fff",
            padding:"12px 24px",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",
            boxShadow:"0 4px 16px rgba(0,113,227,0.3)",
          }}>{PRICE} — Unlock Full Report</button>
          <div style={{fontSize:9,color:"#AEAEB2",marginTop:6}}>One-time payment · Instant access · No subscription</div>
        </div>
      </div>
    </div>
  );
}

function LockedTab({title,features,onUnlock}){
  return(
    <div style={{animation:"fadeIn .4s",textAlign:"center",padding:"30px 10px"}}>
      <div style={{fontSize:40,marginBottom:12}}>🔒</div>
      <div style={{fontSize:17,fontWeight:700,color:"#1D1D1F",marginBottom:6,fontFamily:"Georgia,serif"}}>{title}</div>
      <div style={{fontSize:12,color:"#AEAEB2",lineHeight:1.6,maxWidth:280,margin:"0 auto 18px"}}>
        Unlock your full personalized report to access this section.
      </div>
      <div style={{textAlign:"left",maxWidth:260,margin:"0 auto 18px"}}>
        {features.map((f,i)=>(
          <div key={i} style={{fontSize:12,color:"#6E6E73",padding:"5px 0",display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:"#0071E3",fontSize:12}}>✓</span>{f}
          </div>
        ))}
      </div>
      <button onClick={onUnlock} style={{
        background:"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",border:"none",color:"#fff",
        padding:"12px 32px",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",
        boxShadow:"0 4px 16px rgba(0,113,227,0.3)",
      }}>{PRICE} — Unlock Full Report</button>
      <div style={{fontSize:10,color:"#AEAEB2",marginTop:8}}>One-time payment · Instant access · No subscription</div>
    </div>
  );
}

/* ═══════════════════ FINDING DETAIL PANE ═══════════════════ */
function FindingDetail({finding,onClose,mob,onSelectTx,paid,onUnlock}){
  if(!finding)return null;
  const sc=T[finding.sev];
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#fff",animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"16px 18px 12px",borderBottom:"1px solid rgba(0,0,0,0.06)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:"#AEAEB2",fontSize:12,cursor:"pointer",padding:0}}>← Back to findings</button>
          <span style={{fontSize:9,fontWeight:700,color:sc.c,background:sc.bg,border:`1px solid ${sc.bd}`,padding:"3px 10px",borderRadius:5,textTransform:"uppercase",letterSpacing:1}}>{finding.sev}</span>
        </div>
        <h2 style={{fontSize:mob?18:20,fontWeight:700,color:T.tx,margin:0,fontFamily:"Georgia,serif"}}>{finding.str}</h2>
        <div style={{fontSize:12,color:sc.c,fontWeight:600,marginTop:2}}>{finding.path}</div>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflow:"auto",padding:"16px 18px"}}>

        {/* Severity gauge */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:9,fontWeight:700,color:"#AEAEB2",textTransform:"uppercase",letterSpacing:1}}>Severity</span>
            <span style={{fontSize:10,fontWeight:600,color:sc.c}}>{Math.round(finding.sc*100)}%</span>
          </div>
          <div style={{height:6,background:"#ECEAE6",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${finding.sc*100}%`,background:sc.c,borderRadius:3,transition:"width .5s ease"}} />
          </div>
        </div>

        {/* What it is */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:sc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🔍</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>What This Means</h3>
          </div>
          <div style={{padding:"12px 14px",background:"#F5F4F1",borderRadius:10,fontSize:13,lineHeight:1.7,color:T.tx}}>{finding.desc}</div>
        </div>

        {/* What you may feel */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:"rgba(0,113,227,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>💬</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>What You May Experience</h3>
          </div>
          <div style={{padding:"12px 14px",background:"#F5F9FE",borderRadius:10,borderLeft:"3px solid #0071E3",fontSize:12.5,lineHeight:1.65,color:"#6E6E73"}}>{finding.imp}</div>
        </div>

        {/* Clinical context */}
        <div style={{marginBottom:16,padding:"10px 14px",background:"#FAFAF8",borderRadius:10}}>
          <div style={{fontSize:9,fontWeight:700,color:"#AEAEB2",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Clinical Context</div>
          <div style={{fontSize:12,lineHeight:1.6,color:"#6E6E73"}}>{finding.ctx}</div>
        </div>

        {/* Self-assessment — clinical intake questions (PREMIUM) */}
        {finding.selfAssess&&finding.selfAssess.length>0&&(
        <LockedSection title="Questions Your Doctor Will Ask" icon="🩺" paid={paid} onUnlock={onUnlock} previewLines={4}>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,lineHeight:1.5,color:"#AEAEB2",marginBottom:10}}>
            Think about your answers before your appointment — these are the same questions a specialist would ask to evaluate this finding.
          </div>
          {finding.selfAssess.map((sa,i)=>(
            <div key={i} style={{marginBottom:8,borderRadius:8,border:"1px solid rgba(0,0,0,0.06)",overflow:"hidden"}}>
              <div style={{padding:"10px 12px",background:"#F5F9FE",display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{color:"#0071E3",fontSize:13,fontWeight:700,flexShrink:0,marginTop:1,fontFamily:"monospace"}}>{i+1}</span>
                <span style={{fontSize:12.5,lineHeight:1.55,color:T.tx,fontWeight:600}}>{sa.q}</span>
              </div>
              <div style={{padding:"8px 12px 8px 32px",background:"#fff",fontSize:11,lineHeight:1.5,color:"#6E6E73",fontStyle:"italic",borderTop:"1px solid rgba(0,0,0,0.04)"}}>
                <span style={{color:"#0071E3",fontWeight:600,fontStyle:"normal"}}>Why they ask: </span>{sa.why}
              </div>
            </div>
          ))}
          <div style={{padding:"8px 10px",background:"rgba(0,113,227,0.04)",borderRadius:6,marginTop:6}}>
            <div style={{fontSize:10,lineHeight:1.5,color:"#0071E3"}}>
              <strong>Tip:</strong> Write down your answers and bring them to your appointment.
            </div>
          </div>
        </div>
        </LockedSection>
        )}

        {/* Expected timeline */}
        {finding.timeline&&<div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:"rgba(45,139,78,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>⏱</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>Expected Timeline</h3>
          </div>
          <div style={{padding:"12px 14px",background:"#E8F5EC",borderRadius:10,borderLeft:"3px solid #2D8B4E",fontSize:12,lineHeight:1.6,color:"#1D1D1F"}}>{finding.timeline}</div>
        </div>}

        {/* Specialist perspectives (PREMIUM) */}
        {finding.lenses&&finding.lenses.length>0&&(
        <LockedSection title="Specialist Perspectives" icon="👥" paid={paid} onUnlock={onUnlock} previewLines={3}>
        <div style={{marginBottom:16}}>
          {finding.lenses.map((l,i)=>(
            <div key={i} style={{padding:"10px 12px",borderRadius:8,marginBottom:6,background:l.color+"06",borderLeft:`3px solid ${l.color}`}}>
              <div style={{fontSize:10,fontWeight:700,color:l.color,marginBottom:3}}>{l.spec}</div>
              <div style={{fontSize:12,lineHeight:1.6,color:"#6E6E73"}}>{l.text}</div>
            </div>
          ))}
        </div>
        </LockedSection>
        )}

        {/* Treatment options — compact list (PREMIUM) */}
        {finding.treatments&&finding.treatments.length>0&&(
        <LockedSection title="Treatment Options" icon="💊" paid={paid} onUnlock={onUnlock} previewLines={3}>
        <div style={{marginBottom:16}}>
          <div style={{borderRadius:10,border:"1px solid rgba(0,0,0,0.06)",overflow:"hidden"}}>
            {finding.treatments.map((tx,i)=>(
              <div key={i} onClick={()=>paid&&onSelectTx?.(tx,finding)} style={{
                padding:"10px 12px",cursor:paid?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"space-between",
                borderBottom:i<finding.treatments.length-1?"1px solid rgba(0,0,0,0.04)":"none",
                transition:"background .15s",
              }}
              onMouseEnter={e=>{if(paid)e.currentTarget.style.background=tx.color+"06"}}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                  <div style={{width:6,height:6,borderRadius:3,background:tx.color,flexShrink:0}} />
                  <span style={{fontSize:12,fontWeight:600,color:T.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.name}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  <span style={{fontSize:8,fontWeight:700,color:tx.color,background:tx.color+"10",padding:"2px 6px",borderRadius:3,textTransform:"uppercase",letterSpacing:.5}}>{tx.type}</span>
                  <span style={{color:"#AEAEB2",fontSize:11}}>→</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:"#AEAEB2",marginTop:6,marginLeft:32}}>Tap to explore details, timeline, and comparison</div>
        </div>
        </LockedSection>
        )}

        {/* Questions to ask (PREMIUM) */}
        {finding.questions&&finding.questions.length>0&&(
        <LockedSection title="Questions for Your Doctor" icon="❓" paid={paid} onUnlock={onUnlock} previewLines={2}>
        <div style={{marginBottom:16}}>
          <div style={{padding:"10px 14px",background:"#FAFAF8",borderRadius:10,border:"1px solid rgba(0,0,0,0.04)"}}>
            {finding.questions.map((q,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:i<finding.questions.length-1?"1px solid rgba(0,0,0,0.04)":"none"}}>
                <span style={{color:"#C45D00",fontSize:11,flexShrink:0,marginTop:1}}>□</span>
                <span style={{fontSize:12,lineHeight:1.5,color:T.tx}}>{q}</span>
              </div>
            ))}
          </div>
        </div>
        </LockedSection>
        )}

        {/* Paywall banner if not paid */}
        {!paid&&<PaywallBanner onUnlock={onUnlock} compact={true} />}

        {/* Disclaimer */}
        <div style={{padding:"8px 10px",background:"#E6F5F4",borderRadius:8,border:"1px solid rgba(26,127,122,0.12)"}}>
          <div style={{fontSize:10,lineHeight:1.5,color:"#1A7F7A"}}>
            This information reflects general clinical perspectives for this type of finding. Your treating physician will provide recommendations specific to your situation.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ EXERCISE DETAIL PANE ═══════════════════ */
const PHASE_CLR={1:"#0071E3",2:"#2D8B4E",3:"#6B3FA0"};
const PHASE_NM={1:"Phase 1: Early Recovery",2:"Phase 2: Building Strength",3:"Phase 3: Functional"};
const PHASE_TM={1:"Weeks 1-2",2:"Weeks 3-6",3:"Weeks 7-12"};

function ExerciseDetail({ex,onClose,mob,paid,onUnlock}){
  if(!ex)return null;
  if(!paid) return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#fff",animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
      <div style={{padding:"16px 18px 12px",borderBottom:"1px solid rgba(0,0,0,0.06)",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:"#AEAEB2",fontSize:12,cursor:"pointer",padding:0}}>← Back</button>
        </div>
        <h2 style={{fontSize:mob?18:20,fontWeight:700,color:"#1D1D1F",margin:0,fontFamily:"Georgia,serif"}}>{ex.name}</h2>
      </div>
      <LockedPreview onUnlock={onUnlock} features={["Step-by-step exercise instructions","Video demonstration","Safety guidelines and contraindications","Recommended sets, reps, and frequency","Clinical rationale for each exercise"]}>
        <ExerciseDetailContent ex={ex} mob={mob} />
      </LockedPreview>
    </div>
  );
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

/* Lightweight content for blurred exercise preview */
function ExerciseDetailContent({ex,mob}){
  const pc=PHASE_CLR[ex.phase];
  return(
    <div style={{padding:"16px 18px"}}>
      <div style={{width:"100%",aspectRatio:"16/9",background:"linear-gradient(135deg,#1D1D1F,#2C2C2E)",borderRadius:12,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{color:"rgba(255,255,255,0.5)",fontSize:12}}>Video Demonstration</span>
      </div>
      <div style={{marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:"#1D1D1F",marginBottom:8}}>How to Perform</h3>
        <div style={{padding:"12px 14px",background:"#F5F4F1",borderRadius:10,fontSize:12.5,lineHeight:1.65,color:"#1D1D1F"}}>{ex.desc}</div>
      </div>
      <div style={{marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:"#1D1D1F",marginBottom:8}}>Why This Exercise</h3>
        <div style={{padding:"12px 14px",background:pc+"08",borderRadius:10,fontSize:12.5,lineHeight:1.65,color:"#6E6E73"}}>{ex.why}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{padding:14,background:"#F5F9FE",borderRadius:10,textAlign:"center"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#AEAEB2",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Prescription</div>
          <div style={{fontSize:15,fontWeight:700,color:"#0071E3"}}>{ex.rx}</div>
        </div>
        <div style={{padding:14,background:"#F5F9FE",borderRadius:10,textAlign:"center"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#AEAEB2",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Tempo</div>
          <div style={{fontSize:15,fontWeight:700,color:"#0071E3"}}>{ex.duration}</div>
        </div>
      </div>
    </div>
  );
}


function ResizableSplit({left,right,show,minPct=25,maxPct=75,defaultPct=50}){
  const containerRef=useRef(null);
  const [pct,setPct]=useState(defaultPct);
  const dragging=useRef(false);

  const onMouseDown=useCallback((e)=>{
    e.preventDefault();
    dragging.current=true;
    const onMove=(ev)=>{
      if(!dragging.current||!containerRef.current)return;
      const rect=containerRef.current.getBoundingClientRect();
      const x=ev.clientX-rect.left;
      const p=Math.max(minPct,Math.min(maxPct,(x/rect.width)*100));
      setPct(p);
    };
    const onUp=()=>{dragging.current=false;document.removeEventListener("mousemove",onMove);document.removeEventListener("mouseup",onUp);document.body.style.cursor="";document.body.style.userSelect=""};
    document.addEventListener("mousemove",onMove);
    document.addEventListener("mouseup",onUp);
    document.body.style.cursor="col-resize";
    document.body.style.userSelect="none";
  },[minPct,maxPct]);

  // Touch support
  const onTouchStart=useCallback((e)=>{
    dragging.current=true;
    const onMove=(ev)=>{
      if(!dragging.current||!containerRef.current)return;
      const rect=containerRef.current.getBoundingClientRect();
      const x=ev.touches[0].clientX-rect.left;
      const p=Math.max(minPct,Math.min(maxPct,(x/rect.width)*100));
      setPct(p);
    };
    const onEnd=()=>{dragging.current=false;document.removeEventListener("touchmove",onMove);document.removeEventListener("touchend",onEnd)};
    document.addEventListener("touchmove",onMove,{passive:false});
    document.addEventListener("touchend",onEnd);
  },[minPct,maxPct]);

  if(!show)return <div ref={containerRef} style={{flex:1,display:"flex",overflow:"hidden"}}>{left}</div>;

  return(
    <div ref={containerRef} style={{flex:1,display:"flex",overflow:"hidden"}}>
      <div style={{width:`${pct}%`,flexShrink:0,position:"relative",overflow:"hidden"}}>{left}</div>
      {/* Drag handle */}
      <div onMouseDown={onMouseDown} onTouchStart={onTouchStart} style={{
        width:6,flexShrink:0,cursor:"col-resize",background:"#fff",borderLeft:"1px solid rgba(0,0,0,0.06)",
        borderRight:"1px solid rgba(0,0,0,0.06)",display:"flex",alignItems:"center",justifyContent:"center",
        position:"relative",zIndex:5,transition:"background .15s",
      }}
      onMouseEnter={e=>e.currentTarget.style.background="rgba(0,113,227,0.06)"}
      onMouseLeave={e=>{if(!dragging.current)e.currentTarget.style.background="#fff"}}
      >
        <div style={{width:2,height:32,borderRadius:1,background:"rgba(0,0,0,0.12)"}} />
      </div>
      <div style={{flex:1,overflow:"hidden",animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)"}}>{right}</div>
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
  const[tab,setTab]=useState("findings");
  const[activeEx,setActiveEx]=useState(null);
  const[detailFinding,setDetailFinding]=useState(null);
  const[activeTx,setActiveTx]=useState(null);
  const[txFinding,setTxFinding]=useState(null);
  const[paid,setPaid]=useState(false);
  const[checkingPayment,setCheckingPayment]=useState(false);
  const[assessAnswers,setAssessAnswers]=useState(null); // null = not completed
  useEffect(()=>{const c=()=>setMob(window.innerWidth<768);c();window.addEventListener("resize",c);return()=>window.removeEventListener("resize",c)},[]);

  // Check for payment return from Stripe
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const sessionId=params.get("session_id");
    const paidParam=params.get("paid");
    if(paidParam==="true"&&sessionId){
      setCheckingPayment(true);
      fetch("/api/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:sessionId})})
        .then(r=>r.json())
        .then(d=>{if(d.paid){setPaid(true);try{sessionStorage.setItem("cs_paid","1")}catch(e){}}})
        .catch(()=>{})
        .finally(()=>{setCheckingPayment(false);window.history.replaceState({},"",window.location.pathname)});
    } else {
      try{if(sessionStorage.getItem("cs_paid")==="1")setPaid(true)}catch(e){}
    }
  },[]);

  const startCheckout=async()=>{
    try{
      const res=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
      const data=await res.json();
      if(data.url)window.location.href=data.url;
    }catch(e){console.error("Checkout error:",e)}
  };

  const[err,setErr]=useState(null);

  const go=useCallback(async()=>{
    if(!text.trim())return;
    await Tone.start().catch(()=>{});initS();
    setPhase("analyzing");setErr(null);pAmb();

    // Check if this is the demo text
    const isDemo = text.trim() === SAMPLE.trim();

    if(isDemo){
      // Use hardcoded demo data — instant, no API call
      setTimeout(()=>{pTrans();setFindings(DEMO_FD);setPhase("revealing");setRi(0)},2000);
    } else {
      // Real NLP extraction via Claude API
      try {
        const raw = await extractFindings(text);
        const deduped = dedupeFindings(raw);
        if(deduped.length === 0){
          setErr("No pathological findings detected. Make sure you're pasting the IMPRESSION section of a knee MRI report.");
          setPhase("input");
          return;
        }
        const mapped = mapToVisualization(deduped);
        pTrans();
        setFindings(mapped);
        setPhase("revealing");
        setRi(0);
      } catch(e) {
        console.error('NLP failed:', e);
        setErr("Unable to analyze this report. Please check that you've pasted a knee MRI impression and try again.");
        setPhase("input");
      }
    }
  },[text]);

  useEffect(()=>{
    if(phase==="revealing"&&findings&&ri>=0&&ri<findings.length){setActive(findings[ri]);pRev(ri)}
    if(phase==="revealing"&&findings&&ri>=findings.length){setPhase("summary");setActive(null)}
  },[ri,phase,findings]);

  const reset=()=>{setPhase("input");setFindings(null);setRi(-1);setActive(null);setShowH(false);setText("");setTab("findings");setActiveEx(null);setDetailFinding(null);setActiveTx(null);setTxFinding(null);setErr(null);setAssessAnswers(null)};
  const togSel=f=>{
    const deselecting = active?.id===f.id;
    setActive(deselecting?null:f);
    setDetailFinding(deselecting?null:f);
    setActiveEx(null);
    setActiveTx(null);setTxFinding(null);
    setShowH(false);
  };
  const hBtn=()=>setShowH(!showH);
  const onTabChange=(t)=>{setTab(t);setActiveEx(null);setDetailFinding(null);setActiveTx(null);setTxFinding(null);if(t!=="findings")setActive(null)};
  const selectTx=(tx,f)=>{setActiveTx(tx);setTxFinding(f);setTab("treatments");setDetailFinding(null);setActiveEx(null);setActive(f)};
  const handleTxClose=(action,alt,f)=>{if(action==="switch"&&alt&&f){setActiveTx(alt);setTxFinding(f)}else{setActiveTx(null);setTxFinding(null)}};

  const inputUI=(pad)=>(
    <>
      <h2 style={{fontSize:mob?20:24,fontWeight:700,color:T.tx,margin:"0 0 6px",fontFamily:"Georgia,serif"}}>Understand Your Knee MRI</h2>
      <p style={{fontSize:mob?13:14,color:T.txL,margin:"0 0 18px",lineHeight:1.55}}>Paste the Impression section from your knee MRI report. We'll visualize each finding in 3D and explain what it means.</p>
      {err&&<div style={{padding:"10px 12px",background:"rgba(191,16,41,0.06)",border:"1px solid rgba(191,16,41,0.15)",borderRadius:8,marginBottom:12,fontSize:12,lineHeight:1.5,color:"#BF1029"}}>{err}</div>}
      <textarea value={text} onChange={e=>{setText(e.target.value);setErr(null)}} placeholder="Paste your MRI impression here..." style={{flex:1,minHeight:mob?120:160,background:T.bgD,border:`1px solid ${err?"rgba(191,16,41,0.3)":T.bd}`,borderRadius:12,padding:14,color:T.tx,fontSize:13,fontFamily:"'SF Mono',Consolas,monospace",lineHeight:1.7,resize:"none"}} />
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
  const mobContainerRef=useRef(null);
  const [mobSplit,setMobSplit]=useState(55); // percentage for 3D viewport height
  const mobDragging=useRef(false);

  const mobDragStart=useCallback((e)=>{
    e.preventDefault();
    mobDragging.current=true;
    const isTouch=e.type==="touchstart";
    const getY=(ev)=>isTouch?(ev.touches?.[0]?.clientY??0):(ev.clientY??0);
    const onMove=(ev)=>{
      if(!mobDragging.current||!mobContainerRef.current)return;
      if(isTouch)ev.preventDefault();
      const rect=mobContainerRef.current.getBoundingClientRect();
      const y=getY(ev)-rect.top;
      const pct=Math.max(25,Math.min(75,(y/rect.height)*100));
      setMobSplit(pct);
    };
    const onEnd=()=>{
      mobDragging.current=false;
      document.removeEventListener(isTouch?"touchmove":"mousemove",onMove);
      document.removeEventListener(isTouch?"touchend":"mouseup",onEnd);
      document.body.style.userSelect="";
    };
    document.addEventListener(isTouch?"touchmove":"mousemove",onMove,isTouch?{passive:false}:undefined);
    document.addEventListener(isTouch?"touchend":"mouseup",onEnd);
    document.body.style.userSelect="none";
  },[]);

  const hasDetail=!!(activeEx||activeTx||detailFinding);
  const mobDetailContent=activeEx
    ? <ExerciseDetail ex={activeEx} onClose={()=>setActiveEx(null)} mob={true} paid={paid} onUnlock={startCheckout} />
    : activeTx
    ? <TreatmentDetail tx={activeTx} finding={txFinding} onClose={handleTxClose} allFindings={findings} paid={paid} onUnlock={startCheckout} />
    : detailFinding
    ? <FindingDetail finding={detailFinding} onClose={()=>{setDetailFinding(null);setActive(null)}} mob={true} onSelectTx={selectTx} paid={paid} onUnlock={startCheckout} />
    : null;

  if(mob)return(
    <div style={{width:"100%",height:"100vh",background:T.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {styles}{hdr}
      {phase==="input"?<div style={{flex:1,overflow:"auto",padding:16,display:"flex",flexDirection:"column"}}>{inputUI()}</div>:(
        <div ref={mobContainerRef} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
          {/* 3D Viewport */}
          <div style={{height:`${mobSplit}%`,position:"relative",flexShrink:0,overflow:"hidden"}}>
            <KneeCanvas findings={findings} active={active} phase={phase} showH={showH} />
            {phase==="revealing"&&<NCard f={active} i={ri} n={findings?.length||0} onN={()=>setRi(i=>i+1)} onP={()=>setRi(i=>Math.max(0,i-1))} mob={true} />}
            {phase==="analyzing"&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(245,244,241,.6)"}}><div style={{width:28,height:28,border:`3px solid ${T.bgD}`,borderTopColor:T.ac,borderRadius:"50%",animation:"spin .8s linear infinite"}} /><span style={{fontSize:13,color:T.txM,marginTop:10}}>Analyzing...</span></div>}
          </div>
          {/* Vertical drag handle */}
          {phase==="summary"&&findings&&(
            <div
              style={{
                height:paid?10:28,flexShrink:0,background:T.sf,
                borderTop:"1px solid rgba(0,0,0,0.06)",borderBottom:"1px solid rgba(0,0,0,0.06)",
                display:"flex",alignItems:"center",justifyContent:"center",
                touchAction:"none",zIndex:5,gap:8,
              }}
            >
              <div onMouseDown={mobDragStart} onTouchStart={mobDragStart} style={{cursor:"row-resize",padding:"4px 12px",display:"flex",alignItems:"center"}}>
                <div style={{width:36,height:3,borderRadius:2,background:"rgba(0,0,0,0.12)"}} />
              </div>
              {!paid&&<button onClick={()=>setPaid(true)} style={{
                background:"linear-gradient(135deg,#0071E3,#0059B3)",border:"none",color:"#fff",
                padding:"3px 10px",borderRadius:5,fontSize:9,fontWeight:700,cursor:"pointer",
                letterSpacing:.5,boxShadow:"0 2px 6px rgba(0,113,227,0.2)",
              }}>🔓 Unlock Pro</button>}
            </div>
          )}
          {/* Bottom panel */}
          {phase==="summary"&&findings&&<div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:T.sf}}>
            {/* Persistent tab bar */}
            <div style={{padding:"8px 16px 0",flexShrink:0}}>
              <TabBar tab={tab} setTab={onTabChange} mob={true} paid={paid} />
            </div>
            {/* Content */}
            <div style={{flex:1,overflow:"auto",padding:"0 16px 16px"}}>
              {hasDetail ? mobDetailContent
               : tab==="findings" ? <Summary findings={findings} active={active} onSel={togSel} mob={true} />
               : tab==="exercises" ? <PTLibrary findings={findings} onSelectFinding={togSel} activeEx={activeEx} setActiveEx={setActiveEx} assessAnswers={assessAnswers} />
               : tab==="treatments" ? <TreatmentsTab findings={findings} activeTx={activeTx} setActiveTx={selectTx} txFinding={txFinding} />
               : tab==="report" ? <ReportTab findings={findings} onGenerateReport={(f,a)=>generateReport(f)} onComplete={(a)=>setAssessAnswers(a)} />
               : null}
            </div>
          </div>}
        </div>
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
            {phase==="summary"&&findings&&<>
              {!paid&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,padding:"6px 10px",background:"linear-gradient(135deg,rgba(0,113,227,0.06),rgba(0,89,179,0.04))",borderRadius:8,border:"1px solid rgba(0,113,227,0.1)"}}>
                <span style={{fontSize:11,color:"#0071E3",fontWeight:600}}>Preview Mode</span>
                <button onClick={()=>setPaid(true)} style={{
                  background:"linear-gradient(135deg,#0071E3,#0059B3)",border:"none",color:"#fff",
                  padding:"5px 12px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",
                  letterSpacing:.3,boxShadow:"0 2px 8px rgba(0,113,227,0.25)",display:"flex",alignItems:"center",gap:4,
                }}>🔓 Unlock Pro</button>
              </div>}
              {paid&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,padding:"6px 10px",background:"rgba(45,139,78,0.06)",borderRadius:8,border:"1px solid rgba(45,139,78,0.1)"}}>
                <span style={{fontSize:11,color:"#2D8B4E",fontWeight:600}}>✓ Pro Unlocked</span>
                <button onClick={()=>setPaid(false)} style={{
                  background:"transparent",border:"1px solid rgba(0,0,0,0.08)",color:"#AEAEB2",
                  padding:"4px 10px",borderRadius:5,fontSize:9,fontWeight:600,cursor:"pointer",
                }}>Lock</button>
              </div>}
              <TabbedPanel findings={findings} active={active} onSel={togSel} mob={false} tab={tab} setTab={onTabChange} activeEx={activeEx} setActiveEx={setActiveEx} activeTx={activeTx} setActiveTx={selectTx} txFinding={txFinding} paid={paid} onUnlock={startCheckout} />
            </>}
          </div>
        </div>
        <ResizableSplit
          show={!!(detailFinding||activeEx||activeTx)}
          defaultPct={50} minPct={30} maxPct={70}
          left={
            <div style={{width:"100%",height:"100%",position:"relative",background:`radial-gradient(ellipse at 50% 40%,#faf9f7 0%,${T.bg} 100%)`}}>
              <KneeCanvas findings={findings} active={active} phase={phase} showH={showH} />
              {phase==="revealing"&&<NCard f={active} i={ri} n={findings?.length||0} onN={()=>setRi(i=>i+1)} onP={()=>setRi(i=>Math.max(0,i-1))} mob={false} />}
              {active&&phase==="summary"&&!detailFinding&&!activeEx&&!activeTx&&<div style={{position:"absolute",top:14,left:14,background:T.sf,padding:"7px 14px",borderRadius:9,boxShadow:"0 2px 12px rgba(0,0,0,.05)",fontSize:13,fontWeight:600,color:T.tx,zIndex:10,animation:"fadeIn .3s"}}>{active.str} <span style={{color:T[active.sev].c,fontSize:11,marginLeft:6}}>● {active.path}</span></div>}
              <div style={{position:"absolute",top:14,right:14,fontSize:10,color:T.txF,pointerEvents:"none"}}>Drag to rotate · Scroll to zoom</div>
              {phase==="input"&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none"}}><div style={{fontSize:48,marginBottom:14,opacity:.15}}>🦴</div><div style={{fontSize:15,color:T.txL,fontWeight:500}}>Your 3D knee model</div><div style={{fontSize:12,color:T.txF,marginTop:6}}>Paste an MRI report to see findings visualized</div></div>}
              {phase==="summary"&&!detailFinding&&!activeEx&&!activeTx&&<div style={{position:"absolute",bottom:20,left:20,right:20,maxWidth:440,background:paid?"#fff":"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",borderRadius:11,padding:"14px 18px",boxShadow:"0 4px 20px rgba(0,0,0,.08)",border:paid?`1px solid ${T.bd}`:"none",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:10,animation:"slideUp .5s cubic-bezier(.16,1,.3,1)"}}><div><div style={{fontSize:13,fontWeight:600,color:paid?T.tx:"#fff"}}>{paid?"Your full report is ready":"Unlock detailed analysis"}</div><div style={{fontSize:11,color:paid?T.txL:"rgba(255,255,255,0.8)",marginTop:2}}>{paid?"Specialist perspectives, exercises, questions":"Specialist insights, exercise guides, treatment deep-dives"}</div></div><button onClick={paid?()=>generateReport(findings):startCheckout} style={{background:paid?T.ac:"#fff",border:"none",color:paid?"#fff":"#0071E3",padding:"9px 18px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,marginLeft:14,boxShadow:paid?"none":"0 2px 8px rgba(0,0,0,0.15)"}}>{paid?"Download PDF":`${PRICE} — Unlock Pro`}</button></div>}
            </div>
          }
          right={
            activeEx
              ? <ExerciseDetail ex={activeEx} onClose={()=>setActiveEx(null)} mob={false} paid={paid} onUnlock={startCheckout} />
              : activeTx
              ? <TreatmentDetail tx={activeTx} finding={txFinding} onClose={handleTxClose} allFindings={findings} paid={paid} onUnlock={startCheckout} />
              : <FindingDetail finding={detailFinding} onClose={()=>{setDetailFinding(null);setActive(null)}} mob={false} onSelectTx={selectTx} paid={paid} onUnlock={startCheckout} />
          }
        />
      </div>
    </div>
  );
}
