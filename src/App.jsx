import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import * as THREE from "three";
import * as Tone from "tone";
import { generateReport } from "./reportGenerator";
import PTLibrary from "./PTLibrary";
import { detectJoint, parseReport, JOINT_INFO } from "./jointRouter";

/* ═══════════════════ DESIGN TOKENS ═══════════════════ */
const TL = {
  bg:"#F5F4F1",bgD:"#ECEAE6",sf:"#FFFFFF",sfA:"#FAFAF8",
  tx:"#1D1D1F",txM:"#6E6E73",txL:"#AEAEB2",txF:"#C7C7CC",
  ac:"#0071E3",acS:"rgba(0,113,227,0.07)",
  bd:"rgba(0,0,0,0.06)",bdM:"rgba(0,0,0,0.1)",
  mild:{c:"#A68B00",bg:"rgba(166,139,0,0.06)",bd:"rgba(166,139,0,0.18)",g:0xa68b00},
  moderate:{c:"#C45D00",bg:"rgba(196,93,0,0.06)",bd:"rgba(196,93,0,0.18)",g:0xc45d00},
  severe:{c:"#BF1029",bg:"rgba(191,16,41,0.06)",bd:"rgba(191,16,41,0.18)",g:0xbf1029},
  hBone:0xf0e8dc,hCart:0xc2dae8,hLig:0xe5ddd5,hMen:0xa8c8de,hFlu:0xccc080,
  canvasBg:0xf5f4f1,canvasFog:0xf5f4f1,canvasGround:0xeceae6,
};
const TD = {
  bg:"#1A1A1E",bgD:"#141416",sf:"#242428",sfA:"#1E1E22",
  tx:"#E8E8ED",txM:"#A0A0A8",txL:"#6B6B73",txF:"#4A4A52",
  ac:"#4DA3FF",acS:"rgba(77,163,255,0.1)",
  bd:"rgba(255,255,255,0.08)",bdM:"rgba(255,255,255,0.12)",
  mild:{c:"#D4B000",bg:"rgba(212,176,0,0.1)",bd:"rgba(212,176,0,0.2)",g:0xd4b000},
  moderate:{c:"#E88030",bg:"rgba(232,128,48,0.1)",bd:"rgba(232,128,48,0.2)",g:0xe88030},
  severe:{c:"#FF4060",bg:"rgba(255,64,96,0.1)",bd:"rgba(255,64,96,0.2)",g:0xff4060},
  hBone:0xc8bca8,hCart:0x8aacc8,hLig:0xb8a898,hMen:0x7898b0,hFlu:0xa8a060,
  canvasBg:0x1a1a1e,canvasFog:0x1a1a1e,canvasGround:0x242428,
};
let T = TL;

/* ═══════════════════ DATA ═══════════════════ */
const SAMPLE=`IMPRESSION:
1. Horizontal tear of the posterior horn of the medial meniscus.
2. Complete tear of the ACL with associated bone bruising of the lateral femoral condyle and posterolateral tibial plateau.
3. Moderate joint effusion.
4. Grade 2 chondromalacia of the medial femoral condyle.
5. Small Baker's cyst.`;

const SHOULDER_SAMPLE=`IMPRESSION:
1. Full-thickness tear of the supraspinatus tendon with 1cm retraction.
2. Partial articular-side tear of the infraspinatus tendon.
3. Superior labral tear (SLAP lesion) extending from anterior to posterior.
4. Moderate subacromial bursitis with type 2 acromion.
5. Small glenohumeral joint effusion.`;

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

function buildShoulder(){
  const g=new THREE.Group();
  const mk=(geo,col,n,p,r,s,op)=>{const mt=new THREE.MeshStandardMaterial({color:col,roughness:.4,metalness:.02,transparent:op!=null,opacity:op??1});const m=new THREE.Mesh(geo,mt);if(p)m.position.set(...p);if(r)m.rotation.set(...r);if(s)m.scale.set(...s);m.name=n;g.add(m);return m;};

  // Scapula body (flat triangular plate)
  const scapGeo=new THREE.BoxGeometry(1.4,1.8,.08);
  mk(scapGeo,T.hBone,"scapula_body",[-0.3,0.4,-0.6],[0,0.15,0]);

  // Glenoid (socket face)
  const glenGeo=new THREE.SphereGeometry(.32,20,16);glenGeo.scale(.8,1,.5);
  mk(glenGeo,T.hBone,"glenoid",[0.15,0.5,-.15],[0,0.2,0]);

  // Acromion (shelf over top)
  const acromGeo=new THREE.BoxGeometry(.8,.08,.35);
  mk(acromGeo,T.hBone,"acromion",[0,1.35,0.05],[0,0,-0.08]);

  // Clavicle
  const clavCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.7,1.4,0.1),new THREE.Vector3(0.1,1.5,0.15),new THREE.Vector3(0.8,1.35,0));
  mk(new THREE.TubeGeometry(clavCurve,20,.06,10),T.hBone,"clavicle");

  // AC joint (small sphere at acromion-clavicle junction)
  mk(new THREE.SphereGeometry(.07,10,8),T.hLig,"ac_joint",[0.05,1.38,0.05]);

  // Humeral head (ball)
  const hh=new THREE.SphereGeometry(.48,24,20);hh.scale(1,.95,.9);
  mk(hh,T.hBone,"humeral_head",[0.35,0.55,0.2]);

  // Humeral shaft
  mk(new THREE.CylinderGeometry(.14,.12,2.8,16),T.hBone,"humerus",[0.4,-1.0,0.25],[0,0,0.06]);

  // Labrum (ring around glenoid)
  mk(new THREE.TorusGeometry(.3,.045,12,32),T.hCart,"labrum",[0.15,0.5,-.05],[0,0.2,0],null,.8);

  // Capsule (transparent shell around joint)
  const capGeo=new THREE.SphereGeometry(.65,20,16);capGeo.scale(1.1,1,.9);
  mk(capGeo,0xd8d0c8,"capsule",[0.25,0.5,0.05],null,null,.12);

  // Supraspinatus (tendon over top of humeral head)
  const supCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.4,1.0,-0.3),new THREE.Vector3(0.0,1.1,0.0),new THREE.Vector3(0.35,0.95,0.15));
  mk(new THREE.TubeGeometry(supCurve,20,.055,10),T.hLig,"supraspinatus");

  // Infraspinatus (tendon on back)
  const infCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.5,0.5,-0.6),new THREE.Vector3(-0.1,0.6,-0.3),new THREE.Vector3(0.3,0.55,0.0));
  mk(new THREE.TubeGeometry(infCurve,20,.05,10),T.hLig,"infraspinatus");

  // Subscapularis (tendon on front)
  const subCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.3,0.3,0.0),new THREE.Vector3(0.0,0.45,0.25),new THREE.Vector3(0.3,0.5,0.35));
  mk(new THREE.TubeGeometry(subCurve,20,.05,10),T.hLig,"subscapularis");

  // Teres minor (tendon below infraspinatus)
  const tmCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.4,0.1,-0.5),new THREE.Vector3(-0.05,0.2,-0.2),new THREE.Vector3(0.3,0.3,0.05));
  mk(new THREE.TubeGeometry(tmCurve,20,.04,10),T.hLig,"teres_minor");

  // Biceps tendon (long head — through groove)
  const bicCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.15,0.85,-.05),new THREE.Vector3(0.38,0.6,0.3),new THREE.Vector3(0.42,-0.1,0.35));
  mk(new THREE.TubeGeometry(bicCurve,20,.025,8),0xc8b8a8,"biceps_tendon");

  // Effusion (fluid in joint — hidden by default)
  const efGeo=new THREE.SphereGeometry(.4,16,12);efGeo.scale(.9,.7,.7);
  mk(efGeo,T.hFlu,"effusion",[0.25,0.5,0.1],null,null,0);

  return g;
}

const JOINT_BUILDERS = { knee: buildKnee, shoulder: buildShoulder };
const JOINT_DEFAULTS = {
  knee:     { pos:[3.5,1.5,3.5], tgt:[0,.2,0], sumPos:[3,1.2,3], sumTgt:[0,.1,0] },
  shoulder: { pos:[3,2,3.5],     tgt:[0.1,0.5,0], sumPos:[2.5,1.5,3], sumTgt:[0.1,0.5,0] },
};

/* ═══════════════════ 3D CANVAS ═══════════════════ */
function JointCanvas({findings,active,phase,showH,joint,dark,onStructureClick}){
  const ref=useRef(),rr=useRef({}),cm=useRef(null),ob=useRef({ry:0,rx:0,dn:false,lx:0,ly:0});
  const currentJoint=useRef(null);

  useEffect(()=>{
    const el=ref.current;if(!el)return;
    const j=joint||"knee";
    const def=JOINT_DEFAULTS[j]||JOINT_DEFAULTS.knee;

    // Init camera manager
    cm.current={pos:new THREE.Vector3(...def.pos),tgt:new THREE.Vector3(...def.tgt),pT:new THREE.Vector3(...def.pos),tT:new THREE.Vector3(...def.tgt)};

    let W=el.clientWidth,H=el.clientHeight;
    const r=new THREE.WebGLRenderer({antialias:true});r.setSize(W,H);r.setPixelRatio(Math.min(devicePixelRatio,2));
    r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.15;r.setClearColor(T.canvasBg);el.appendChild(r.domElement);
    const sc=new THREE.Scene();sc.fog=new THREE.Fog(T.canvasFog,10,22);
    const ca=new THREE.PerspectiveCamera(30,W/H,.1,50);ca.position.copy(cm.current.pos);
    sc.add(new THREE.AmbientLight(0xe8e4df,.85));
    const k=new THREE.DirectionalLight(0xffffff,1.5);k.position.set(3,6,4);sc.add(k);
    sc.add(new THREE.DirectionalLight(0xdde4f0,.4).position.set(-4,3,-2));
    sc.add(new THREE.DirectionalLight(0xf0e8e0,.25).position.set(0,-2,-4));
    const gm=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:T.canvasGround,roughness:1}));
    gm.rotation.x=-Math.PI/2;gm.position.y=-3.2;sc.add(gm);

    const builder=JOINT_BUILDERS[j]||JOINT_BUILDERS.knee;
    const model=builder();sc.add(model);currentJoint.current=j;

    const ms={};model.traverse(c=>{if(c.isMesh){ms[c.name]=c;c.userData.oC=c.material.color.clone();c.userData.oO=c.material.opacity;c.userData.oE=c.material.emissive?.clone()||new THREE.Color(0)}});
    rr.current={r,sc,ca,ms};
    const o=ob.current;o.ry=0;o.rx=0;
    const pd=e=>{o.dn=true;o.lx=e.clientX??e.touches?.[0]?.clientX;o.ly=e.clientY??e.touches?.[0]?.clientY};
    const pm=e=>{if(!o.dn)return;const cx=e.clientX??e.touches?.[0]?.clientX,cy=e.clientY??e.touches?.[0]?.clientY;o.ry+=(cx-o.lx)*.005;o.rx=Math.max(-.5,Math.min(.5,o.rx+(cy-o.ly)*.003));o.lx=cx;o.ly=cy};
    const pu=()=>{o.dn=false};
    const wh=e=>{e.preventDefault();const c2=cm.current,d=c2.pT.clone().sub(c2.tT).normalize().multiplyScalar(e.deltaY*.003),np=c2.pT.clone().add(d);if(np.distanceTo(c2.tT)>1.5&&np.distanceTo(c2.tT)<8)c2.pT.copy(np)};
    el.addEventListener("pointerdown",pd);el.addEventListener("pointermove",pm);el.addEventListener("pointerup",pu);el.addEventListener("pointerleave",pu);el.addEventListener("wheel",wh,{passive:false});
    // Raycasting for anatomy explorer click
    const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2();
    let clickStart={x:0,y:0,t:0};
    const onClickDown=(e)=>{clickStart={x:e.clientX,y:e.clientY,t:Date.now()}};
    const onClickUp=(e)=>{
      const dx=Math.abs(e.clientX-clickStart.x),dy=Math.abs(e.clientY-clickStart.y),dt=Date.now()-clickStart.t;
      if(dx>5||dy>5||dt>300)return; // was a drag, not a click
      const rect=el.getBoundingClientRect();
      mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
      mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(mouse,ca);
      const meshes=[];model.traverse(c=>{if(c.isMesh)meshes.push(c)});
      const hits=raycaster.intersectObjects(meshes);
      if(hits.length>0&&onStructureClick){onStructureClick(hits[0].object.name)}
    };
    el.addEventListener("pointerdown",onClickDown);el.addEventListener("pointerup",onClickUp);
    const onR=()=>{W=el.clientWidth;H=el.clientHeight;ca.aspect=W/H;ca.updateProjectionMatrix();r.setSize(W,H)};
    window.addEventListener("resize",onR);
    let raf;const anim=()=>{raf=requestAnimationFrame(anim);const c2=cm.current;if(!o.dn)o.ry+=.0006;const rad=c2.pT.length();const op=new THREE.Vector3(Math.sin(o.ry)*rad*Math.cos(o.rx),c2.pT.y+Math.sin(o.rx)*rad*.5,Math.cos(o.ry)*rad*Math.cos(o.rx));c2.pos.lerp(op,.04);c2.tgt.lerp(c2.tT,.04);ca.position.copy(c2.pos);ca.lookAt(c2.tgt);r.render(sc,ca)};anim();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",onR);r.dispose();if(el.contains(r.domElement))el.removeChild(r.domElement)};
  },[joint,dark]);

  useEffect(()=>{
    const c2=cm.current;if(!c2)return;
    const j=joint||"knee";const def=JOINT_DEFAULTS[j]||JOINT_DEFAULTS.knee;
    if(active?.cam){c2.pT.set(...active.cam.p);c2.tT.set(...active.cam.t)}
    else if(phase==="summary"){c2.pT.set(...def.sumPos);c2.tT.set(...def.sumTgt)}
    else{c2.pT.set(...def.pos);c2.tT.set(...def.tgt)}
  },[active,phase,joint]);

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
/* ═══════════════════ ANATOMY EXPLORER ═══════════════════ */
const ANATOMY_INFO={
  // Knee
  femur:{name:"Femur (Thigh Bone)",cat:"Bone",desc:"The largest bone in the body. Forms the upper part of the knee joint. The rounded ends (condyles) articulate with the tibia below.",injuries:"Femoral fractures, bone bruises, osteochondral defects",role:"Primary load-bearing bone of the thigh. Transfers force from hip to knee."},
  condyle_medial:{name:"Medial Femoral Condyle",cat:"Bone",desc:"The rounded inner end of the femur. Covered in articular cartilage and contacts the medial meniscus.",injuries:"Bone bruises, cartilage defects, osteonecrosis",role:"Articulates with the tibia's medial plateau. Key weight-bearing surface."},
  condyle_lateral:{name:"Lateral Femoral Condyle",cat:"Bone",desc:"The rounded outer end of the femur. Frequently bruised in ACL injuries due to pivot-shift mechanism.",injuries:"Bone bruises (especially with ACL tears), cartilage damage",role:"Articulates with the tibia's lateral plateau. Absorbs rotational forces."},
  tibia:{name:"Tibia (Shin Bone)",cat:"Bone",desc:"The main weight-bearing bone of the lower leg. The tibial plateau forms the bottom of the knee joint.",injuries:"Tibial plateau fractures, bone bruises, stress fractures",role:"Supports body weight. Provides anchor points for cruciate and collateral ligaments."},
  tibial_plateau:{name:"Tibial Plateau",cat:"Bone",desc:"The flat upper surface of the tibia. Divided into medial and lateral compartments, each cushioned by a meniscus.",injuries:"Plateau fractures, cartilage wear, bone edema",role:"Creates the stable platform that the femoral condyles glide on."},
  patella:{name:"Patella (Kneecap)",cat:"Bone",desc:"A sesamoid bone embedded in the quadriceps tendon. Protects the front of the knee and improves leverage for straightening.",injuries:"Patellar fractures, chondromalacia, subluxation/dislocation",role:"Acts as a pulley for the quadriceps. Increases mechanical advantage by 30%."},
  fibula:{name:"Fibula",cat:"Bone",desc:"The thin outer bone of the lower leg. Doesn't bear much weight but provides attachment for the LCL and biceps femoris.",injuries:"Fibular fractures (often with ankle injuries), LCL avulsion",role:"Lateral stability. Anchor for the lateral collateral ligament."},
  meniscus_medial:{name:"Medial Meniscus",cat:"Cartilage",desc:"C-shaped cartilage cushion on the inner side of the knee. Absorbs shock and distributes load across the joint.",injuries:"Tears (posterior horn most common), degenerative changes, root tears",role:"Shock absorber. Distributes 50% of weight-bearing load in the medial compartment."},
  meniscus_lateral:{name:"Lateral Meniscus",cat:"Cartilage",desc:"More circular cartilage cushion on the outer side. More mobile than the medial meniscus, so tears less often.",injuries:"Tears (often with ACL injuries), discoid meniscus variants",role:"Shock absorption. More mobile than medial — better at accommodating rotation."},
  acl:{name:"ACL (Anterior Cruciate Ligament)",cat:"Ligament",desc:"Runs diagonally through the center of the knee from the femur to the tibia. Prevents the tibia from sliding forward.",injuries:"Partial tears, complete tears (most common sport ligament injury), chronic ACL deficiency",role:"Primary restraint against anterior tibial translation. Critical for pivoting/cutting sports."},
  pcl:{name:"PCL (Posterior Cruciate Ligament)",cat:"Ligament",desc:"The strongest ligament in the knee. Crosses behind the ACL and prevents the tibia from sliding backward.",injuries:"Tears (usually from dashboard injuries or hyperextension), avulsions",role:"Prevents posterior tibial translation. Twice as strong as the ACL."},
  mcl:{name:"MCL (Medial Collateral Ligament)",cat:"Ligament",desc:"Runs along the inner side of the knee from femur to tibia. Resists forces that push the knee inward (valgus stress).",injuries:"Sprains (grade I-III), tears, often combined with ACL/meniscus injuries",role:"Primary valgus stabilizer. Most commonly injured knee ligament."},
  lcl:{name:"LCL (Lateral Collateral Ligament)",cat:"Ligament",desc:"A cord-like ligament on the outer side. Resists forces pushing the knee outward (varus stress).",injuries:"Sprains, tears, posterolateral corner injuries",role:"Varus stabilizer. Part of the posterolateral corner complex."},
  cartilage_medial:{name:"Medial Articular Cartilage",cat:"Cartilage",desc:"Smooth, glassy covering on the medial femoral condyle. Allows near-frictionless gliding between bones.",injuries:"Chondral defects, thinning (osteoarthritis), osteochondral lesions",role:"Low-friction surface for joint motion. Cannot regenerate once damaged."},
  cartilage_lateral:{name:"Lateral Articular Cartilage",cat:"Cartilage",desc:"Articular cartilage covering the lateral femoral condyle. Similar properties to medial but lower weight-bearing demands.",injuries:"Chondral damage, early arthritis, osteochondral defects",role:"Friction-free surface. Works with lateral meniscus to distribute load."},
  effusion:{name:"Joint Effusion",cat:"Fluid",desc:"Excess fluid inside the knee joint capsule. A sign of inflammation, injury, or irritation — the knee's way of signaling a problem.",injuries:"Present with most acute injuries, arthritis flares, infections",role:"Normal synovial fluid lubricates the joint. Excess signals pathology."},
  bakers_cyst:{name:"Baker's Cyst",cat:"Fluid",desc:"A fluid-filled sac behind the knee (popliteal fossa). Often communicates with the joint and fills when there's excess fluid.",injuries:"Cyst formation, rupture (mimics DVT), associated with meniscal tears/arthritis",role:"Pressure relief valve for joint fluid. Usually a secondary finding."},
  // Shoulder
  scapula_body:{name:"Scapula (Shoulder Blade)",cat:"Bone",desc:"Large flat triangular bone on the back of the ribcage. Houses the glenoid socket and provides muscle attachment for 17 muscles.",injuries:"Fractures (rare, high-energy), scapular winging",role:"Platform for rotator cuff. Coordinates shoulder blade movement (scapulohumeral rhythm)."},
  glenoid:{name:"Glenoid (Socket)",cat:"Bone",desc:"The shallow socket of the shoulder joint on the scapula. Only covers about 1/3 of the humeral head, relying on the labrum for depth.",injuries:"Fractures (Bankart lesion involves the bony glenoid), erosion, dysplasia",role:"Provides the socket for the ball-and-socket joint. Shallow = mobile but less stable."},
  acromion:{name:"Acromion",cat:"Bone",desc:"The bony shelf extending over the top of the shoulder. The supraspinatus passes underneath through the subacromial space.",injuries:"Bone spurs (impingement), fractures, os acromiale (unfused growth plate)",role:"Protects the rotator cuff from above. Shape affects impingement risk (Type I-III)."},
  clavicle:{name:"Clavicle (Collarbone)",cat:"Bone",desc:"The S-shaped bone connecting the shoulder to the sternum. The only bony connection between arm and trunk.",injuries:"Fractures (most common broken bone), AC joint separation",role:"Strut connecting arm to axial skeleton. Protects vessels and nerves underneath."},
  ac_joint:{name:"AC Joint",cat:"Joint",desc:"The junction where the clavicle meets the acromion. A small but important joint that allows overhead arm movement.",injuries:"Separation (grades I-VI), osteoarthritis, distal clavicle osteolysis (weightlifter's shoulder)",role:"Allows scapula to rotate upward as arm is raised. High stress with overhead activity."},
  humeral_head:{name:"Humeral Head",cat:"Bone",desc:"The ball of the ball-and-socket shoulder joint. About 1/3 of a sphere, larger than the glenoid socket it sits in.",injuries:"Fractures, Hill-Sachs lesions (dent from dislocation), avascular necrosis",role:"Articulates with the glenoid. Its large size relative to the socket allows extreme range of motion."},
  humerus:{name:"Humerus (Upper Arm Bone)",cat:"Bone",desc:"The long bone of the upper arm. The surgical neck (just below the head) is a common fracture site.",injuries:"Fractures (proximal, shaft, distal), stress fractures in throwers",role:"Lever arm for shoulder and elbow movements. Attachment for deltoid, biceps, triceps."},
  labrum:{name:"Labrum",cat:"Cartilage",desc:"A ring of fibrous cartilage that deepens the glenoid socket by about 50%. Critical for shoulder stability and suction-cup effect.",injuries:"SLAP tears (top), Bankart tears (front-bottom), posterior tears, degenerative fraying",role:"Deepens the socket. Creates negative pressure seal. Anchor for biceps tendon (superior labrum)."},
  capsule:{name:"Joint Capsule",cat:"Soft Tissue",desc:"A fibrous envelope surrounding the entire shoulder joint. Loose enough to allow wide range of motion but thickened into ligaments at key points.",injuries:"Adhesive capsulitis (frozen shoulder), capsular tears, laxity",role:"Contains joint fluid. Glenohumeral ligaments are thickenings within the capsule."},
  supraspinatus:{name:"Supraspinatus",cat:"Rotator Cuff",desc:"Runs over the top of the shoulder from the scapula to the greater tuberosity. Most commonly torn rotator cuff tendon.",injuries:"Tendinosis, partial tears, full-thickness tears with or without retraction",role:"Initiates arm abduction (first 15°). Holds humeral head down in socket during overhead movement."},
  infraspinatus:{name:"Infraspinatus",cat:"Rotator Cuff",desc:"Covers the back of the scapula below the spine. Second most commonly torn rotator cuff tendon.",injuries:"Tendinosis, tears (often extend from supraspinatus), atrophy from nerve compression",role:"External rotation of the arm. Critical for deceleration in throwing athletes."},
  subscapularis:{name:"Subscapularis",cat:"Rotator Cuff",desc:"The largest rotator cuff muscle, on the front of the scapula. Less commonly torn but important for internal rotation.",injuries:"Tears (often missed), subluxation of biceps tendon when torn",role:"Internal rotation. Anterior stabilizer of the humeral head. Protects biceps groove."},
  teres_minor:{name:"Teres Minor",cat:"Rotator Cuff",desc:"Small muscle on the back of the scapula below the infraspinatus. Rarely torn in isolation.",injuries:"Isolated tears (rare), atrophy from quadrilateral space syndrome",role:"External rotation (assists infraspinatus). Stabilizes posterior humeral head."},
  biceps_tendon:{name:"Biceps Tendon (Long Head)",cat:"Tendon",desc:"Runs from the superior labrum, through the bicipital groove, and down the front of the humerus. Often a pain generator.",injuries:"Tendinosis, partial tears, subluxation/dislocation from groove, SLAP tears at anchor",role:"Elbow flexion and forearm supination. Minor role as humeral head depressor."},
};

function AnatomyExplorerCard({structureName,onClose,joint}){
  const info=ANATOMY_INFO[structureName];
  if(!info)return(
    <div style={{position:"absolute",bottom:20,left:20,right:20,maxWidth:380,background:T.sf,borderRadius:12,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.12)",border:`1px solid ${T.bd}`,zIndex:20,animation:"slideUp .3s cubic-bezier(.16,1,.3,1)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:700,color:T.tx}}>{structureName.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</span>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:16,color:T.txL,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{fontSize:11,color:T.txM,marginTop:4}}>Tap a specific structure to learn more about it.</div>
    </div>
  );

  const catColors={Bone:"#8B7355",Cartilage:"#4A90D9",Ligament:"#7B6B5A","Rotator Cuff":"#9B59B6",Tendon:"#8B6914","Soft Tissue":"#6B8E6B",Fluid:"#B8A040",Joint:"#D4A373"};
  const catColor=catColors[info.cat]||T.txM;

  return(
    <div style={{position:"absolute",bottom:20,left:20,right:20,maxWidth:400,background:T.sf,borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",border:`1px solid ${T.bd}`,zIndex:20,animation:"slideUp .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"12px 16px 10px",borderBottom:`1px solid ${T.bd}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
              <span style={{fontSize:8,fontWeight:700,color:catColor,background:catColor+"14",padding:"2px 6px",borderRadius:3,textTransform:"uppercase",letterSpacing:.8}}>{info.cat}</span>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:T.tx,fontFamily:"Georgia,serif"}}>{info.name}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:16,color:T.txL,cursor:"pointer",padding:"2px 4px"}}>✕</button>
        </div>
      </div>
      {/* Body */}
      <div style={{padding:"12px 16px",maxHeight:200,overflow:"auto"}}>
        <div style={{fontSize:12,color:T.tx,lineHeight:1.6,marginBottom:10}}>{info.desc}</div>
        <div style={{fontSize:11,color:T.txM,lineHeight:1.5,marginBottom:6}}>
          <span style={{fontWeight:700,color:T.tx}}>Function: </span>{info.role}
        </div>
        <div style={{fontSize:11,color:T.txM,lineHeight:1.5}}>
          <span style={{fontWeight:700,color:T.severe?.c||"#BF1029"}}>Common injuries: </span>{info.injuries}
        </div>
      </div>
      {/* Footer hint */}
      <div style={{padding:"8px 16px",background:T.bgD,fontSize:10,color:T.txL,textAlign:"center"}}>
        Tap other structures to explore · Drag to rotate the model
      </div>
    </div>
  );
}

function Gauge({score,sev}){const s=T[sev];return(
  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5}}>
    <div style={{flex:1,height:4,background:"rgba(0,0,0,0.04)",borderRadius:2,overflow:"hidden"}}>
      <div style={{width:`${score*100}%`,height:"100%",background:s.c,borderRadius:2,transition:"width .8s cubic-bezier(.16,1,.3,1)"}} />
    </div>
    <span style={{fontSize:10,color:T.txL,width:55,textAlign:"right"}}>{score<.3?"Low concern":score<.6?"Moderate":"Significant"}</span>
  </div>
)}

/* ═══════════════════ NARRATIVE CARD ═══════════════════ */
/* ═══════════════════ ANALYZING SPLASH ═══════════════════ */
function AnalyzingSplash({joint,mob,findings}){
  const jLabel=joint==="shoulder"?"Shoulder":joint==="hip"?"Hip":"Knee";
  const[progress,setProgress]=useState(0);
  const[label,setLabel]=useState("Reading report...");
  useEffect(()=>{
    const steps=[
      {t:0,p:20,l:"Reading report..."},
      {t:300,p:50,l:"Identifying structures..."},
      {t:600,p:75,l:"Classifying pathology..."},
      {t:900,p:90,l:"Building 3D model..."},
      {t:1200,p:100,l:"Done"},
    ];
    const timers=steps.map(s=>setTimeout(()=>{setProgress(s.p);setLabel(s.l)},s.t));
    return()=>timers.forEach(clearTimeout);
  },[]);
  return(
    <div style={{position:"absolute",inset:0,zIndex:25,background:`radial-gradient(ellipse at 50% 40%,${T.sfA}f8,${T.bg}fa)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"fadeIn .2s"}}>
      <div style={{width:mob?220:280,marginBottom:20}}>
        {/* Progress bar */}
        <div style={{height:4,background:T.bgD,borderRadius:2,overflow:"hidden",marginBottom:12}}>
          <div style={{height:"100%",background:"linear-gradient(90deg,#0071E3,#1A7F7A)",borderRadius:2,width:`${progress}%`,transition:"width .3s ease-out"}} />
        </div>
        {/* Label */}
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:mob?15:17,fontWeight:700,color:T.tx,marginBottom:4,fontFamily:"Georgia,serif"}}>Analyzing {jLabel} MRI</div>
          <div style={{fontSize:12,color:T.txM,transition:"opacity .2s"}}>{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ FINDING TOOLTIP (auto-tour) ═══════════════════ */
function FindingTooltip({f,i,n,mob,progress}){
  if(!f)return null;
  const s=T[f.sev];
  return(
    <div key={f.id} style={{
      position:"absolute",bottom:mob?0:24,left:mob?0:"50%",
      transform:mob?"none":"translateX(-50%)",
      width:mob?"100%":"min(400px,calc(100%-60px))",
      background:"rgba(255,255,255,0.95)",backdropFilter:"blur(16px)",
      borderRadius:mob?"14px 14px 0 0":12,
      boxShadow:"0 -4px 30px rgba(0,0,0,.1)",
      padding:mob?"14px 16px 20px":"14px 18px",
      zIndex:20,borderTop:`3px solid ${s.c}`,
      animation:"slideUp .4s cubic-bezier(.16,1,.3,1)",
    }}>
      {/* Progress bar */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,borderRadius:"12px 12px 0 0",overflow:"hidden"}}>
        <div style={{height:"100%",background:s.c,width:`${progress}%`,transition:"width .1s linear"}} />
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:s.c,background:s.bg,border:`1px solid ${s.bd}`,padding:"2px 7px",borderRadius:4}}>{f.sev}</span>
        <span style={{fontSize:10,color:T.txL,fontFamily:"monospace"}}>{i+1} of {n}</span>
        <div style={{marginLeft:"auto",display:"flex",gap:3}}>
          {Array.from({length:n}).map((_,di)=>(
            <div key={di} style={{width:di===i?12:6,height:4,borderRadius:2,background:di===i?s.c:di<i?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.06)",transition:"all .3s"}} />
          ))}
        </div>
      </div>
      <h3 style={{fontSize:16,fontWeight:700,color:T.tx,margin:"0 0 2px",fontFamily:"Georgia,serif"}}>{f.str}</h3>
      <div style={{fontSize:12,fontWeight:600,color:s.c,marginBottom:4}}>{f.path}</div>
      <Gauge score={f.sc} sev={f.sev} />
      <p style={{fontSize:12.5,lineHeight:1.6,color:T.txM,margin:"8px 0 0",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{f.desc}</p>
    </div>
  );
}

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
      <button onClick={()=>generateReport(findings,joint,recoveryStage)} style={{background:T.ac,border:"none",color:"#fff",padding:"9px 22px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>Download Full Report (PDF)</button>
    </div>
  </div>
)}

/* ═══════════════════ TRUST ═══════════════════ */
/* ═══════════════════ RECOVERY TIMELINE VISUAL ═══════════════════ */
function RecoveryTimeline({finding,joint,selected,onSelect}){
  const teal="#1A7F7A";

  const buildPhases=()=>{
    const phases=[];
    const j=joint||"knee";
    const sev=finding.sev||"moderate";
    const hasSurgical=finding.treatments?.some(t=>t.type==="surgical");

    if(sev==="severe"||hasSurgical){
      if(j==="shoulder"){
        phases.push({week:"Now",title:"Just Diagnosed",desc:"You have your MRI results and are deciding next steps",icon:"📋",meters:{pain:70,mobility:35,strength:40},
          items:["You may have pain at rest or with certain movements","Reaching overhead or behind your back is difficult","Sleep may be disrupted lying on the affected side","You're weighing conservative vs. surgical options"]});
        phases.push({week:"0-2",title:"Starting Treatment",desc:"Whether PT or post-surgery, this is the protection window",icon:"🛡️",meters:{pain:60,mobility:20,strength:25},
          items:["Arm may be in a sling or movement is restricted","Pain is managed with ice, medication, or both","Gentle pendulum exercises to prevent stiffness","Showering & dressing may need help or adaptation"]});
        phases.push({week:"3-6",title:"Getting Motion Back",desc:"Moving more, but still have clear limitations",icon:"🤲",meters:{pain:40,mobility:50,strength:40},
          items:["You can reach forward but overhead is still limited","Stiffness is the main complaint, not sharp pain","Assisted stretches and light isometrics are tolerable","Driving and desk work are becoming manageable"]});
        phases.push({week:"6-12",title:"Building Strength",desc:"Motion is better — working on power and endurance",icon:"💪",meters:{pain:20,mobility:70,strength:60},
          items:["You can reach overhead with some effort","Carrying light groceries or bags is possible","Resistance band and light dumbbell work tolerated","Sleeping on the affected side still uncomfortable"]});
        phases.push({week:"12-20",title:"Returning to Activity",desc:"Most daily tasks done — testing sport-like movements",icon:"🏃",meters:{pain:10,mobility:85,strength:80},
          items:["Lifting, pushing, pulling with moderate confidence","Throwing or overhead movements being reintroduced","Work duties mostly or fully resumed","Soreness after activity is normal but improving"]});
        phases.push({week:"20-26",title:"Full Confidence",desc:"Strength regained — doing everything you did before",icon:"🏁",meters:{pain:5,mobility:95,strength:95},
          items:["Full overhead strength and range of motion","All sports and activities without restriction","No pain with daily activities or exercise","Maintenance exercises keep you strong long-term"]});
      } else {
        phases.push({week:"Now",title:"Just Diagnosed",desc:"You have your MRI results and are deciding next steps",icon:"📋",meters:{pain:65,mobility:40,strength:45},
          items:["Your knee may swell after activity or feel unstable","Walking is possible but you may limp or feel uncertain","Stairs, squatting, or pivoting causes pain or giving-way","You're weighing conservative vs. surgical options"]});
        phases.push({week:"0-2",title:"Starting Treatment",desc:"Whether PT or post-surgery, this is the protection window",icon:"🛡️",meters:{pain:55,mobility:25,strength:20},
          items:["Walking may require crutches or a brace","Bending past 90° is difficult or restricted","Doing gentle quad sets and ankle pumps","Ice and elevation are part of the daily routine"]});
        phases.push({week:"3-6",title:"Walking More Normally",desc:"Off crutches and moving with more confidence",icon:"🚶",meters:{pain:35,mobility:55,strength:40},
          items:["Walking without a visible limp on flat ground","Bending to ~120° is achievable","Stairs possible but may lead with the good leg","Light cycling or pool walking feels comfortable"]});
        phases.push({week:"6-12",title:"Building Strength",desc:"Walking is easy — working on power and balance",icon:"🏋️",meters:{pain:15,mobility:75,strength:65},
          items:["Bodyweight squats without pain","Standing on one leg for 30+ seconds","Step-ups, lunges, and resistance exercises","Jogging in a straight line may be starting"]});
        phases.push({week:"12-20",title:"Returning to Activity",desc:"Testing your knee with real-world demands",icon:"🏃",meters:{pain:8,mobility:85,strength:80},
          items:["Running, jumping, and cutting drills introduced","Climbing stairs without thinking about it","Confidence in quick movements is building","Some soreness after hard sessions is normal"]});
        phases.push({week:"20-26",title:"Full Confidence",desc:"Your knee feels strong and trustworthy again",icon:"🏁",meters:{pain:5,mobility:95,strength:95},
          items:["Full return to sport and recreation","No instability, giving-way, or swelling after activity","Strength equal or near-equal to the other side","Maintenance exercises keep you protected"]});
      }
    } else if(sev==="moderate"){
      if(j==="shoulder"){
        phases.push({week:"Now",title:"Just Diagnosed",desc:"You know what's going on — time to start addressing it",icon:"📋",meters:{pain:55,mobility:50,strength:55},
          items:["Pain with certain movements, especially overhead","Sleep disrupted if lying on the affected side","Most daily tasks OK but some cause a sharp catch","Starting conservative treatment (PT, modification)"]});
        phases.push({week:"2-4",title:"Calming Things Down",desc:"Pain and inflammation being managed actively",icon:"🛡️",meters:{pain:35,mobility:60,strength:55},
          items:["Pain decreasing with activity modification","Avoiding aggravating positions","Gentle stretches and isometrics are tolerable","Ice or anti-inflammatories are helping"]});
        phases.push({week:"4-8",title:"Getting Stronger",desc:"Sharp pain gone — building back up",icon:"💪",meters:{pain:15,mobility:80,strength:75},
          items:["Reaching overhead with only mild discomfort","Resistance band exercises done consistently","Carrying objects at your side is comfortable","Shoulder feels more stable day-to-day"]});
        phases.push({week:"8-12",title:"Back to Normal",desc:"Doing everything you did before with confidence",icon:"🏁",meters:{pain:5,mobility:95,strength:90},
          items:["Full range of motion without pain","Exercise and sport activities resumed","No catch or sharp pain with movement","Maintenance exercises 2-3x/week"]});
      } else {
        phases.push({week:"Now",title:"Just Diagnosed",desc:"You know what's going on — time to start addressing it",icon:"📋",meters:{pain:50,mobility:55,strength:55},
          items:["Pain or swelling after activity, especially stairs","Walking fine but longer distances uncomfortable","May hear clicking, catching, or feel stiffness","Starting conservative treatment (PT, modification)"]});
        phases.push({week:"2-4",title:"Calming Things Down",desc:"Reducing pain and swelling so rehab can progress",icon:"🛡️",meters:{pain:30,mobility:65,strength:55},
          items:["Pain decreasing with rest and modification","Swelling going down with ice and compression","Gentle range of motion and quad activation tolerated","Avoiding deep squats and impact activities"]});
        phases.push({week:"4-8",title:"Getting Stronger",desc:"Acute phase over — rebuilding strength and stability",icon:"💪",meters:{pain:12,mobility:80,strength:75},
          items:["Walking long distances comfortable again","Squatting to ~90° without sharp pain","Balance and resistance exercises progressing","Cycling or swimming feels good"]});
        phases.push({week:"8-12",title:"Back to Normal",desc:"Knee feels reliable for daily life and activity",icon:"🏁",meters:{pain:5,mobility:95,strength:92},
          items:["Stairs, hills, and uneven terrain no problem","Sport and exercise fully resumed","No swelling after activity","Maintenance exercises prevent recurrence"]});
      }
    } else {
      phases.push({week:"Now",title:"Just Diagnosed",desc:"Likely manageable with simple modifications",icon:"📋",meters:{pain:30,mobility:75,strength:70},
        items:["Mild discomfort with certain movements","Daily activities mostly unaffected","More noticeable after prolonged activity","Simple changes and targeted exercises should help"]});
      phases.push({week:"2-4",title:"Improving",desc:"Targeted exercises are reducing symptoms",icon:"💪",meters:{pain:12,mobility:88,strength:82},
        items:["Discomfort noticeably less frequent","Strengthening exercises done consistently","Activity tolerance increasing","Most days you don't think about it"]});
      phases.push({week:"4-8",title:"Resolved",desc:"Symptoms gone or minimal — maintain with exercise",icon:"🏁",meters:{pain:3,mobility:95,strength:95},
        items:["No pain with daily activities or exercise","Full strength and range of motion","Continue maintenance 2-3x/week","Follow up only if symptoms return"]});
    }
    return phases;
  };

  const phases=buildPhases();
  const selIdx=selected?.index??0;

  // Auto-select first stage on mount if nothing selected
  useEffect(()=>{
    if(!selected&&phases.length>0){
      onSelect?.({index:0,week:phases[0].week,label:phases[0].title,title:phases[0].title});
    }
  },[]);

  return(
    <div style={{padding:"0 0 0 2px"}}>
      {/* Current stage banner */}
      <div style={{marginBottom:10,padding:"8px 12px",background:"rgba(26,127,122,0.05)",borderRadius:8,border:"1px solid rgba(26,127,122,0.12)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>{phases[selIdx]?.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:9,fontWeight:700,color:teal,textTransform:"uppercase",letterSpacing:.8}}>Where you are now</div>
            <div style={{fontSize:12,fontWeight:700,color:T.tx}}>{phases[selIdx]?.title}</div>
            <div style={{fontSize:10,color:T.txM,marginTop:1}}>{phases[selIdx]?.desc}</div>
          </div>
        </div>
        <div style={{fontSize:9,color:T.txL,marginTop:6}}>Tap a different stage below if you're further along in your recovery</div>
      </div>

      {phases.map((ph,i)=>{
        const isSel=selIdx===i;
        const isPast=i<selIdx;
        const isFuture=i>selIdx;
        return(
        <div key={i}
          onClick={()=>onSelect?.({index:i,week:ph.week,label:ph.title,title:ph.title})}
          style={{display:"flex",gap:12,cursor:"pointer",opacity:isFuture?.45:1,transition:"opacity .2s"}}
        >
          {/* Left — icon circle + connector */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:32,flexShrink:0,zIndex:1}}>
            <div style={{
              width:32,height:32,borderRadius:"50%",flexShrink:0,
              background:isSel?teal:isPast?"rgba(26,127,122,0.15)":i===phases.length-1?teal:T.sf,
              border:`3px solid ${isSel?teal:isPast?teal+"80":teal}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:isSel?14:13,
              boxShadow:isSel?"0 0 0 4px rgba(26,127,122,0.2)":"0 2px 6px rgba(26,127,122,0.15)",
              transition:"all .2s",
            }}>{isPast?"✓":ph.icon}</div>
            {i<phases.length-1&&<div style={{width:3,flex:1,minHeight:12,background:isPast?teal+"80":`${teal}30`,borderRadius:2,margin:"4px 0"}} />}
          </div>

          {/* Right — content card */}
          <div style={{
            flex:1,padding:isSel?"10px 12px":"8px 12px",
            background:isSel?"rgba(26,127,122,0.06)":isPast?"rgba(26,127,122,0.02)":T.sfA,
            borderRadius:10,
            border:isSel?`2px solid ${teal}`:`1px solid ${isPast?"rgba(26,127,122,0.1)":T.bd}`,
            transition:"all .2s",marginBottom:0,
          }}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <span style={{fontSize:12,fontWeight:700,color:isPast?T.txL:isSel?T.tx:T.txM}}>{ph.title}</span>
              {isSel&&<span style={{fontSize:8,fontWeight:700,color:"#fff",background:teal,padding:"2px 6px",borderRadius:3}}>YOU ARE HERE</span>}
              {isPast&&<span style={{fontSize:8,fontWeight:600,color:teal,background:"rgba(26,127,122,0.08)",padding:"2px 6px",borderRadius:3}}>✓ DONE</span>}
              <span style={{fontSize:9,color:T.txL,fontWeight:600,marginLeft:"auto"}}>Week {ph.week}</span>
            </div>
            {/* Expanded content */}
            {isSel&&<>
              <div style={{fontSize:10,color:T.txM,marginTop:4,marginBottom:6,fontStyle:"italic"}}>{ph.desc}</div>
              {/* Functional snapshot — compact pills */}
              {ph.meters&&<div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                {[
                  {label:"Pain",val:ph.meters.pain,icon:ph.meters.pain>50?"🔴":ph.meters.pain>20?"🟡":"🟢",text:ph.meters.pain>50?"High":ph.meters.pain>20?"Moderate":"Low"},
                  {label:"Mobility",val:ph.meters.mobility,icon:ph.meters.mobility<40?"🔴":ph.meters.mobility<70?"🟡":"🟢",text:`${ph.meters.mobility}%`},
                  {label:"Strength",val:ph.meters.strength,icon:ph.meters.strength<40?"🔴":ph.meters.strength<70?"🟡":"🟢",text:`${ph.meters.strength}%`},
                ].map((m,mi)=>(
                  <div key={mi} style={{
                    display:"flex",alignItems:"center",gap:4,
                    padding:"4px 8px",borderRadius:6,
                    background:"rgba(0,0,0,0.03)",border:`1px solid ${T.bd}`,
                  }}>
                    <span style={{fontSize:9}}>{m.icon}</span>
                    <span style={{fontSize:9,fontWeight:700,color:T.txM}}>{m.label}</span>
                    <span style={{fontSize:9,fontWeight:600,color:T.tx}}>{m.text}</span>
                  </div>
                ))}
              </div>}
              <div>
                {ph.items.map((item,j)=>(
                  <div key={j} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:3}}>
                    <span style={{color:teal,fontSize:10,marginTop:2,flexShrink:0}}>•</span>
                    <span style={{fontSize:11,color:T.tx,lineHeight:1.45}}>{item}</span>
                  </div>
                ))}
              </div>
            </>}
          </div>
        </div>
        );
      })}

      {/* Clinical timeline */}
      <div style={{marginTop:8,padding:"8px 10px",background:"rgba(26,127,122,0.03)",borderRadius:6,border:"1px solid rgba(26,127,122,0.08)"}}>
        <div style={{fontSize:10,color:teal,fontWeight:600,marginBottom:2}}>Clinical timeline</div>
        <div style={{fontSize:10,color:T.txM,lineHeight:1.5}}>{finding.timeline}</div>
      </div>
    </div>
  );
}


/* ═══════════════════ REPORT PREVIEW OVERLAY ═══════════════════ */
function ReportPreview({findings,joint,paid,onUnlock,onDismiss,onDownload}){
  const jLabel=joint==="shoulder"?"Shoulder":joint==="hip"?"Hip":"Knee";
  const sevColors={severe:"#BF1029",moderate:"#C45D00",mild:"#A68B00"};
  return(
    <div style={{position:"absolute",inset:0,zIndex:30,background:`${T.sfA}f8`,display:"flex",flexDirection:"column",animation:"fadeIn .4s",overflow:"hidden"}}>
      {/* Header bar */}
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,background:T.sf}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>📋</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.tx}}>Your {jLabel} MRI Report</div>
            <div style={{fontSize:10,color:T.txM}}>Assessment complete · Personalized to your results</div>
          </div>
        </div>
        <button onClick={onDismiss} style={{background:"none",border:"none",fontSize:18,color:T.txL,cursor:"pointer",padding:"4px 6px"}}>✕</button>
      </div>

      {/* Scrollable report preview */}
      <div style={{flex:1,overflow:"auto",padding:"16px 20px",position:"relative"}}>
        {/* Clear section — appointment questions */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,fontWeight:700,color:"#0071E3",textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Questions for Your Appointment</div>
          <div style={{fontSize:11,color:T.txM,marginBottom:10,lineHeight:1.5}}>Bring these to your next visit. Check the ones that matter most.</div>
          {(findings||[]).map((f,i)=>{
            if(!f.questions||f.questions.length===0)return null;
            const sc=sevColors[f.sev]||T.txM;
            return(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:8,fontWeight:700,color:sc,background:sc+"12",padding:"2px 6px",borderRadius:3,textTransform:"uppercase"}}>{f.sev}</span>
                  <span style={{fontSize:12,fontWeight:700,color:T.tx,fontFamily:"Georgia,serif"}}>{f.str}</span>
                </div>
                {f.questions.slice(0,3).map((q,qi)=>(
                  <div key={qi} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 10px",marginBottom:3,borderRadius:6,background:T.sf,border:`1px solid ${T.bd}`}}>
                    <div style={{width:14,height:14,borderRadius:3,border:"1.5px solid #AEAEB2",flexShrink:0,marginTop:1}} />
                    <span style={{fontSize:11,color:T.tx,lineHeight:1.4}}>{q}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {/* General questions */}
          <div style={{marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:700,color:T.txM}}>General Questions</span>
            </div>
            {["What should I focus on right now?","Should I start PT before other decisions?","What activities should I avoid?"].map((q,qi)=>(
              <div key={qi} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 10px",marginBottom:3,borderRadius:6,background:T.sf,border:`1px solid ${T.bd}`}}>
                <div style={{width:14,height:14,borderRadius:3,border:"1.5px solid #AEAEB2",flexShrink:0,marginTop:1}} />
                <span style={{fontSize:11,color:T.tx,lineHeight:1.4}}>{q}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Transition — gradient fade to blur */}
        <div style={{position:"relative"}}>
          {/* Blurred content */}
          <div style={{filter:"blur(4px)",opacity:.6,pointerEvents:"none",userSelect:"none"}}>
            <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Your MRI Findings Explained</div>
            {(findings||[]).slice(0,2).map((f,i)=>{
              const sc=sevColors[f.sev]||T.txM;
              return(
                <div key={i} style={{padding:"10px 12px",marginBottom:6,borderRadius:8,background:T.sf,border:`1px solid ${T.bd}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontSize:8,fontWeight:700,color:sc,background:sc+"12",padding:"2px 6px",borderRadius:3,textTransform:"uppercase"}}>{f.sev}</span>
                    <span style={{fontSize:13,fontWeight:700,color:T.tx}}>{f.str}</span>
                  </div>
                  <div style={{fontSize:11,color:T.txM,lineHeight:1.5}}>{f.desc?.slice(0,100)}...</div>
                </div>
              );
            })}

            <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8,marginTop:16}}>Treatment Comparison</div>
            {(findings||[]).slice(0,1).flatMap(f=>f.treatments||[]).slice(0,3).map((tx,i)=>(
              <div key={i} style={{padding:"8px 12px",marginBottom:4,borderRadius:8,background:T.sf,border:`1px solid ${T.bd}`,borderLeft:`3px solid ${tx.color||"#0071E3"}`}}>
                <div style={{fontSize:12,fontWeight:700,color:T.tx}}>{tx.name}</div>
                <div style={{fontSize:10,color:T.txM,marginTop:2}}>{tx.desc?.slice(0,80)}...</div>
              </div>
            ))}

            <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8,marginTop:16}}>Personalized Exercise Program</div>
            {["Phase 1: Early Recovery — Weeks 1-2","Phase 2: Building Strength — Weeks 3-6","Phase 3: Return to Activity — Weeks 7-12"].map((p,i)=>(
              <div key={i} style={{padding:"8px 12px",marginBottom:4,borderRadius:8,background:T.sf,border:`1px solid ${T.bd}`,fontSize:11,color:T.tx,fontWeight:600}}>{p}</div>
            ))}
          </div>

          {/* Gradient overlay on blur transition */}
          <div style={{position:"absolute",top:-30,left:0,right:0,height:30,background:`linear-gradient(180deg,${T.sfA}00 0%,${T.sfA}80 100%)`,pointerEvents:"none"}} />
        </div>
      </div>

      {/* CTA bar at bottom */}
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.bd}`,background:T.sf,flexShrink:0}}>
        {paid?(
          <button onClick={onDownload} style={{
            width:"100%",padding:"12px",borderRadius:10,border:"none",
            background:"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",
            color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",
            boxShadow:"0 4px 16px rgba(0,113,227,0.3)",
          }}>Download Full PDF Report</button>
        ):(
          <div>
            <button onClick={onUnlock} style={{
              width:"100%",padding:"12px",borderRadius:10,border:"none",
              background:"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",
              color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",
              boxShadow:"0 4px 16px rgba(0,113,227,0.3)",marginBottom:6,
            }}>$5 — Unlock Full Report</button>
            <div style={{textAlign:"center",fontSize:10,color:T.txL}}>Includes specialist perspectives, exercises, treatments & PDF download</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ SEO LANDING PAGE ═══════════════════ */
function LandingPage({onStart,onSelectCondition,mob,dark,toggleDark}){
  const[selJoint,setSelJoint]=useState(null);

  const CONDITIONS={
    knee:{
      label:"Knee",icon:"🦵",color:"#0071E3",
      conditions:[
        {name:"ACL Tear",desc:"Anterior cruciate ligament tear — instability, swelling after pivoting injury",sev:"severe",common:true,
          sample:"1. Complete tear of the anterior cruciate ligament with surrounding edema.\n2. Small joint effusion.\n3. Bone bruising of the lateral femoral condyle and posterior tibial plateau."},
        {name:"Meniscus Tear",desc:"Torn cartilage cushion — catching, locking, pain along joint line",sev:"moderate",common:true,
          sample:"1. Complex tear of the posterior horn of the medial meniscus extending to the inferior articular surface.\n2. Small joint effusion.\n3. Mild chondral thinning of the medial compartment."},
        {name:"MCL Sprain",desc:"Medial collateral ligament injury — inner knee pain after impact or twist",sev:"moderate",
          sample:"1. Grade II sprain of the medial collateral ligament with surrounding edema and partial fiber disruption.\n2. Mild joint effusion.\n3. Intact cruciate ligaments."},
        {name:"Cartilage Damage",desc:"Articular cartilage thinning or defect — deep aching, stiffness",sev:"moderate",common:true,
          sample:"1. Full-thickness cartilage defect of the medial femoral condyle measuring approximately 1.5 cm.\n2. Moderate joint effusion.\n3. Early osteoarthritic changes with marginal osteophytes."},
        {name:"Baker's Cyst",desc:"Fluid-filled cyst behind knee — tightness, swelling in back of knee",sev:"mild",
          sample:"1. Baker's cyst measuring 3.2 x 1.8 cm in the popliteal fossa.\n2. Small joint effusion.\n3. Mild degenerative changes of the medial compartment."},
        {name:"PCL Injury",desc:"Posterior cruciate ligament — less common, dashboard-type injuries",sev:"severe",
          sample:"1. Partial tear of the posterior cruciate ligament with intrasubstance signal abnormality.\n2. Moderate joint effusion.\n3. Bone contusion of the anterior tibial plateau."},
        {name:"Patellar Tendinitis",desc:"Jumper's knee — pain below kneecap with activity",sev:"mild",
          sample:"1. Thickening and increased signal within the proximal patellar tendon consistent with tendinopathy.\n2. No full-thickness tear identified.\n3. Trace joint effusion."},
        {name:"Bone Bruise",desc:"Bone marrow edema from impact — deep ache, weight-bearing pain",sev:"moderate",
          sample:"1. Bone marrow edema pattern involving the lateral femoral condyle and posterolateral tibial plateau.\n2. Intact anterior and posterior cruciate ligaments.\n3. Small joint effusion."},
        {name:"Joint Effusion",desc:"Excess fluid in the knee — swelling, stiffness, limited range",sev:"mild",
          sample:"1. Moderate joint effusion with suprapatellar extension.\n2. No internal derangement identified.\n3. Mild synovial thickening suggesting inflammatory etiology."},
        {name:"LCL Injury",desc:"Lateral collateral ligament — outer knee instability",sev:"moderate",
          sample:"1. Grade II sprain of the lateral collateral ligament with partial fiber disruption.\n2. Intact cruciate ligaments.\n3. Small joint effusion."},
      ]
    },
    shoulder:{
      label:"Shoulder",icon:"💪",color:"#6B3FA0",
      conditions:[
        {name:"Rotator Cuff Tear",desc:"Supraspinatus tear — pain reaching overhead, weakness lifting arm",sev:"severe",common:true,
          sample:"1. Full-thickness tear of the supraspinatus tendon with 1.5 cm retraction.\n2. Moderate subacromial/subdeltoid bursitis.\n3. Superior labral fraying."},
        {name:"SLAP Tear",desc:"Superior labrum tear — deep shoulder pain, clicking with overhead motion",sev:"moderate",common:true,
          sample:"1. Superior labral tear extending from anterior to posterior (SLAP type II).\n2. Paralabral cyst extending posteriorly.\n3. Intact rotator cuff tendons."},
        {name:"Labral Tear",desc:"Cartilage ring damage — instability, catching, popping",sev:"moderate",common:true,
          sample:"1. Anterior-inferior labral tear with associated periosteal stripping (Bankart lesion).\n2. Small glenohumeral effusion.\n3. Hill-Sachs deformity of the posterolateral humeral head."},
        {name:"Biceps Tendinitis",desc:"Long head biceps inflammation — front shoulder pain, clicking",sev:"mild",
          sample:"1. Tendinosis of the long head of the biceps tendon with fluid in the bicipital groove.\n2. Intact rotator cuff.\n3. Mild subacromial bursitis."},
        {name:"Rotator Cuff Tendinosis",desc:"Tendon degeneration without tear — gradual onset, night pain",sev:"moderate",
          sample:"1. Intrasubstance signal abnormality of the supraspinatus tendon consistent with tendinosis without discrete tear.\n2. Type II acromion with mild subacromial bursitis.\n3. Mild AC joint osteoarthritis."},
        {name:"AC Joint Arthritis",desc:"Acromioclavicular joint degeneration — top-of-shoulder pain",sev:"mild",
          sample:"1. Moderate osteoarthritis of the acromioclavicular joint with inferior osteophyte formation.\n2. Mild subacromial narrowing.\n3. Intact rotator cuff tendons."},
        {name:"Shoulder Impingement",desc:"Subacromial narrowing — pain reaching overhead or behind back",sev:"moderate",
          sample:"1. Type III hooked acromion with significant subacromial narrowing.\n2. Moderate subacromial/subdeltoid bursitis.\n3. Intrasubstance signal in the supraspinatus tendon suggesting early tendinosis."},
        {name:"Frozen Shoulder",desc:"Adhesive capsulitis — progressive stiffness and pain",sev:"moderate",
          sample:"1. Thickening and enhancement of the inferior glenohumeral ligament and axillary recess consistent with adhesive capsulitis.\n2. Reduced joint volume.\n3. Intact rotator cuff."},
      ]
    }
  };

  const joints=Object.keys(CONDITIONS);

  return(
    <div style={{minHeight:"100vh",background:dark?"#1A1A1E":"#FAFAF8",overflow:"auto"}}>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:20,background:dark?"rgba(26,26,30,0.92)":"rgba(250,249,247,0.92)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`}}>
        <div style={{maxWidth:900,margin:"0 auto",padding:mob?"10px 20px":"12px 40px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:mob?8:10}}>
            <div style={{width:mob?26:30,height:mob?26:30,borderRadius:mob?7:9,background:"linear-gradient(135deg,#0071E3,#5BA3F5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:mob?13:15,fontWeight:800,color:"#fff"}}>C</div>
            <span style={{fontSize:mob?15:17,fontWeight:700,color:dark?"#E8E8ED":"#1D1D1F"}}>ClearScan</span>
            {!mob&&<span style={{fontSize:11,color:dark?"#6B6B73":"#AEAEB2",fontWeight:500,marginLeft:4}}>MRI Interpreter</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={toggleDark} style={{background:"none",border:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.08)"}`,color:dark?"#A0A0A8":"#6E6E73",padding:mob?"5px 8px":"6px 10px",borderRadius:7,fontSize:13,cursor:"pointer",lineHeight:1}} title={dark?"Light mode":"Dark mode"}>{dark?"☀️":"🌙"}</button>
            <button onClick={()=>onStart()} style={{
              padding:mob?"7px 14px":"8px 18px",borderRadius:8,border:"none",
              background:"#0071E3",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",
            }}>Upload MRI →</button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{maxWidth:900,margin:"0 auto",padding:mob?"40px 20px 30px":"60px 40px 40px",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,113,227,0.06)",border:"1px solid rgba(0,113,227,0.12)",borderRadius:20,padding:"6px 14px",marginBottom:mob?16:24}}>
          <span style={{fontSize:12,fontWeight:600,color:"#0071E3"}}>Free MRI interpretation in seconds</span>
        </div>

        <h1 style={{fontSize:mob?28:44,fontWeight:800,color:dark?"#E8E8ED":"#1D1D1F",margin:"0 0 12px",lineHeight:1.15,fontFamily:"Georgia,serif",letterSpacing:"-0.02em"}}>
          Understand Your MRI Results.<br/><span style={{color:"#0071E3"}}>Prepare for Your Appointment.</span>
        </h1>

        <p style={{fontSize:mob?15:18,color:dark?"#A0A0A8":"#6E6E73",margin:"0 auto 28px",maxWidth:560,lineHeight:1.6}}>
          Paste your MRI report and instantly get plain-language explanations, questions for your doctor, treatment comparisons, and a personalized exercise program.
        </p>

        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>onStart()} style={{
            padding:"14px 28px",borderRadius:12,border:"none",
            background:"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",
            color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",
            boxShadow:"0 4px 20px rgba(0,113,227,0.3)",
          }}>I Have My MRI Report →</button>
          <a href="#conditions" style={{
            padding:"14px 28px",borderRadius:12,
            border:"1px solid rgba(0,0,0,0.1)",background:T.sf,
            color:T.tx,fontSize:16,fontWeight:600,cursor:"pointer",textDecoration:"none",
            display:"inline-block",
          }}>Browse by Diagnosis ↓</a>
        </div>

        {/* Trust badges */}
        <div style={{display:"flex",gap:mob?12:24,justifyContent:"center",marginTop:28,flexWrap:"wrap"}}>
          {[["🔒","No data stored"],["⚡","Instant results"],["🧠","No AI hallucination"],["📋","PDF report"]].map(([ic,tx],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:14}}>{ic}</span>
              <span style={{fontSize:11,color:T.txL,fontWeight:600}}>{tx}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div style={{maxWidth:800,margin:"0 auto",padding:mob?"0 20px 40px":"0 40px 50px"}}>
        <h2 style={{fontSize:mob?18:22,fontWeight:700,color:dark?"#E8E8ED":"#1D1D1F",textAlign:"center",marginBottom:24,fontFamily:"Georgia,serif"}}>How It Works</h2>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:16}}>
          {[
            {step:"1",title:"Paste Your Report",desc:"Copy the Impression section from your MRI report and paste it in. We auto-detect knee or shoulder."},
            {step:"2",title:"See What It Means",desc:"Every finding explained in plain language with severity ratings, 3D visualization, and what you might feel."},
            {step:"3",title:"Prepare for Your Visit",desc:"Get personalized doctor questions, treatment comparisons, exercises, and a downloadable PDF report."},
          ].map((s,i)=>(
            <div key={i} style={{padding:20,borderRadius:12,background:dark?"#242428":"#fff",border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(0,113,227,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#0071E3",marginBottom:10}}>{s.step}</div>
              <div style={{fontSize:14,fontWeight:700,color:dark?"#E8E8ED":"#1D1D1F",marginBottom:4}}>{s.title}</div>
              <div style={{fontSize:12,color:T.txM,lineHeight:1.5}}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body Part Selector + Condition Browser */}
      <div id="conditions" style={{maxWidth:800,margin:"0 auto",padding:mob?"0 20px 40px":"0 40px 60px"}}>
        <h2 style={{fontSize:mob?18:22,fontWeight:700,color:dark?"#E8E8ED":"#1D1D1F",textAlign:"center",marginBottom:6,fontFamily:"Georgia,serif"}}>Don't Have Your MRI Report?</h2>
        <p style={{fontSize:13,color:T.txM,textAlign:"center",marginBottom:24,lineHeight:1.5}}>Select your body part and diagnosis below. We'll load a representative MRI report so you can explore what ClearScan shows.</p>

        {/* Joint selector */}
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:24}}>
          {joints.map(j=>{
            const jd=CONDITIONS[j];
            const isSel=selJoint===j;
            return(
              <button key={j} onClick={()=>setSelJoint(isSel?null:j)} style={{
                padding:mob?"12px 20px":"14px 28px",borderRadius:12,
                border:isSel?`2px solid ${jd.color}`:`1px solid ${dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)"}`,
                background:isSel?jd.color+"08":dark?"#242428":"#fff",
                cursor:"pointer",display:"flex",alignItems:"center",gap:8,
                transition:"all .2s",
              }}>
                <span style={{fontSize:mob?24:32}}>{jd.icon}</span>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:mob?14:16,fontWeight:700,color:isSel?jd.color:T.tx}}>{jd.label}</div>
                  <div style={{fontSize:10,color:T.txL}}>{jd.conditions.length} conditions</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Condition grid */}
        {selJoint&&<div style={{animation:"fadeIn .3s"}}>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10}}>
            {CONDITIONS[selJoint].conditions.map((c,i)=>{
              const sc=c.sev==="severe"?"#BF1029":c.sev==="moderate"?"#C45D00":"#A68B00";
              return(
                <div key={i} onClick={()=>onSelectCondition(c.sample,selJoint)} style={{
                  padding:"14px 16px",borderRadius:10,background:dark?"#242428":"#fff",
                  border:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`,cursor:"pointer",
                  transition:"all .15s",position:"relative",overflow:"hidden",
                }} onMouseEnter={e=>{e.currentTarget.style.borderColor=CONDITIONS[selJoint].color+"40";e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)"}}
                   onMouseLeave={e=>{e.currentTarget.style.borderColor=T.bd;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:700,color:T.tx}}>{c.name}</span>
                    <span style={{fontSize:8,fontWeight:700,color:sc,background:sc+"12",padding:"2px 6px",borderRadius:3,textTransform:"uppercase"}}>{c.sev}</span>
                    {c.common&&<span style={{fontSize:8,fontWeight:600,color:"#0071E3",background:"rgba(0,113,227,0.06)",padding:"2px 6px",borderRadius:3}}>COMMON</span>}
                  </div>
                  <div style={{fontSize:11,color:T.txM,lineHeight:1.45}}>{c.desc}</div>
                  <div style={{fontSize:10,color:CONDITIONS[selJoint].color,fontWeight:600,marginTop:6}}>Explore this diagnosis →</div>
                </div>
              );
            })}
          </div>
        </div>}

        {!selJoint&&<div style={{textAlign:"center",padding:20,color:T.txL,fontSize:13}}>
          Select a body part above to browse conditions
        </div>}
      </div>

      {/* SEO Content Section */}
      <div style={{background:dark?"#242428":"#fff",borderTop:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`,padding:mob?"30px 20px":"40px 40px"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <h2 style={{fontSize:mob?16:20,fontWeight:700,color:dark?"#E8E8ED":"#1D1D1F",marginBottom:16,fontFamily:"Georgia,serif"}}>Understanding Your MRI Report</h2>

          <div style={{fontSize:13,color:T.txM,lineHeight:1.7}}>
            <p style={{marginBottom:14}}>MRI reports are written by radiologists for other physicians — not for patients. Terms like "intrasubstance signal abnormality," "grade III sprain," or "full-thickness tear with retraction" can feel overwhelming when you're reading them for the first time.</p>
            <p style={{marginBottom:14}}>ClearScan translates your MRI impression into plain language you can understand. Each finding is explained individually: what the structure is, what went wrong, how severe it is, and what you might feel. More importantly, we help you prepare for the conversation that matters — your next doctor's appointment.</p>
            <p style={{marginBottom:14}}>Our clinical content is developed with input from board-certified orthopedic surgeons, physiatrists, and physical therapists. All analysis runs instantly on your device — your MRI text is never sent to a server or stored anywhere.</p>
          </div>

          <h3 style={{fontSize:15,fontWeight:700,color:T.tx,marginTop:20,marginBottom:10}}>What ClearScan Includes</h3>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10}}>
            {[
              ["🩺","Appointment Questions","Finding-specific questions to ask your orthopedist, with checkboxes you can print"],
              ["📊","Treatment Comparison","Conservative vs. surgical vs. interventional options with pros, cons, and timelines"],
              ["🏋️","Exercise Program","Personalized PT exercises matched to your findings, pain level, and activity goals"],
              ["📋","PDF Report","Downloadable report you can share with your doctor or physical therapist"],
              ["🗺️","Specialist Finder","Find top-rated orthopedic surgeons and PTs near your ZIP code"],
              ["📈","Recovery Timeline","Stage-by-stage recovery guide describing what you'll be able to do and when"],
            ].map(([ic,title,desc],i)=>(
              <div key={i} style={{padding:"12px 14px",borderRadius:8,background:T.sfA,border:`1px solid ${T.bd}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:14}}>{ic}</span>
                  <span style={{fontSize:12,fontWeight:700,color:T.tx}}>{title}</span>
                </div>
                <div style={{fontSize:11,color:T.txM,lineHeight:1.4}}>{desc}</div>
              </div>
            ))}
          </div>

          <h3 style={{fontSize:15,fontWeight:700,color:T.tx,marginTop:24,marginBottom:10}}>Frequently Asked Questions</h3>
          {[
            ["Is my MRI data stored anywhere?","No. ClearScan runs entirely in your browser. Your MRI text is never sent to a server, database, or AI service. When you close the tab, everything is gone."],
            ["How accurate is the interpretation?","ClearScan uses pattern-matching rules developed with orthopedic specialists — not AI language models. This means consistent, reproducible results with no hallucination risk. However, ClearScan is an educational tool, not a medical diagnosis."],
            ["What joints are supported?","Currently knee and shoulder MRI reports. We auto-detect the joint type from your report text. Hip and spine support are in development."],
            ["How much does it cost?","The basic interpretation and findings summary are free. The full report — including doctor questions, treatment comparison, personalized exercises, and PDF download — is a one-time $5 purchase."],
            ["Can I share the report with my doctor?","Yes. The PDF report is designed to bring to your appointment. The Questions page includes printable checkboxes."],
          ].map(([q,a],i)=>(
            <div key={i} style={{marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:T.tx,marginBottom:3}}>{q}</div>
              <div style={{fontSize:12,color:T.txM,lineHeight:1.55}}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:"20px 40px",borderTop:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`,textAlign:"center",background:dark?"#1A1A1E":"#FAFAF8"}}>
        <div style={{fontSize:10,color:T.txL,lineHeight:1.6}}>
          ClearScan is an educational tool and does not provide medical advice, diagnosis, or treatment.<br/>
          Always consult a qualified healthcare provider for medical decisions.<br/>
          © {new Date().getFullYear()} ClearScan. All rights reserved.
        </div>
      </div>
    </div>
  );
}

function Trust(){return(
  <div style={{padding:"10px 14px",background:T.sfA,borderRadius:8,border:`1px solid ${T.bd}`,marginTop:12}}>
    <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:T.txL,marginBottom:6}}>Methodology</div>
    <div style={{fontSize:11,lineHeight:1.6,color:T.txL}}>Clinical content reviewed by ClearScan's multidisciplinary advisory panel. Findings parsed using ACR terminology. For education only — not medical advice.</div>
  </div>
)}

/* ═══════════════════ SPECIALIST FINDER ═══════════════════ */
function SpecialistFinder({joint,mob}){
  const[open,setOpen]=useState(false);
  const[zip,setZip]=useState("");
  const[loading,setLoading]=useState(false);
  const[physicians,setPhysicians]=useState(null);
  const[pts,setPts]=useState(null);
  const[err,setErr]=useState(null);

  const jLabel=joint==="shoulder"?"Shoulder":"Knee";
  const docQuery=`orthopedic ${jLabel.toLowerCase()} surgeon sports medicine doctor`;
  const ptQuery=`orthopedic physical therapist sports rehabilitation`;

  const fetchResults=async(query)=>{
    try{
      const r=await fetch(`/api/places?query=${encodeURIComponent(query+" near "+zip)}`);
      const d=await r.json();
      if(d.fallback)return{fallback:true,results:[]};
      return{results:d.results||[],fallback:false};
    }catch(e){return{results:[],fallback:false,error:true}}
  };

  const search=async()=>{
    if(zip.length<5)return;
    setLoading(true);setErr(null);setPhysicians(null);setPts(null);
    const[docRes,ptRes]=await Promise.all([fetchResults(docQuery),fetchResults(ptQuery)]);
    if(docRes.fallback||ptRes.fallback){
      // API key not configured — use Maps links as fallback
      setPhysicians({fallback:true});
      setPts({fallback:true});
    }else{
      setPhysicians(docRes);
      setPts(ptRes);
    }
    setLoading(false);
  };

  const Stars=({rating})=>{
    const full=Math.floor(rating);const half=rating-full>=0.3;
    return <span style={{fontSize:10,letterSpacing:-1}}>{[...Array(5)].map((_,i)=><span key={i} style={{color:i<full?"#F5A623":i===full&&half?"#F5A623":"#E0E0E0"}}>{i<full?"★":i===full&&half?"★":"☆"}</span>)}</span>;
  };

  const ProviderCard=({p})=>{
    const mUrl=`https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
    return(
      <a href={mUrl} target="_blank" rel="noopener noreferrer" style={{
        display:"block",padding:"8px 10px",borderRadius:8,border:`1px solid ${T.bd}`,
        marginBottom:4,textDecoration:"none",transition:"background .15s",cursor:"pointer",
      }}
      onMouseEnter={e=>e.currentTarget.style.background="rgba(0,113,227,0.02)"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
      >
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:6}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:T.tx,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
            <div style={{fontSize:9,color:T.txL,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.address}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <span style={{fontSize:11,fontWeight:700,color:T.tx}}>{p.rating}</span>
              <Stars rating={p.rating} />
            </div>
            <div style={{fontSize:9,color:T.txL}}>{p.reviews.toLocaleString()} reviews</div>
          </div>
        </div>
        {p.open!=null&&<div style={{marginTop:3}}><span style={{fontSize:8,fontWeight:700,color:p.open?"#2D8B4E":"#BF1029",background:p.open?"rgba(45,139,78,0.06)":"rgba(191,16,41,0.06)",padding:"1px 5px",borderRadius:3}}>{p.open?"Open now":"Closed"}</span></div>}
      </a>
    );
  };

  const FallbackLinks=({type})=>{
    const specs=type==="doc"
      ?[{icon:"🦴",label:`Orthopedic ${jLabel} Surgeon`,q:`orthopedic ${jLabel.toLowerCase()} surgeon`},{icon:"⚕️",label:"Sports Medicine",q:"sports medicine doctor"},{icon:"💊",label:"Pain Management",q:"pain management doctor"}]
      :[{icon:"🏋️",label:"Orthopedic PT",q:"orthopedic physical therapist"},{icon:"🤸",label:"Sports Rehab PT",q:"sports rehabilitation physical therapy"}];
    return specs.map((s,i)=>(
      <a key={i} href={`https://www.google.com/maps/search/${encodeURIComponent(s.q+" near "+zip)}`} target="_blank" rel="noopener noreferrer" style={{
        display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:7,border:`1px solid ${T.bd}`,textDecoration:"none",marginBottom:4,
      }}>
        <span style={{fontSize:13}}>{s.icon}</span>
        <span style={{fontSize:11,fontWeight:600,color:T.tx,flex:1}}>{s.label}</span>
        <span style={{fontSize:10,color:"#0071E3"}}>Maps →</span>
      </a>
    ));
  };

  const ResultColumn=({title,icon,iconBg,data,type})=>(
    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",gap:5,padding:"0 2px",marginBottom:6,flexShrink:0}}>
        <div style={{width:20,height:20,borderRadius:5,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>{icon}</div>
        <span style={{fontSize:11,fontWeight:700,color:T.tx}}>{title}</span>
        {data&&!data.fallback&&data.results?.length>0&&<span style={{fontSize:9,color:T.txL,marginLeft:"auto"}}>{data.results.length} found</span>}
      </div>
      <div style={{flex:1,overflow:"auto",paddingRight:2}}>
        {data?.fallback
          ?<FallbackLinks type={type} />
          :data?.results?.length>0
            ?data.results.map((p,i)=><ProviderCard key={i} p={p} />)
            :<div style={{fontSize:10,color:T.txL,padding:"12px 4px",textAlign:"center"}}>No results found nearby. Try a different ZIP code.</div>
        }
      </div>
    </div>
  );

  if(!open)return(
    <button onClick={()=>setOpen(true)} style={{
      position:"absolute",top:mob?8:14,left:mob?8:14,zIndex:15,
      background:"rgba(255,255,255,0.92)",backdropFilter:"blur(12px)",
      border:`1px solid ${T.bdM}`,borderRadius:9,padding:"7px 12px",
      cursor:"pointer",display:"flex",alignItems:"center",gap:6,
      boxShadow:"0 2px 12px rgba(0,0,0,0.06)",animation:"fadeIn .3s",
    }}>
      <span style={{fontSize:14}}>🩺</span>
      <span style={{fontSize:11,fontWeight:600,color:T.tx}}>Find a Specialist</span>
    </button>
  );

  const panelW=mob?"calc(100% - 16px)":580;
  const hasResults=physicians||pts;

  return(
    <div style={{
      position:"absolute",top:mob?8:14,left:mob?8:14,zIndex:20,
      width:panelW,maxWidth:"calc(100% - 16px)",
      background:T.sf,borderRadius:12,
      boxShadow:"0 8px 32px rgba(0,0,0,0.12)",border:`1px solid ${T.bd}`,
      animation:"fadeIn .25s",overflow:"hidden",display:"flex",flexDirection:"column",
      maxHeight:mob?"80vh":"70vh",
    }}>
      {/* Header */}
      <div style={{padding:"12px 14px 10px",borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:16}}>🩺</span>
          <span style={{fontSize:13,fontWeight:700,color:T.tx}}>Find a Specialist</span>
          {hasResults&&<span style={{fontSize:9,color:T.txL,background:"rgba(0,0,0,0.03)",padding:"2px 6px",borderRadius:3}}>within 10 mi of {zip}</span>}
        </div>
        <button onClick={()=>{setOpen(false)}} style={{background:"none",border:"none",fontSize:16,color:T.txL,cursor:"pointer",padding:"2px 4px"}}>✕</button>
      </div>

      {/* Zip input */}
      <div style={{padding:"10px 14px",borderBottom:hasResults?`1px solid ${T.bd}`:"none",flexShrink:0}}>
        <div style={{display:"flex",gap:6}}>
          <input type="text" value={zip} onChange={e=>setZip(e.target.value.replace(/\D/g,"").slice(0,5))}
            placeholder="Enter ZIP code" maxLength={5}
            onKeyDown={e=>{if(e.key==="Enter")search()}}
            style={{flex:1,padding:"9px 10px",borderRadius:7,border:"1px solid rgba(0,0,0,0.1)",fontSize:13,outline:"none",letterSpacing:1,fontFamily:"monospace"}}
          />
          <button onClick={search} disabled={zip.length<5||loading} style={{
            padding:"9px 16px",borderRadius:7,border:"none",fontSize:12,fontWeight:700,
            background:zip.length>=5&&!loading?"#0071E3":T.bgD,color:zip.length>=5&&!loading?"#fff":T.txL,
            cursor:zip.length>=5&&!loading?"pointer":"not-allowed",whiteSpace:"nowrap",
          }}>{loading?"Searching...":"Search"}</button>
        </div>
        {!hasResults&&!loading&&<div style={{fontSize:10,color:T.txL,marginTop:6,lineHeight:1.4}}>Enter your ZIP code to find top-rated {jLabel.toLowerCase()} specialists and physical therapists within 10 miles, ranked by patient reviews.</div>}
      </div>

      {/* Loading */}
      {loading&&(
        <div style={{padding:"30px 14px",textAlign:"center",flexShrink:0}}>
          <div style={{width:24,height:24,border:"3px solid #ECEAE6",borderTopColor:"#0071E3",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 10px"}} />
          <div style={{fontSize:11,color:T.txM}}>Finding top-rated specialists near {zip}...</div>
        </div>
      )}

      {/* Split results */}
      {hasResults&&!loading&&(
        <div style={{display:"flex",flexDirection:mob?"column":"row",flex:1,overflow:"hidden",minHeight:0}}>
          {/* LEFT — Physicians */}
          <div style={{flex:1,padding:"10px 10px",borderRight:mob?"none":`1px solid ${T.bd}`,borderBottom:mob?`1px solid ${T.bd}`:"none",display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
            <ResultColumn title="Physicians" icon="👨‍⚕️" iconBg="rgba(0,113,227,0.08)" data={physicians} type="doc" />
          </div>
          {/* RIGHT — Physical Therapists */}
          <div style={{flex:1,padding:"10px 10px",display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
            <ResultColumn title="Physical Therapists" icon="🏋️" iconBg="rgba(26,127,122,0.08)" data={pts} type="pt" />
          </div>
        </div>
      )}

      {/* Footer */}
      {hasResults&&!loading&&(
        <div style={{padding:"6px 14px",borderTop:`1px solid ${T.bd}`,background:T.sfA,flexShrink:0}}>
          <div style={{fontSize:8,color:T.txL,lineHeight:1.4}}>Ranked by Google rating and review count. ClearScan does not endorse any provider. Click a listing to view on Google Maps.</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ TAB BAR ═══════════════════ */
function TabBar({tab,setTab,mob,paid}){
  const tabs=[["findings","Findings"],["treatments","Treatments"],["report","Report"],["exercises","Exercises"]];
  return(
    <div style={{display:"flex",gap:3,background:T.bgD,borderRadius:9,padding:3,marginBottom:mob?12:14,flexShrink:0}}>
      {tabs.map(([k,label])=>(
        <button key={k} onClick={()=>setTab(k)} style={{
          flex:1,padding:mob?"7px 6px":"7px 10px",borderRadius:7,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",
          background:tab===k?T.sf:"transparent",color:tab===k?T.tx:T.txL,
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
function getIntakeQuestions(findings, joint){
  const j = joint || "knee";

  // Knee-specific flags
  const hasACL=findings.some(f=>f.id?.includes("acl")||f.str?.includes("ACL"));
  const hasMeniscus=findings.some(f=>f.id?.includes("meniscus")||f.str?.includes("Meniscus"));
  const hasCartilage=findings.some(f=>f.id?.includes("cartilage")||f.str?.includes("Cartilage"));

  // Shoulder-specific flags
  const hasRC=findings.some(f=>/supraspinatus|infraspinatus|subscapularis|teres/i.test(f.id||"")||/rotator|cuff/i.test(f.str||""));
  const hasLabrum=findings.some(f=>/labrum/i.test(f.id||"")||/labr|bankart|SLAP/i.test(f.str||""));
  const hasInstabilityFinding=findings.some(f=>/bankart|hill.sachs|disloc/i.test(f.path||""));

  const hasSurgical=findings.some(f=>f.sev==="severe");
  const qs=[];

  // Q1 — functional symptom (yes/no)
  if(j==="shoulder"){
    qs.push({id:"instability",type:"yesno",
      q: hasInstabilityFinding
        ? "Has your shoulder ever dislocated or felt like it was about to slip out of the socket?"
        : hasRC
        ? "Do you have difficulty raising your arm overhead or significant night pain?"
        : "Do you have pain reaching overhead, behind your back, or across your body?",
      why: hasInstabilityFinding
        ? "History of instability events is the primary factor in deciding between conservative treatment and surgical stabilization."
        : "Functional limitations help gauge severity and guide treatment approach.",
    });
  } else {
    qs.push({id:"instability",type:"yesno",
      q: hasACL
        ? "Does your knee give way or feel unstable when changing direction or stepping off a curb?"
        : hasMeniscus
        ? "Does your knee catch, lock, or feel like something is getting in the way?"
        : "Do you have difficulty bearing full weight on the affected knee?",
      why: hasACL
        ? "Functional instability is the primary factor in deciding between reconstruction and conservative management."
        : "Mechanical symptoms help determine whether surgical intervention may be needed.",
    });
  }

  // Q2 — pain severity (slider)
  qs.push({id:"pain",type:"slider",min:0,max:10,
    q:"Rate your current pain level at its worst during daily activities.",
    labels:["No pain","Moderate","Severe"],
    why:"Pain severity helps calibrate treatment urgency and guides medication recommendations.",
  });

  // Q3 — activity goals (tags) — joint-specific options
  const goalOptions = j==="shoulder"
    ? ["Overhead Sports (Tennis, Volleyball)","Throwing Sports (Baseball, Football)","Weightlifting","Swimming","Yoga/Flexibility","CrossFit","Climbing","Desk Work Only","Daily Activities (Dressing, Reaching)","Return to Competition"]
    : ["Running","Cutting/Pivoting Sports","Weightlifting","Hiking","Cycling","Swimming","Yoga/Flexibility","Walking Daily","Desk Work Only","Return to Competition"];
  qs.push({id:"goals",type:"tags",
    q:"What activities are important to you? Select all that apply.",
    options:goalOptions,
    why:"Your activity goals are the single most important factor in choosing between treatment approaches.",
  });

  // Q4 — prior treatment (yes/no)
  if(j==="shoulder"){
    qs.push({id:"prior",type:"yesno",
      q: hasSurgical
        ? "Have you had any previous surgery on this shoulder?"
        : hasRC
        ? "Have you had shoulder injections (cortisone, PRP) in the past?"
        : "Have you tried physical therapy for this shoulder before?",
      why:"Prior treatments and their outcomes significantly influence the next steps your physician will recommend.",
    });
  } else {
    qs.push({id:"prior",type:"yesno",
      q: hasSurgical
        ? "Have you had any previous surgery on this knee?"
        : hasCartilage
        ? "Have you had knee injections (cortisone, gel, PRP) in the past?"
        : "Have you tried physical therapy for this knee before?",
      why:"Prior treatments and their outcomes significantly influence the next steps your physician will recommend.",
    });
  }

  // Q5 — medical history
  qs.push({id:"history",type:"conditions",
    q:"Do you have any of these conditions? Select all that apply.",
    options:MEDICAL_CONDITIONS,
    why:"Certain conditions affect healing, surgical risk, and medication options. This helps your care team plan safely.",
  });

  return qs;
}

function ReportTab({findings,onGenerateReport,onComplete,joint,onGoToExercises,paid,assessAnswers:existingAnswers,doctorAnswers}){
  const questions=getIntakeQuestions(findings||[],joint);
  const total=questions.length;
  const alreadyComplete=existingAnswers!=null;
  const[step,setStep]=useState(alreadyComplete?total+1:0);
  const[answers,setAnswers]=useState(alreadyComplete?existingAnswers:{});
  const[email,setEmail]=useState("");
  const[emailSubmitted,setEmailSubmitted]=useState(false);

  const setAnswer=(id,val)=>setAnswers(p=>({...p,[id]:val}));
  const current=questions[step-1];

  const submitEmail=()=>{
    if(!email.includes("@"))return;
    setEmailSubmitted(true);
    // Fire and forget — don't block the UI
    fetch("/api/capture-email",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        email,
        joint:joint||"knee",
        findings:(findings||[]).map(f=>({str:f.str,path:f.path,sev:f.sev})),
        goals:answers.goals||[],
        painLevel:answers.pain??null,
        paid:!!paid,
        timestamp:new Date().toISOString(),
      }),
    }).catch(()=>{}); // silently fail — email is already captured in UI
  };
  const canNext=step===0||
    (current?.type==="yesno"&&answers[current.id]!=null)||
    (current?.type==="slider"&&answers[current.id]!=null)||
    (current?.type==="tags"&&answers[current.id]?.length>0)||
    (current?.type==="conditions"); // conditions are optional

  const ClinicalBadges=()=>(
    <div style={{display:"flex",flexDirection:"column",gap:6,maxWidth:280,margin:"0 auto",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(45,139,78,0.04)",borderRadius:8,border:"1px solid rgba(45,139,78,0.12)"}}>
        <div style={{width:28,height:28,borderRadius:7,background:"rgba(45,139,78,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🩺</div>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#2D8B4E",letterSpacing:.3}}>Clinical Advisory Panel</div>
          <div style={{fontSize:9,color:T.txM,lineHeight:1.4,marginTop:1}}>Content reviewed by board-certified orthopedic surgeons, physiatrists &amp; physical therapists</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(0,113,227,0.03)",borderRadius:8,border:"1px solid rgba(0,113,227,0.1)"}}>
        <div style={{width:28,height:28,borderRadius:7,background:"rgba(0,113,227,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🎯</div>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#0071E3",letterSpacing:.3}}>Personalized to Your MRI</div>
          <div style={{fontSize:9,color:T.txM,lineHeight:1.4,marginTop:1}}>Adapted to your {findings?.length||0} findings, pain level, goals &amp; medical history</div>
        </div>
      </div>
    </div>
  );

  // Count doctor question answers for this assessment
  const docAnswerCount=Object.keys(doctorAnswers||{}).length;

  // ─── Intro ───
  if(step===0) return(
    <div style={{animation:"fadeIn .4s",textAlign:"center",padding:"16px 0"}}>
      <div style={{fontSize:36,marginBottom:10}}>📋</div>
      <div style={{fontSize:16,fontWeight:700,color:T.tx,marginBottom:4,fontFamily:"Georgia,serif"}}>Build Your Report</div>
      <div style={{fontSize:12,color:T.txM,lineHeight:1.6,maxWidth:280,margin:"0 auto 14px"}}>
        Personalize your report with a quick assessment. Two ways to complete it:
      </div>

      {/* Dual-path explanation */}
      <div style={{maxWidth:300,margin:"0 auto 14px",textAlign:"left"}}>
        <div style={{display:"flex",gap:8,marginBottom:8,padding:"8px 10px",background:"rgba(0,113,227,0.03)",borderRadius:8,border:"1px solid rgba(0,113,227,0.08)"}}>
          <span style={{fontSize:16,flexShrink:0}}>⚡</span>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#0071E3"}}>Quick Assessment</div>
            <div style={{fontSize:10,color:T.txM,lineHeight:1.4,marginTop:1}}>{total} questions, ~30 seconds</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,padding:"8px 10px",background:"rgba(45,139,78,0.03)",borderRadius:8,border:"1px solid rgba(45,139,78,0.08)"}}>
          <span style={{fontSize:16,flexShrink:0}}>🩺</span>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#2D8B4E"}}>Doctor Questions</div>
            <div style={{fontSize:10,color:T.txM,lineHeight:1.4,marginTop:1}}>Answer questions in each finding's detail panel — auto-completes when you answer 3+</div>
          </div>
        </div>
      </div>

      {/* Progress from doctor questions */}
      {docAnswerCount>0&&(
        <div style={{maxWidth:300,margin:"0 auto 12px",padding:"8px 12px",background:docAnswerCount>=3?"rgba(45,139,78,0.04)":"rgba(0,113,227,0.04)",borderRadius:8,border:`1px solid ${docAnswerCount>=3?"rgba(45,139,78,0.12)":"rgba(0,113,227,0.08)"}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:10,fontWeight:700,color:docAnswerCount>=3?"#2D8B4E":"#0071E3"}}>Doctor Questions Progress</span>
            <span style={{fontSize:10,color:T.txL}}>{docAnswerCount} answered</span>
          </div>
          <div style={{height:3,background:T.bgD,borderRadius:2,overflow:"hidden"}}>
            <div style={{width:`${Math.min(100,(docAnswerCount/3)*100)}%`,height:"100%",background:docAnswerCount>=3?"#2D8B4E":"#0071E3",borderRadius:2,transition:"width .3s"}} />
          </div>
          {docAnswerCount<3&&<div style={{fontSize:9,color:T.txM,marginTop:4}}>Answer {3-docAnswerCount} more across any finding to auto-complete</div>}
          {docAnswerCount>=3&&<div style={{fontSize:9,color:"#2D8B4E",marginTop:4,fontWeight:600}}>✓ Enough answers to auto-complete! Assessment will finalize automatically.</div>}
        </div>
      )}

      <ClinicalBadges />
      <button onClick={()=>setStep(1)} style={{
        background:"#0071E3",border:"none",color:"#fff",padding:"11px 32px",borderRadius:10,
        fontSize:14,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 12px rgba(0,113,227,0.2)",
      }}>Start Quick Assessment</button>
      <div style={{fontSize:10,color:T.txL,marginTop:10}}>Or keep answering doctor questions in finding details</div>
    </div>
  );

  // ─── Complete ───
  if(step>total) return(
    <div style={{animation:"fadeIn .4s",textAlign:"center",padding:"16px 0"}}>
      <div style={{fontSize:36,marginBottom:10}}>✅</div>
      <div style={{fontSize:16,fontWeight:700,color:T.tx,marginBottom:4,fontFamily:"Georgia,serif"}}>Assessment Complete</div>
      <div style={{fontSize:12,color:T.txM,lineHeight:1.6,maxWidth:280,margin:"0 auto 14px"}}>
        Your personalized report is ready with recommendations based on your {findings?.length||0} findings, activity goals, and medical history.
      </div>
      <ClinicalBadges />

      {/* Exercise program CTA */}
      {paid&&<button onClick={()=>onGoToExercises?.()} style={{
        width:"100%",maxWidth:300,margin:"0 auto 12px",padding:"12px 16px",borderRadius:10,
        background:"linear-gradient(135deg,#2D8B4E 0%,#1A7F7A 100%)",border:"none",color:"#fff",
        cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
        boxShadow:"0 4px 12px rgba(45,139,78,0.2)",
      }}>
        <span style={{fontSize:18}}>🏋️</span>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:13,fontWeight:700}}>View Your Exercise Program</div>
          <div style={{fontSize:10,opacity:.85}}>Customized to your assessment</div>
        </div>
        <span style={{fontSize:14,marginLeft:"auto"}}>→</span>
      </button>}

      {/* Email capture + PDF download */}
      <div style={{maxWidth:300,margin:"0 auto 12px",padding:"14px 16px",background:T.sfA,borderRadius:10,border:`1px solid ${T.bd}`}}>
        {!emailSubmitted?(
          <>
            <div style={{fontSize:11,fontWeight:700,color:T.tx,marginBottom:2}}>Download Your PDF Report</div>
            <div style={{fontSize:10,color:T.txL,marginBottom:10,lineHeight:1.4}}>Enter your email to receive your report. We'll also send updates if new research affects your findings.</div>
            <div style={{display:"flex",gap:6}}>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{flex:1,padding:"9px 10px",borderRadius:7,border:"1px solid rgba(0,0,0,0.1)",fontSize:12,outline:"none",background:T.sf}}
                onKeyDown={e=>{if(e.key==="Enter"&&email.includes("@"))submitEmail()}}
              />
              <button onClick={submitEmail} disabled={!email.includes("@")} style={{
                padding:"9px 14px",borderRadius:7,border:"none",fontSize:11,fontWeight:700,cursor:email.includes("@")?"pointer":"not-allowed",
                background:email.includes("@")?"#0071E3":T.bgD,color:email.includes("@")?"#fff":T.txL,
              }}>→</button>
            </div>
            <button onClick={()=>setEmailSubmitted(true)} style={{
              marginTop:8,background:"none",border:"none",color:T.txL,fontSize:9,cursor:"pointer",textDecoration:"underline",
            }}>Skip — download without email</button>
          </>
        ):(
          <>
            {email.includes("@")&&<div style={{fontSize:10,color:"#2D8B4E",fontWeight:600,marginBottom:8}}>✓ We'll send updates to {email}</div>}
            <button onClick={()=>onGenerateReport?.(findings,answers,joint)} style={{
              width:"100%",padding:"11px 20px",borderRadius:8,border:"none",
              background:"#0071E3",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",
              boxShadow:"0 4px 12px rgba(0,113,227,0.2)",
            }}>Download PDF Report</button>
            <div style={{fontSize:9,color:T.txL,marginTop:6}}>Generated instantly in your browser</div>
          </>
        )}
      </div>

      {/* Answer summary */}
      <div style={{textAlign:"left",padding:"10px 12px",background:T.sfA,borderRadius:8,border:`1px solid ${T.bd}`}}>
        <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:T.txL,marginBottom:8}}>Your Responses</div>
        {questions.map((q,i)=>{
          const a=answers[q.id];
          let display="—";
          if(q.type==="yesno")display=a===true?"Yes":a===false?"No":"—";
          if(q.type==="slider")display=a!=null?`${a}/10`:"—";
          if(q.type==="tags"||q.type==="conditions")display=a?.length>0?a.join(", "):"None selected";
          return(
            <div key={i} style={{marginBottom:8,paddingBottom:8,borderBottom:i<questions.length-1?`1px solid ${T.bd}`:"none"}}>
              <div style={{fontSize:10,color:T.txL,marginBottom:2}}>Q{i+1}</div>
              <div style={{fontSize:11,color:T.tx,fontWeight:600,marginBottom:2}}>{q.q}</div>
              <div style={{fontSize:11,color:"#0071E3"}}>{display}</div>
            </div>
          );
        })}
      </div>
      <button onClick={()=>{setStep(0);setAnswers({});setEmailSubmitted(false)}} style={{marginTop:10,background:"none",border:`1px solid ${T.bdM}`,color:T.txL,padding:"6px 14px",borderRadius:6,fontSize:10,cursor:"pointer"}}>Retake Assessment</button>
      <div style={{marginTop:12,textAlign:"left"}}><ClinicalBadge /></div>
    </div>
  );

  // ─── Question card ───
  const val=answers[current.id];
  return(
    <div style={{animation:"fadeIn .25s",padding:"8px 0"}}>
      {/* Progress */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <div style={{flex:1,height:4,background:T.bgD,borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(step/total)*100}%`,background:"#0071E3",borderRadius:2,transition:"width .3s"}} />
        </div>
        <span style={{fontSize:10,color:T.txL,fontWeight:600,flexShrink:0}}>{step}/{total}</span>
      </div>

      {/* Question */}
      <div style={{fontSize:14,fontWeight:700,color:T.tx,lineHeight:1.5,marginBottom:4,fontFamily:"Georgia,serif"}}>{current.q}</div>
      <div style={{fontSize:10,color:T.txL,lineHeight:1.5,marginBottom:14,fontStyle:"italic"}}>{current.why}</div>

      {/* ── Yes/No ── */}
      {current.type==="yesno"&&(
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[true,false].map(v=>(
            <button key={String(v)} onClick={()=>setAnswer(current.id,v)} style={{
              flex:1,padding:"14px 12px",borderRadius:10,border:`2px solid ${val===v?"#0071E3":"rgba(0,0,0,0.08)"}`,
              background:val===v?"rgba(0,113,227,0.06)":T.sf,cursor:"pointer",
              fontSize:14,fontWeight:700,color:val===v?T.ac:T.txM,transition:"all .15s",
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
              background:val!=null?(val<=3?"rgba(45,139,78,0.1)":val<=6?"rgba(196,93,0,0.1)":"rgba(191,16,41,0.1)"):T.bg,
              fontSize:18,fontWeight:800,fontFamily:"monospace",flexShrink:0,
              color:val!=null?(val<=3?"#2D8B4E":val<=6?"#C45D00":"#BF1029"):T.txL,
              transition:"all .2s",
            }}>{val!=null?val:"—"}</div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            {current.labels.map((l,i)=>(
              <span key={i} style={{fontSize:9,color:T.txL,fontWeight:600}}>{l}</span>
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
                border:`1.5px solid ${sel?"#0071E3":T.bdM}`,
                background:sel?"rgba(0,113,227,0.06)":T.sf,
                color:sel?T.ac:T.txM,transition:"all .15s",
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
                  border:`1.5px solid ${sel?"#6B3FA0":T.bd}`,
                  background:sel?"rgba(107,63,160,0.06)":T.sf,
                  color:sel?"#6B3FA0":T.txM,transition:"all .15s",
                }}>{sel?"✓ ":""}{opt}</button>
              );
            })}
          </div>
          <div style={{fontSize:10,color:T.txL,marginTop:8}}>Select all that apply, or skip if none.</div>
        </div>
      )}

      {/* Navigation */}
      <div style={{display:"flex",gap:8}}>
        {step>1&&<button onClick={()=>setStep(s=>s-1)} style={{
          padding:"10px 18px",borderRadius:8,border:`1px solid ${T.bdM}`,
          background:T.sf,color:T.txM,fontSize:12,fontWeight:600,cursor:"pointer",
        }}>← Back</button>}
        <button onClick={()=>{if(step===total){onComplete?.(answers)}setStep(s=>s+1)}} disabled={!canNext} style={{
          flex:1,padding:"10px 18px",borderRadius:8,border:"none",
          background:canNext?"#0071E3":T.bgD,color:canNext?"#fff":T.txL,
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
      <div style={{padding:"6px 10px",background:"rgba(26,127,122,0.08)",borderRadius:8,border:"1px solid rgba(26,127,122,0.15)",marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:700,color:"#1A7F7A",marginBottom:2}}>NOT A RECOMMENDATION</div>
        <div style={{fontSize:11,lineHeight:1.5,color:T.txM}}>These are options typically discussed for your findings. The right treatment depends on your examination, goals, and your physician's assessment.</div>
      </div>

      {findings.map(f=>{
        if(!f.treatments||f.treatments.length===0)return null;
        const sc=f.sev==="severe"?"#BF1029":f.sev==="moderate"?"#C45D00":"#A68B00";
        const sorted=[...f.treatments].sort((a,b)=>(TYPE_ORDER[a.type]||0)-(TYPE_ORDER[b.type]||0));
        return(
          <div key={f.id} style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <span style={{fontSize:9,fontWeight:700,color:sc,background:sc+"12",padding:"2px 7px",borderRadius:4,textTransform:"uppercase",letterSpacing:1}}>{f.sev}</span>
              <span style={{fontSize:12,fontWeight:700,color:T.tx,fontFamily:"Georgia,serif"}}>{f.str}</span>
            </div>
            {sorted.map((tx,i)=>{
              const isSel=activeTx?.name===tx.name&&txFinding?.id===f.id;
              return(
                <div key={i} onClick={()=>setActiveTx(tx,f)} style={{
                  padding:"8px 10px",marginBottom:3,borderRadius:7,cursor:"pointer",
                  border:`1px solid ${isSel?tx.color+"44":T.bd}`,
                  background:isSel?tx.color+"08":T.sf,transition:"all .15s",
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
                    <div style={{width:5,height:5,borderRadius:3,background:tx.color,flexShrink:0}} />
                    <span style={{fontSize:11.5,fontWeight:600,color:T.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.name}</span>
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
/* ═══════════════════ RISK/BENEFIT SECTION ═══════════════════ */
function RiskBenefitSection({tx}){
  const name=tx.name?.toLowerCase()||"";
  const type=tx.type||"conservative";

  // Build risk/benefit data based on treatment type and name keywords
  let benefits=[],risks=[];

  if(type==="surgical"){
    benefits.push({text:"Directly addresses the structural problem",level:"high"});
    benefits.push({text:"Often provides the most definitive long-term fix",level:"high"});
    if(name.includes("arthroscop"))benefits.push({text:"Minimally invasive — small incisions, faster recovery than open surgery",level:"high"});
    if(name.includes("reconstruct"))benefits.push({text:"Restores stability for return to sport and high-demand activity",level:"high"});
    if(name.includes("repair"))benefits.push({text:"Preserves native tissue rather than replacing it",level:"moderate"});
    if(name.includes("replacement")||name.includes("arthroplasty"))benefits.push({text:"Significant pain relief for end-stage arthritis",level:"high"});
    if(name.includes("meniscect"))benefits.push({text:"Quick return to activity — often weeks, not months",level:"moderate"});
    benefits.push({text:"Structured rehab protocol with clear milestones",level:"moderate"});

    risks.push({text:"General surgical risks: infection, blood clots, anesthesia reactions",level:"low",note:"<1-2% for most joint procedures"});
    risks.push({text:"Stiffness or loss of range of motion during recovery",level:"moderate"});
    if(name.includes("reconstruct")){
      risks.push({text:"Graft failure or re-tear (5-15% depending on graft type and activity level)",level:"moderate"});
      risks.push({text:"Donor site pain if using your own tissue (autograft)",level:"low"});
    }
    if(name.includes("repair"))risks.push({text:"Re-tear risk, especially with larger or retracted tears",level:"moderate"});
    if(name.includes("replacement"))risks.push({text:"Implant loosening or wear over 15-20+ years",level:"low",note:"May need revision"});
    risks.push({text:"Extended recovery period (weeks to months of rehab)",level:"moderate"});
    if(!name.includes("arthroscop"))risks.push({text:"Longer recovery compared to arthroscopic options",level:"moderate"});
  } else if(type==="interventional"){
    benefits.push({text:"Less invasive than surgery — often done in-office",level:"high"});
    benefits.push({text:"Quicker recovery — usually days, not weeks",level:"high"});
    if(name.includes("injection")||name.includes("cortisone")||name.includes("steroid")){
      benefits.push({text:"Rapid pain relief, often within days",level:"high"});
      benefits.push({text:"Can serve as diagnostic tool — confirms pain source",level:"moderate"});
    }
    if(name.includes("prp")||name.includes("platelet"))benefits.push({text:"Uses your own blood — low allergy or rejection risk",level:"moderate"});
    if(name.includes("viscosupplementation")||name.includes("hyaluronic"))benefits.push({text:"May delay or avoid need for joint replacement",level:"moderate"});
    benefits.push({text:"Can be repeated if effective",level:"moderate"});

    if(name.includes("cortisone")||name.includes("steroid")){
      risks.push({text:"Temporary pain flare for 24-48 hours after injection",level:"low"});
      risks.push({text:"Repeated injections may weaken tendons or cartilage",level:"moderate",note:"Usually limited to 3-4 per year"});
      risks.push({text:"Blood sugar elevation in diabetic patients",level:"low"});
    }
    if(name.includes("prp")||name.includes("platelet")){
      risks.push({text:"Limited insurance coverage — often out-of-pocket ($500-1500)",level:"moderate"});
      risks.push({text:"Evidence is still evolving — results vary",level:"moderate"});
    }
    risks.push({text:"Small risk of infection at injection site",level:"low",note:"<0.1%"});
    risks.push({text:"Results may be temporary — may need repeat treatment",level:"moderate"});
  } else {
    // Conservative
    benefits.push({text:"No surgical risk — safest starting point",level:"high"});
    benefits.push({text:"Can begin immediately with minimal cost",level:"high"});
    if(name.includes("physical therapy")||name.includes("pt")||name.includes("rehab")){
      benefits.push({text:"Builds strength to protect the joint long-term",level:"high"});
      benefits.push({text:"Addresses underlying muscle imbalances and movement patterns",level:"moderate"});
      benefits.push({text:"Education on self-management reduces future injury risk",level:"moderate"});
    }
    if(name.includes("brace")||name.includes("immobil"))benefits.push({text:"Immediate stability and pain reduction",level:"moderate"});
    if(name.includes("medication")||name.includes("nsaid")||name.includes("anti-inflam"))benefits.push({text:"Effective at reducing pain and inflammation",level:"moderate"});
    if(name.includes("rice")||name.includes("rest"))benefits.push({text:"Allows natural healing without intervention",level:"moderate"});
    benefits.push({text:"Preserves all future treatment options",level:"high"});

    if(name.includes("physical therapy")||name.includes("pt")||name.includes("rehab")){
      risks.push({text:"Requires consistent effort — results depend on adherence",level:"moderate"});
      risks.push({text:"May take 6-12 weeks to see significant improvement",level:"moderate"});
    }
    if(name.includes("medication")||name.includes("nsaid")){
      risks.push({text:"GI side effects with prolonged NSAID use",level:"moderate"});
      risks.push({text:"Masks pain — may lead to overuse if not careful",level:"low"});
    }
    risks.push({text:"May not be sufficient for structural problems (tears, instability)",level:"moderate"});
    risks.push({text:"Delayed treatment if conservative approach fails",level:"low"});
  }

  // Ensure minimums
  if(benefits.length<2)benefits.push({text:"Generally well-tolerated by most patients",level:"moderate"});
  if(risks.length<2)risks.push({text:"Individual results vary — discuss your specific situation with your doctor",level:"low"});

  const levelColors={high:"#2D8B4E",moderate:"#C45D00",low:T.txM};
  const riskColors={high:"#BF1029",moderate:"#C45D00",low:T.txM};

  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {/* Benefits */}
      <div style={{padding:"12px",background:"rgba(45,139,78,0.04)",borderRadius:10,border:"1px solid rgba(45,139,78,0.1)"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#2D8B4E",textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>✓ Benefits</div>
        {benefits.slice(0,5).map((b,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:6}}>
            <div style={{width:6,height:6,borderRadius:3,background:levelColors[b.level],marginTop:5,flexShrink:0}} />
            <div>
              <div style={{fontSize:11,color:T.tx,lineHeight:1.45}}>{b.text}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Risks */}
      <div style={{padding:"12px",background:"rgba(191,16,41,0.03)",borderRadius:10,border:"1px solid rgba(191,16,41,0.08)"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#BF1029",textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>⚠ Risks</div>
        {risks.slice(0,5).map((r,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:6}}>
            <div style={{width:6,height:6,borderRadius:3,background:riskColors[r.level],marginTop:5,flexShrink:0}} />
            <div>
              <div style={{fontSize:11,color:T.tx,lineHeight:1.45}}>{r.text}</div>
              {r.note&&<div style={{fontSize:9,color:T.txL,marginTop:1}}>{r.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TreatmentDetail({tx,finding,onClose,allFindings,paid,onUnlock}){
  if(!tx||!finding)return null;
  if(!paid) return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:T.sf,animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
      <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <button onClick={()=>onClose("close")} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:T.txL,fontSize:12,cursor:"pointer",padding:0}}>← Back</button>
        </div>
        <h2 style={{fontSize:18,fontWeight:700,color:T.tx,margin:0,fontFamily:"Georgia,serif"}}>{tx.name}</h2>
        <div style={{fontSize:11,color:T.txM,marginTop:2}}>For: {finding.str} — {finding.path}</div>
      </div>
      <LockedPreview onUnlock={onUnlock} features={["Detailed treatment description","Expected timeline and milestones","Pros and considerations analysis","Alternative treatment comparison","Treatment spectrum positioning"]}>
        <div style={{padding:"16px 18px"}}>
          <div style={{marginBottom:16,padding:"12px 14px",background:T.bg,borderRadius:10,fontSize:12.5,lineHeight:1.65,color:T.tx}}>{tx.desc}</div>
          <div style={{marginBottom:16,padding:"12px 14px",background:"rgba(45,139,78,0.08)",borderRadius:10,borderLeft:"3px solid #2D8B4E",fontSize:12,lineHeight:1.6}}>{tx.timeline}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{padding:12,borderRadius:10,background:"rgba(45,139,78,0.05)",border:"1px solid rgba(45,139,78,0.1)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#2D8B4E",marginBottom:4}}>PROS</div>
              <div style={{fontSize:11,color:T.txM,lineHeight:1.5}}>{tx.pros}</div>
            </div>
            <div style={{padding:12,borderRadius:10,background:"rgba(191,16,41,0.03)",border:"1px solid rgba(191,16,41,0.1)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#BF1029",marginBottom:4}}>CONSIDERATIONS</div>
              <div style={{fontSize:11,color:T.txM,lineHeight:1.5}}>{tx.cons}</div>
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
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:T.sf,animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:T.txL,fontSize:12,cursor:"pointer",padding:0}}>← Back</button>
          <span style={{fontSize:9,fontWeight:700,color:tx.color,background:tx.color+"12",padding:"3px 10px",borderRadius:5,textTransform:"uppercase",letterSpacing:1}}>{TYPE_LABELS[tx.type]}</span>
        </div>
        <h2 style={{fontSize:18,fontWeight:700,color:T.tx,margin:0,fontFamily:"Georgia,serif"}}>{tx.name}</h2>
        <div style={{fontSize:11,color:sc,fontWeight:600,marginTop:2}}>For: {finding.str} — {finding.path}</div>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1,overflow:"auto",padding:"16px 18px"}}>

        {/* Approach spectrum */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Treatment Spectrum</div>
          <div style={{display:"flex",alignItems:"center",height:32,background:T.bg,borderRadius:8,overflow:"hidden",position:"relative"}}>
            <div style={{flex:1,textAlign:"center",fontSize:9,fontWeight:700,color:tx.type==="conservative"?tx.color:T.txL,background:tx.type==="conservative"?tx.color+"12":"transparent",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s"}}>CONSERVATIVE</div>
            <div style={{width:1,height:16,background:"rgba(0,0,0,0.08)"}} />
            <div style={{flex:1,textAlign:"center",fontSize:9,fontWeight:700,color:tx.type==="interventional"?tx.color:T.txL,background:tx.type==="interventional"?tx.color+"12":"transparent",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s"}}>INTERVENTIONAL</div>
            <div style={{width:1,height:16,background:"rgba(0,0,0,0.08)"}} />
            <div style={{flex:1,textAlign:"center",fontSize:9,fontWeight:700,color:tx.type==="surgical"?tx.color:T.txL,background:tx.type==="surgical"?tx.color+"12":"transparent",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s"}}>SURGICAL</div>
          </div>
        </div>

        {/* What it involves */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:tx.color+"14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>📋</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>What It Involves</h3>
          </div>
          <div style={{padding:"12px 14px",background:T.bg,borderRadius:10,fontSize:13,lineHeight:1.7,color:T.tx}}>{tx.desc}</div>
        </div>

        {/* Risks & Benefits */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:"rgba(0,113,227,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>⚖️</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>Risks & Benefits</h3>
          </div>
          <RiskBenefitSection tx={tx} />
        </div>

        {/* Timeline visualization */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:"rgba(45,139,78,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>⏱</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>Expected Timeline</h3>
          </div>
          <div style={{padding:"12px 14px",background:"rgba(45,139,78,0.08)",borderRadius:10,borderLeft:"3px solid #2D8B4E"}}>
            {timelineSteps.map((step,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:i<timelineSteps.length-1?8:0}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,marginTop:2}}>
                  <div style={{width:8,height:8,borderRadius:4,background:"#2D8B4E"}} />
                  {i<timelineSteps.length-1&&<div style={{width:1,height:16,background:"rgba(45,139,78,0.2)",marginTop:2}} />}
                </div>
                <div style={{fontSize:12,lineHeight:1.5,color:T.tx}}>{step}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Advantages & Considerations — side by side */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:"rgba(0,113,227,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>⚖️</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>Pros & Considerations</h3>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{padding:"12px",background:"rgba(45,139,78,0.04)",borderRadius:10,border:"1px solid rgba(45,139,78,0.12)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#2D8B4E",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>✓ Advantages</div>
              <div style={{fontSize:12,lineHeight:1.65,color:T.tx}}>{tx.pros}</div>
            </div>
            <div style={{padding:"12px",background:"rgba(191,16,41,0.03)",borderRadius:10,border:"1px solid rgba(191,16,41,0.1)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#BF1029",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>⚠ Considerations</div>
              <div style={{fontSize:12,lineHeight:1.65,color:T.tx}}>{tx.cons}</div>
            </div>
          </div>
        </div>

        {/* Other treatments for this finding */}
        {finding.treatments&&finding.treatments.length>1&&<div style={{marginBottom:16}}>
          <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Other Options for {finding.str}</div>
          <div style={{borderRadius:8,border:`1px solid ${T.bd}`,overflow:"hidden"}}>
            {finding.treatments.filter(t=>t.name!==tx.name).map((alt,i,arr)=>(
              <div key={i} onClick={()=>onClose("switch",alt,finding)} style={{
                padding:"8px 10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",
                borderBottom:i<arr.length-1?`1px solid ${T.bd}`:"none",
                transition:"background .15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background=T.sfA}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:5,height:5,borderRadius:3,background:alt.color}} />
                  <span style={{fontSize:11,fontWeight:500,color:T.tx}}>{alt.name}</span>
                </div>
                <span style={{color:T.txL,fontSize:10}}>→</span>
              </div>
            ))}
          </div>
        </div>}

        {/* Disclaimer */}
        <div style={{padding:"8px 10px",background:"rgba(26,127,122,0.08)",borderRadius:8,border:"1px solid rgba(26,127,122,0.12)"}}>
          <div style={{fontSize:10,lineHeight:1.5,color:"#1A7F7A"}}>
            This is general information about this treatment approach. Your physician will recommend a specific plan based on your examination, imaging, goals, and medical history.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ TABBED PANEL ═══════════════════ */
function TabbedPanel({findings,active,onSel,mob,tab,setTab,activeEx,setActiveEx,activeTx,setActiveTx,txFinding,paid,onUnlock,assessAnswers,onAssessComplete,onGenerateReport,joint,doctorAnswers,recoveryStage}){
  return(
    <>
      <TabBar tab={tab} setTab={setTab} mob={mob} paid={paid} />
      {tab==="findings"&&<Summary findings={findings} active={active} onSel={onSel} mob={mob} />}
      {tab==="exercises"&&<PTLibrary findings={findings} onSelectFinding={onSel} activeEx={activeEx} setActiveEx={setActiveEx} assessAnswers={assessAnswers} paid={paid} onUnlock={onUnlock} onGoToReport={()=>setTab("report")} joint={joint} recoveryStage={recoveryStage} theme={T} />}
      {tab==="treatments"&&<TreatmentsTab findings={findings} activeTx={activeTx} setActiveTx={(tx,f)=>setActiveTx(tx,f)} txFinding={txFinding} />}
      {tab==="report"&&<ReportTab findings={findings} onGenerateReport={onGenerateReport} onComplete={onAssessComplete} joint={joint} onGoToExercises={()=>setTab("exercises")} paid={paid} assessAnswers={assessAnswers} doctorAnswers={doctorAnswers} />}
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

/* ═══════════════════ CLINICAL ADVISORY PANEL ═══════════════════ */
const CLINICAL_PANEL = [
  { title: "Orthopedics — Sports Medicine", color: "#0071E3" },
  { title: "Orthopedics — Trauma", color: "#C45D00" },
  { title: "PM&R — Pain Management", color: "#6B3FA0" },
  { title: "PM&R — Sports Medicine", color: "#2D8B4E" },
  { title: "Physical Therapy", color: "#1A7F7A" },
];

function ClinicalBadge({compact}){
  if(compact) return(
    <div style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:"#1A7F7A",fontWeight:600}}>
      <span style={{width:14,height:14,borderRadius:4,background:"rgba(26,127,122,0.08)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8}}>✓</span>
      Reviewed by ClearScan Clinical Panel
    </div>
  );
  return(
    <div style={{padding:"10px 12px",background:"rgba(26,127,122,0.03)",borderRadius:8,border:"1px solid rgba(26,127,122,0.1)"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
        <div style={{width:18,height:18,borderRadius:5,background:"rgba(26,127,122,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>✓</div>
        <span style={{fontSize:10,fontWeight:700,color:"#1A7F7A",letterSpacing:.3}}>CLINICAL PANEL REVIEWED</span>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:6}}>
        {CLINICAL_PANEL.map(p=>(
          <span key={p.title} style={{fontSize:8,fontWeight:600,color:p.color,background:p.color+"0A",padding:"2px 6px",borderRadius:3}}>{p.title}</span>
        ))}
      </div>
      <div style={{fontSize:9,color:T.txM,lineHeight:1.4}}>
        All clinical content — specialist perspectives, treatment options, exercise protocols, and assessment questions — is reviewed and approved by our multidisciplinary advisory panel.
      </div>
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
          Panel-reviewed specialist perspectives, treatment comparison, personalized PT exercises, self-assessment, and downloadable PDF report.
        </div>}
      </div>
      <button onClick={onUnlock} style={{
        background:T.sf,border:"none",color:"#0071E3",padding:compact?"7px 14px":"11px 22px",
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
        <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>{title}</h3>
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
        <div style={{background:T.sf,borderRadius:14,padding:"24px 22px",boxShadow:"0 8px 32px rgba(0,0,0,0.08)",border:`1px solid ${T.bd}`,maxWidth:300}}>
          <div style={{fontSize:32,marginBottom:10}}>🔓</div>
          <div style={{fontSize:16,fontWeight:700,color:T.tx,marginBottom:6,fontFamily:"Georgia,serif"}}>Unlock Full Access</div>
          <div style={{fontSize:12,color:T.txM,lineHeight:1.6,marginBottom:14}}>
            Get the complete picture — everything you need to prepare for your appointment.
          </div>
          <div style={{textAlign:"left",marginBottom:16}}>
            {features.map((f,i)=>(
              <div key={i} style={{fontSize:11,color:T.txM,padding:"3px 0",display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:"#0071E3",fontSize:11,flexShrink:0}}>✓</span>{f}
              </div>
            ))}
          </div>
          <button onClick={onUnlock} style={{
            width:"100%",background:"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",border:"none",color:"#fff",
            padding:"12px 24px",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",
            boxShadow:"0 4px 16px rgba(0,113,227,0.3)",
          }}>{PRICE} — Unlock Full Report</button>
          <div style={{fontSize:9,color:T.txL,marginTop:6}}>One-time payment · Instant access · No subscription</div>
        </div>
      </div>
    </div>
  );
}

function LockedTab({title,features,onUnlock}){
  return(
    <div style={{animation:"fadeIn .4s",textAlign:"center",padding:"30px 10px"}}>
      <div style={{fontSize:40,marginBottom:12}}>🔒</div>
      <div style={{fontSize:17,fontWeight:700,color:T.tx,marginBottom:6,fontFamily:"Georgia,serif"}}>{title}</div>
      <div style={{fontSize:12,color:T.txL,lineHeight:1.6,maxWidth:280,margin:"0 auto 18px"}}>
        Unlock your full personalized report to access this section.
      </div>
      <div style={{textAlign:"left",maxWidth:260,margin:"0 auto 18px"}}>
        {features.map((f,i)=>(
          <div key={i} style={{fontSize:12,color:T.txM,padding:"5px 0",display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:"#0071E3",fontSize:12}}>✓</span>{f}
          </div>
        ))}
      </div>
      <button onClick={onUnlock} style={{
        background:"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",border:"none",color:"#fff",
        padding:"12px 32px",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",
        boxShadow:"0 4px 16px rgba(0,113,227,0.3)",
      }}>{PRICE} — Unlock Full Report</button>
      <div style={{fontSize:10,color:T.txL,marginTop:8}}>One-time payment · Instant access · No subscription</div>
    </div>
  );
}

/* ═══════════════════ FINDING DETAIL PANE ═══════════════════ */
function FindingDetail({finding,onClose,mob,onSelectTx,paid,onUnlock,doctorAnswers,onDoctorAnswer,assessComplete,joint,recoveryStage,onRecoveryStage}){
  if(!finding)return null;
  const sc=T[finding.sev];
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:T.sf,animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
      {/* Header */}
      <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:T.txL,fontSize:12,cursor:"pointer",padding:0}}>← Back to findings</button>
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
            <span style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1}}>Severity</span>
            <span style={{fontSize:10,fontWeight:600,color:sc.c}}>{Math.round(finding.sc*100)}%</span>
          </div>
          <div style={{height:6,background:T.bgD,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${finding.sc*100}%`,background:sc.c,borderRadius:3,transition:"width .5s ease"}} />
          </div>
        </div>

        {/* What it is */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:sc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🔍</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>What This Means</h3>
          </div>
          <div style={{padding:"12px 14px",background:T.bg,borderRadius:10,fontSize:13,lineHeight:1.7,color:T.tx}}>{finding.desc}</div>
        </div>

        {/* What you may feel */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:"rgba(0,113,227,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>💬</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>What You May Experience</h3>
          </div>
          <div style={{padding:"12px 14px",background:T.acS,borderRadius:10,borderLeft:"3px solid #0071E3",fontSize:12.5,lineHeight:1.65,color:T.txM}}>{finding.imp}</div>
        </div>

        {/* Clinical context */}
        <div style={{marginBottom:16,padding:"10px 14px",background:T.sfA,borderRadius:10}}>
          <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Clinical Context</div>
          <div style={{fontSize:12,lineHeight:1.6,color:T.txM}}>{finding.ctx}</div>
        </div>

        {/* Self-assessment — interactive doctor questions (PREMIUM) */}
        {finding.selfAssess&&finding.selfAssess.length>0&&(
        <LockedSection title="Questions Your Doctor Will Ask" icon="🩺" paid={paid} onUnlock={onUnlock} previewLines={4}>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,lineHeight:1.5,color:T.txL,marginBottom:6}}>
            Answer these questions now — they feed into your personalized assessment and prepare you for your appointment.
          </div>
          {assessComplete&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:"rgba(45,139,78,0.06)",borderRadius:6,marginBottom:10,border:"1px solid rgba(45,139,78,0.1)"}}>
            <span style={{fontSize:11}}>✅</span>
            <span style={{fontSize:10,fontWeight:600,color:"#2D8B4E"}}>Assessment complete — your answers are personalizing your exercises and report</span>
          </div>}
          {(()=>{
            const fId=finding.id||finding.str;
            const answeredCount=finding.selfAssess.filter((_,i)=>doctorAnswers?.[`${fId}_${i}`]!=null).length;
            const totalQ=finding.selfAssess.length;
            return(
              <>
              {answeredCount>0&&!assessComplete&&<div style={{marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:9,fontWeight:700,color:"#0071E3",textTransform:"uppercase",letterSpacing:1}}>Assessment Progress</span>
                  <span style={{fontSize:9,color:T.txL}}>{answeredCount}/{totalQ} answered</span>
                </div>
                <div style={{height:3,background:T.bgD,borderRadius:2,overflow:"hidden"}}>
                  <div style={{width:`${(answeredCount/totalQ)*100}%`,height:"100%",background:"#0071E3",borderRadius:2,transition:"width .3s"}} />
                </div>
              </div>}
              {finding.selfAssess.map((sa,i)=>{
                const qKey=`${fId}_${i}`;
                const ans=doctorAnswers?.[qKey];
                const ansVal=ans?.val;
                // ── Smart question type + assessment mapping ──
                const q=sa.q;
                const ql=q.toLowerCase();
                // Pain severity → slider 0-10
                const isPain=/pain|hurt|ach|sore|discomfort|tender/i.test(q)&&/worse|level|rate|how (bad|much|severe)|scale|reproduce/i.test(q);
                // Pain location → pick area
                const isLocation=/where.*pain|point.*spot|which (side|part|area)|location/i.test(q);
                // Activity / sport question → multi-select tags
                const isActivity=/what activit|what sport|which sport|important to you.*sport|play.*sport/i.test(q);
                // Frequency / how often
                const isFreq=/how often|how frequent|how many times|episodes/i.test(q);
                // Severity scale (non-pain)
                const isScale=/on a scale|rate.*confidence|how (confident|stable|comfortable|limited)/i.test(q);

                let qType="yesno"; // default
                if(isPain||isScale)qType="slider";
                else if(isLocation)qType="location";
                else if(isActivity)qType="tags";
                else if(isFreq)qType="frequency";

                // Assessment field mapping
                let mapsTo="instability"; // default
                if(isPain)mapsTo="pain";
                else if(isActivity)mapsTo="goals";
                else if(/prior|previous|inject|therap|surgery|treatment/i.test(q))mapsTo="prior";
                else if(/give.?way|buckle|unstable|slip|dislocate|shift|trust/i.test(q))mapsTo="instability";
                else if(/swell|stiff|lock|catch|click|pop|snap|grind/i.test(q))mapsTo="symptoms";
                else if(/walk|stair|run|squat|bend|straighten|overhead|reach|raise|lift/i.test(q))mapsTo="function";

                // Frequency options
                const freqOpts=[{label:"Never",val:0},{label:"Rarely",val:1},{label:"Sometimes",val:2},{label:"Often",val:3},{label:"Daily",val:4}];
                // Activity tags based on joint
                const actTags=joint==="shoulder"
                  ?["Overhead Sports","Throwing","Weightlifting","Swimming","Yoga","CrossFit","Desk Work","Daily Activities"]
                  :["Running","Cutting/Pivoting","Weightlifting","Hiking","Cycling","Swimming","Walking","Desk Work"];

                return(
                  <div key={i} style={{marginBottom:8,borderRadius:8,border:`1px solid ${ansVal!=null?"rgba(0,113,227,0.15)":"rgba(0,0,0,0.06)"}`,overflow:"hidden",transition:"border-color .2s"}}>
                    <div style={{padding:"10px 12px",background:ansVal!=null?"rgba(0,113,227,0.02)":"#F5F9FE",display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{color:ansVal!=null?"#2D8B4E":"#0071E3",fontSize:13,fontWeight:700,flexShrink:0,marginTop:1,fontFamily:"monospace"}}>{ansVal!=null?"✓":i+1}</span>
                      <span style={{fontSize:12.5,lineHeight:1.55,color:T.tx,fontWeight:600}}>{sa.q}</span>
                    </div>
                    {/* Answer controls */}
                    <div style={{padding:"8px 12px 10px 32px",background:T.sf,borderTop:`1px solid ${T.bd}`}}>
                      {qType==="yesno"&&(
                        <div style={{display:"flex",gap:6,marginBottom:6}}>
                          {[{label:"Yes",val:true},{label:"No",val:false},{label:"Not sure",val:"unsure"}].map(opt=>(
                            <button key={String(opt.val)} onClick={()=>onDoctorAnswer?.(qKey,{val:opt.val,maps:mapsTo})} style={{
                              flex:1,padding:"7px 8px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .15s",
                              border:ansVal===opt.val?"2px solid #0071E3":"1px solid rgba(0,0,0,0.08)",
                              background:ansVal===opt.val?"rgba(0,113,227,0.06)":T.sf,
                              color:ansVal===opt.val?T.ac:T.txM,
                            }}>{opt.label}</button>
                          ))}
                        </div>
                      )}
                      {qType==="slider"&&(
                        <div style={{marginBottom:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <input type="range" min={0} max={10} step={1} value={typeof ansVal==="number"?ansVal:5}
                              onChange={e=>onDoctorAnswer?.(qKey,{val:parseInt(e.target.value),maps:mapsTo})}
                              style={{flex:1,accentColor:"#0071E3"}}
                            />
                            <span style={{fontSize:14,fontWeight:700,color:"#0071E3",minWidth:20,textAlign:"center"}}>{typeof ansVal==="number"?ansVal:"–"}</span>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:T.txL,marginTop:2}}>
                            <span>{isPain?"No pain":"Not at all"}</span><span>Moderate</span><span>{isPain?"Severe":"Extremely"}</span>
                          </div>
                        </div>
                      )}
                      {qType==="frequency"&&(
                        <div style={{display:"flex",gap:4,marginBottom:6,flexWrap:"wrap"}}>
                          {freqOpts.map(opt=>(
                            <button key={opt.val} onClick={()=>onDoctorAnswer?.(qKey,{val:opt.val,maps:mapsTo})} style={{
                              padding:"6px 10px",borderRadius:7,fontSize:10,fontWeight:600,cursor:"pointer",transition:"all .15s",
                              border:ansVal===opt.val?"2px solid #0071E3":"1px solid rgba(0,0,0,0.08)",
                              background:ansVal===opt.val?"rgba(0,113,227,0.06)":T.sf,
                              color:ansVal===opt.val?T.ac:T.txM,
                            }}>{opt.label}</button>
                          ))}
                        </div>
                      )}
                      {qType==="tags"&&(
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
                          {actTags.map(tag=>{
                            const sel=Array.isArray(ansVal)?ansVal.includes(tag):false;
                            return(
                              <button key={tag} onClick={()=>{
                                const cur=Array.isArray(ansVal)?[...ansVal]:[];
                                const next=sel?cur.filter(t=>t!==tag):[...cur,tag];
                                onDoctorAnswer?.(qKey,{val:next,maps:"goals"});
                              }} style={{
                                padding:"5px 9px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",
                                border:sel?"2px solid #0071E3":"1px solid rgba(0,0,0,0.08)",
                                background:sel?"rgba(0,113,227,0.06)":T.sf,color:sel?T.ac:T.txM,
                              }}>{tag}</button>
                            );
                          })}
                        </div>
                      )}
                      {qType==="location"&&(
                        <div style={{display:"flex",gap:6,marginBottom:6}}>
                          <input type="text" placeholder="e.g. inner knee, front of shoulder..."
                            value={typeof ansVal==="string"?ansVal:""}
                            onChange={e=>onDoctorAnswer?.(qKey,{val:e.target.value,maps:"symptoms"})}
                            style={{flex:1,padding:"7px 10px",borderRadius:7,border:"1px solid rgba(0,0,0,0.1)",fontSize:11,outline:"none"}}
                          />
                        </div>
                      )}
                      <div style={{fontSize:10,lineHeight:1.5,color:T.txM,fontStyle:"italic"}}>
                        <span style={{color:"#0071E3",fontWeight:600,fontStyle:"normal"}}>Why they ask: </span>{sa.why}
                      </div>
                    </div>
                  </div>
                );
              })}
              </>
            );
          })()}
          <div style={{padding:"8px 10px",background:"rgba(0,113,227,0.04)",borderRadius:6,marginTop:6}}>
            <div style={{fontSize:10,lineHeight:1.5,color:"#0071E3"}}>
              <strong>Tip:</strong> Your answers here feed directly into your personalized exercise plan and report. Answer at least 3 questions across any findings to auto-complete your assessment.
            </div>
          </div>
        </div>
        </LockedSection>
        )}

        {/* Expected timeline — visual */}
        {finding.timeline&&<div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{width:24,height:24,borderRadius:7,background:"rgba(45,139,78,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>⏱</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>Recovery Timeline</h3>
          </div>
          <RecoveryTimeline finding={finding} joint={joint} selected={recoveryStage} onSelect={onRecoveryStage} />
        </div>}

        {/* Specialist perspectives (PREMIUM) */}
        {finding.lenses&&finding.lenses.length>0&&(
        <LockedSection title="Specialist Perspectives" icon="👥" paid={paid} onUnlock={onUnlock} previewLines={3}>
        <div style={{marginBottom:16}}>
          {finding.lenses.map((l,i)=>(
            <div key={i} style={{padding:"10px 12px",borderRadius:8,marginBottom:6,background:l.color+"06",borderLeft:`3px solid ${l.color}`}}>
              <div style={{fontSize:10,fontWeight:700,color:l.color,marginBottom:3}}>{l.spec}</div>
              <div style={{fontSize:12,lineHeight:1.6,color:T.txM}}>{l.text}</div>
            </div>
          ))}
        </div>
        </LockedSection>
        )}

        {/* Treatment options — compact list (PREMIUM) */}
        {finding.treatments&&finding.treatments.length>0&&(
        <LockedSection title="Treatment Options" icon="💊" paid={paid} onUnlock={onUnlock} previewLines={3}>
        <div style={{marginBottom:16}}>
          <div style={{borderRadius:10,border:`1px solid ${T.bd}`,overflow:"hidden"}}>
            {finding.treatments.map((tx,i)=>(
              <div key={i} onClick={()=>paid&&onSelectTx?.(tx,finding)} style={{
                padding:"10px 12px",cursor:paid?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"space-between",
                borderBottom:i<finding.treatments.length-1?`1px solid ${T.bd}`:"none",
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
                  <span style={{color:T.txL,fontSize:11}}>→</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:T.txL,marginTop:6,marginLeft:32}}>Tap to explore details, timeline, and comparison</div>
        </div>
        </LockedSection>
        )}

        {/* Questions to ask (PREMIUM) */}
        {finding.questions&&finding.questions.length>0&&(
        <LockedSection title="Questions for Your Doctor" icon="❓" paid={paid} onUnlock={onUnlock} previewLines={2}>
        <div style={{marginBottom:16}}>
          <div style={{padding:"10px 14px",background:T.sfA,borderRadius:10,border:`1px solid ${T.bd}`}}>
            {finding.questions.map((q,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:i<finding.questions.length-1?`1px solid ${T.bd}`:"none"}}>
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

        {/* Clinical panel badge */}
        <ClinicalBadge />

        {/* Disclaimer */}
        <div style={{padding:"8px 10px",background:"rgba(26,127,122,0.08)",borderRadius:8,border:"1px solid rgba(26,127,122,0.12)",marginTop:10}}>
          <div style={{fontSize:10,lineHeight:1.5,color:"#1A7F7A"}}>
            This content is reviewed by our clinical advisory panel for accuracy. Your treating physician will provide recommendations specific to your situation.
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
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:T.sf,animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
      <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:T.txL,fontSize:12,cursor:"pointer",padding:0}}>← Back</button>
        </div>
        <h2 style={{fontSize:mob?18:20,fontWeight:700,color:T.tx,margin:0,fontFamily:"Georgia,serif"}}>{ex.name}</h2>
      </div>
      <LockedPreview onUnlock={onUnlock} features={["Step-by-step exercise instructions","Video demonstration","Safety guidelines and contraindications","Recommended sets, reps, and frequency","Clinical rationale for each exercise"]}>
        <ExerciseDetailContent ex={ex} mob={mob} />
      </LockedPreview>
    </div>
  );
  const pc=PHASE_CLR[ex.phase];
  return(
    <div style={{
      display:"flex",flexDirection:"column",height:"100%",background:T.sf,
      animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)",overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:T.txL,fontSize:12,cursor:"pointer",padding:0}}>
            ← Back to exercises
          </button>
          <span style={{fontSize:9,fontWeight:700,color:pc,background:pc+"14",padding:"3px 10px",borderRadius:5,textTransform:"uppercase",letterSpacing:1}}>
            {PHASE_TM[ex.phase]}
          </span>
        </div>
        <h2 style={{fontSize:mob?18:20,fontWeight:700,color:T.tx,margin:0,fontFamily:"Georgia,serif"}}>{ex.name}</h2>
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
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>How to Perform</h3>
          </div>
          <div style={{padding:"12px 14px",background:T.bg,borderRadius:10,fontSize:13,lineHeight:1.7,color:T.tx}}>
            {ex.desc}
          </div>
          {/* Why this exercise */}
          <div style={{padding:"10px 14px",background:pc+"08",borderRadius:10,borderLeft:`3px solid ${pc}`,marginTop:8}}>
            <div style={{fontSize:10,fontWeight:700,color:pc,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Why this exercise matters</div>
            <div style={{fontSize:12,lineHeight:1.6,color:T.tx}}>{ex.why}</div>
          </div>
        </div>

        {/* REPS & CIRCUIT */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:24,height:24,borderRadius:7,background:pc+"14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🔄</div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>Reps & Circuit</h3>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{padding:"14px",background:T.acS,borderRadius:10,textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Prescription</div>
              <div style={{fontSize:15,fontWeight:700,color:"#0071E3"}}>{ex.rx}</div>
            </div>
            <div style={{padding:"14px",background:T.acS,borderRadius:10,textAlign:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Tempo</div>
              <div style={{fontSize:15,fontWeight:700,color:"#0071E3"}}>{ex.duration}</div>
            </div>
          </div>
          {/* Targets */}
          <div style={{marginTop:10,padding:"10px 14px",background:T.sfA,borderRadius:10}}>
            <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Addresses these findings</div>
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
            <h3 style={{fontSize:14,fontWeight:700,color:T.tx,margin:0}}>Safety & Precautions</h3>
          </div>
          <div style={{padding:"12px 14px",borderRadius:10,border:"1px solid rgba(191,16,41,0.12)",background:"rgba(191,16,41,0.03)"}}>
            <div style={{fontSize:12.5,lineHeight:1.65,color:T.txM}}>{ex.avoid}</div>
          </div>
          <div style={{marginTop:8,padding:"10px 14px",background:"rgba(26,127,122,0.08)",borderRadius:10,border:"1px solid rgba(26,127,122,0.15)"}}>
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
        <h3 style={{fontSize:14,fontWeight:700,color:T.tx,marginBottom:8}}>How to Perform</h3>
        <div style={{padding:"12px 14px",background:T.bg,borderRadius:10,fontSize:12.5,lineHeight:1.65,color:T.tx}}>{ex.desc}</div>
      </div>
      <div style={{marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.tx,marginBottom:8}}>Why This Exercise</h3>
        <div style={{padding:"12px 14px",background:pc+"08",borderRadius:10,fontSize:12.5,lineHeight:1.65,color:T.txM}}>{ex.why}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{padding:14,background:T.acS,borderRadius:10,textAlign:"center"}}>
          <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Prescription</div>
          <div style={{fontSize:15,fontWeight:700,color:"#0071E3"}}>{ex.rx}</div>
        </div>
        <div style={{padding:14,background:T.acS,borderRadius:10,textAlign:"center"}}>
          <div style={{fontSize:9,fontWeight:700,color:T.txL,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Tempo</div>
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
        width:6,flexShrink:0,cursor:"col-resize",background:T.sf,borderLeft:"1px solid rgba(0,0,0,0.06)",
        borderRight:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"center",
        position:"relative",zIndex:5,transition:"background .15s",
      }}
      onMouseEnter={e=>e.currentTarget.style.background=T.acS}
      onMouseLeave={e=>{if(!dragging.current)e.currentTarget.style.background=T.sf}}
      >
        <div style={{width:2,height:32,borderRadius:1,background:"rgba(0,0,0,0.12)"}} />
      </div>
      <div style={{flex:1,overflow:"hidden",position:"relative",animation:"slideInRight .3s cubic-bezier(.16,1,.3,1)"}}>{right}</div>
    </div>
  );
}

/* ═══════════════════ APP ═══════════════════ */
export default function App(){
  const[text,setText]=useState("");
  const[phase,setPhase]=useState("landing");
  const[findings,setFindings]=useState(null);
  const[ri,setRi]=useState(-1);
  const[tourProgress,setTourProgress]=useState(0);
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
  const[assessAnswers,setAssessAnswers]=useState(null);
  const[recoveryStage,setRecoveryStage]=useState(null); // {index, week, label, title}
  const[showReportPreview,setShowReportPreview]=useState(false);
  const[doctorAnswers,setDoctorAnswers]=useState({}); // keyed by "findingId_qIndex"
  const[dark,setDark]=useState(()=>{try{return localStorage.getItem("cs_dark")==="1"}catch{return false}});
  const[explorerInfo,setExplorerInfo]=useState(null); // {name, desc, ...} when tapping 3D model structure

  // Apply theme
  T=dark?TD:TL;
  const toggleDark=()=>{const nv=!dark;setDark(nv);try{localStorage.setItem("cs_dark",nv?"1":"0")}catch{}};

  // Derive assessment from doctor question answers
  const derivedAssess=useMemo(()=>{
    const keys=Object.keys(doctorAnswers);
    if(keys.length<3)return null; // need at least 3 answers
    const da={};
    // Instability-related answers (give way, buckle, slip, dislocate)
    const instKeys=keys.filter(k=>doctorAnswers[k]?.maps==="instability");
    if(instKeys.length>0) da.instability=instKeys.some(k=>doctorAnswers[k].val===true);
    // Pain-related answers (sliders)
    const painKeys=keys.filter(k=>doctorAnswers[k]?.maps==="pain"&&typeof doctorAnswers[k].val==="number");
    if(painKeys.length>0) da.pain=Math.round(painKeys.reduce((s,k)=>s+(doctorAnswers[k].val||0),0)/painKeys.length);
    // Activity/goals (tag arrays)
    const goalKeys=keys.filter(k=>doctorAnswers[k]?.maps==="goals"&&Array.isArray(doctorAnswers[k].val));
    if(goalKeys.length>0) da.goals=[...new Set(goalKeys.flatMap(k=>doctorAnswers[k].val))];
    // Prior treatment
    const priorKeys=keys.filter(k=>doctorAnswers[k]?.maps==="prior");
    if(priorKeys.length>0) da.prior=priorKeys.some(k=>doctorAnswers[k].val===true);
    // Symptom answers (clicking, locking, catching) → infer pain if not set
    const sympKeys=keys.filter(k=>doctorAnswers[k]?.maps==="symptoms");
    if(sympKeys.length>0&&!da.pain) {
      const positiveSymps=sympKeys.filter(k=>doctorAnswers[k].val===true).length;
      da.pain=Math.min(10,positiveSymps*3+3); // rough inference
    }
    // Function answers (walking, stairs, overhead) → infer instability if not set
    const funcKeys=keys.filter(k=>doctorAnswers[k]?.maps==="function");
    if(funcKeys.length>0&&da.instability==null) {
      da.instability=funcKeys.some(k=>doctorAnswers[k].val===false||doctorAnswers[k].val==="unsure");
    }
    // Auto-complete if we have at least 2 distinct assessment fields covered
    const answered=Object.keys(da).length;
    if(answered>=2&&keys.length>=3)return da;
    return null;
  },[doctorAnswers]);

  // Auto-set assessAnswers from doctor questions if not already set via ReportTab
  useEffect(()=>{
    if(!assessAnswers&&derivedAssess){setAssessAnswers(derivedAssess);setShowReportPreview(true)}
  },[derivedAssess,assessAnswers]);
  const[joint,setJoint]=useState(null); // "knee"|"shoulder"|"hip"|null // null = not completed
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
      setJoint("knee");
      setTimeout(()=>{pTrans();setFindings(DEMO_FD);setPhase("summary");setActive(null)},1500);
    } else {
      try {
        // Detect joint type
        const detected = detectJoint(text);
        if(!detected){
          setErr("Could not identify the joint type. Please paste the IMPRESSION section of a knee, shoulder, or hip MRI report.");
          setPhase("input");
          return;
        }
        setJoint(detected);

        // Parse with the correct pipeline
        const { findings: mapped } = await parseReport(text, detected);
        if(mapped.length === 0){
          const info = JOINT_INFO[detected];
          setErr(`No pathological findings detected. Make sure you're pasting the IMPRESSION section of a ${info?.label || detected} MRI report.`);
          setPhase("input");
          return;
        }
        pTrans();
        setFindings(mapped);
        // Short delay so the analyzing splash completes visually
        setTimeout(()=>{setPhase("summary");setActive(null)},1500);
      } catch(e) {
        console.error('Parse failed:', e);
        setErr(e.message || "Unable to analyze this report. Please check the text and try again.");
        setPhase("input");
      }
    }
  },[text]);

  // Select condition from landing page → set text and auto-analyze
  const selectCondition=useCallback((sampleText)=>{
    setText("IMPRESSION:\n"+sampleText);
    // Need a tick for setText to propagate, then run
    setTimeout(async()=>{
      await Tone.start().catch(()=>{});initS();
      setPhase("analyzing");setErr(null);pAmb();
      try{
        const fullText="IMPRESSION:\n"+sampleText;
        const detected=detectJoint(fullText);
        if(!detected){setErr("Could not identify the joint type.");setPhase("input");return}
        setJoint(detected);
        const{findings:mapped}=await parseReport(fullText,detected);
        if(mapped.length===0){setErr("No findings detected from this sample.");setPhase("input");return}
        pTrans();setFindings(mapped);
        setTimeout(()=>{setPhase("summary");setActive(null)},1500);
      }catch(e){console.error(e);setErr(e.message||"Unable to analyze.");setPhase("input")}
    },50);
  },[]);

  // (revealing phase removed — go straight to summary)

  const reset=()=>{setPhase("landing");setFindings(null);setRi(-1);setActive(null);setShowH(false);setText("");setTab("findings");setActiveEx(null);setDetailFinding(null);setActiveTx(null);setTxFinding(null);setErr(null);setAssessAnswers(null);setRecoveryStage(null);setShowReportPreview(false);setDoctorAnswers({});setJoint(null);setTourProgress(0)};
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
      <h2 style={{fontSize:mob?20:24,fontWeight:700,color:T.tx,margin:"0 0 6px",fontFamily:"Georgia,serif"}}>Understand Your MRI</h2>
      <p style={{fontSize:mob?13:14,color:T.txL,margin:"0 0 18px",lineHeight:1.55}}>Paste the Impression section from your MRI report. We support <strong>knee</strong> and <strong>shoulder</strong> — we'll auto-detect the joint and visualize each finding in 3D.</p>
      {err&&<div style={{padding:"10px 12px",background:"rgba(191,16,41,0.06)",border:"1px solid rgba(191,16,41,0.15)",borderRadius:8,marginBottom:12,fontSize:12,lineHeight:1.5,color:"#BF1029"}}>{err}</div>}
      <textarea value={text} onChange={e=>{setText(e.target.value);setErr(null)}} placeholder="Paste your MRI impression here..." style={{flex:1,minHeight:mob?120:160,background:T.bgD,border:`1px solid ${err?"rgba(191,16,41,0.3)":T.bd}`,borderRadius:12,padding:14,color:T.tx,fontSize:13,fontFamily:"'SF Mono',Consolas,monospace",lineHeight:1.7,resize:"none"}} />
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <button onClick={go} disabled={!text.trim()} style={{flex:1,padding:"11px 18px",borderRadius:10,border:"none",background:text.trim()?T.ac:T.bgD,color:text.trim()?"#fff":T.txL,fontSize:14,fontWeight:600,cursor:text.trim()?"pointer":"not-allowed"}}>Visualize Findings</button>
        <button onClick={()=>setText(SAMPLE)} style={{padding:"11px 12px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.sf,color:T.txM,fontSize:11,fontWeight:500,cursor:"pointer"}}>🦵 Knee</button>
        <button onClick={()=>setText(SHOULDER_SAMPLE)} style={{padding:"11px 12px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.sf,color:T.txM,fontSize:11,fontWeight:500,cursor:"pointer"}}>💪 Shoulder</button>
      </div>
      <Trust />
    </>
  );

  const hdr=(
    <div style={{height:mob?48:56,borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:`0 ${mob?16:24}px`,background:T.sf,flexShrink:0}}>
      <div onClick={reset} style={{display:"flex",alignItems:"center",gap:mob?8:12,cursor:"pointer"}}>
        <div style={{width:mob?26:30,height:mob?26:30,borderRadius:mob?7:9,background:"linear-gradient(135deg,#0071E3,#5BA3F5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:mob?13:15,fontWeight:800,color:"#fff"}}>C</div>
        <span style={{fontSize:mob?15:16,fontWeight:700,color:T.tx}}>ClearScan</span>
        {!mob&&<span style={{fontSize:11,color:T.txL,fontWeight:500,marginLeft:4}}>MRI Interpreter</span>}
        {joint&&phase!=="input"&&<span style={{fontSize:9,fontWeight:700,color:"#0071E3",background:"rgba(0,113,227,0.07)",padding:"3px 8px",borderRadius:4,marginLeft:6,textTransform:"uppercase",letterSpacing:.5}}>{joint==="knee"?"🦵 Knee":joint==="shoulder"?"💪 Shoulder":joint==="hip"?"🦴 Hip":joint}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <button onClick={toggleDark} style={{background:"none",border:`1px solid ${T.bd}`,color:T.txM,padding:mob?"5px 8px":"6px 10px",borderRadius:7,fontSize:13,cursor:"pointer",lineHeight:1}} title={dark?"Light mode":"Dark mode"}>{dark?"☀️":"🌙"}</button>
        {phase==="summary"&&findings&&<button onClick={hBtn} style={{background:showH?T.ac:T.sf,border:`1px solid ${showH?T.ac:T.bdM}`,color:showH?"#fff":T.txM,padding:mob?"5px 10px":"6px 14px",borderRadius:7,fontSize:11,fontWeight:500,cursor:"pointer",transition:"all .2s"}}>{showH?"✓ Healthy":"Compare Healthy"}</button>}
        {phase!=="landing"&&phase!=="input"&&<button onClick={reset} style={{background:T.bgD,border:`1px solid ${T.bd}`,color:T.txM,padding:mob?"5px 10px":"6px 14px",borderRadius:7,fontSize:11,cursor:"pointer"}}>New Report</button>}
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
    ? <FindingDetail finding={detailFinding} onClose={()=>{setDetailFinding(null);setActive(null)}} mob={true} onSelectTx={selectTx} paid={paid} onUnlock={startCheckout} doctorAnswers={doctorAnswers} onDoctorAnswer={(k,v)=>setDoctorAnswers(p=>({...p,[k]:v}))} assessComplete={!!assessAnswers} joint={joint} recoveryStage={recoveryStage} onRecoveryStage={setRecoveryStage} />
    : null;

  if(mob)return(
    <div style={{width:"100%",height:"100vh",background:T.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {phase!=="landing"&&<>{styles}{hdr}</>}
      {phase==="landing"?<LandingPage onStart={()=>setPhase("input")} onSelectCondition={selectCondition} mob={true} dark={dark} toggleDark={toggleDark} />
      :phase==="input"?<div style={{flex:1,overflow:"auto",padding:16,display:"flex",flexDirection:"column"}}>{inputUI()}</div>:(
        <div ref={mobContainerRef} style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
          {/* 3D Viewport */}
          <div style={{height:`${mobSplit}%`,position:"relative",flexShrink:0,overflow:"hidden"}}>
            <JointCanvas findings={findings} active={active} phase={phase} showH={showH} joint={joint} dark={dark} onStructureClick={(name)=>setExplorerInfo(name)} />
            {phase==="summary"&&<SpecialistFinder joint={joint} mob={true} />}
            {phase==="analyzing"&&<AnalyzingSplash joint={joint} mob={true} />}
            {explorerInfo&&<AnatomyExplorerCard structureName={explorerInfo} onClose={()=>setExplorerInfo(null)} joint={joint} />}
          </div>
          {/* Vertical drag handle */}
          {phase==="summary"&&findings&&(
            <div
              style={{
                height:paid?10:28,flexShrink:0,background:T.sf,
                borderTop:`1px solid ${T.bd}`,borderBottom:`1px solid ${T.bd}`,
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
               : tab==="exercises" ? <PTLibrary findings={findings} onSelectFinding={togSel} activeEx={activeEx} setActiveEx={setActiveEx} assessAnswers={assessAnswers} paid={paid} onUnlock={startCheckout} onGoToReport={()=>onTabChange("report")} joint={joint} recoveryStage={recoveryStage} theme={T} />
               : tab==="treatments" ? <TreatmentsTab findings={findings} activeTx={activeTx} setActiveTx={selectTx} txFinding={txFinding} />
               : tab==="report" ? <ReportTab findings={findings} onGenerateReport={(f,a,j)=>generateReport(f,j,recoveryStage)} onComplete={(a)=>{setAssessAnswers(a);setShowReportPreview(true)}} joint={joint} onGoToExercises={()=>onTabChange("exercises")} paid={paid} assessAnswers={assessAnswers} doctorAnswers={doctorAnswers} />
               : null}
            </div>
          </div>}
          {/* Report preview overlay */}
          {showReportPreview&&phase==="summary"&&<div style={{position:"absolute",inset:0,zIndex:40}}>
            <ReportPreview findings={findings} joint={joint} paid={paid} onUnlock={startCheckout} onDismiss={()=>setShowReportPreview(false)} onDownload={()=>{generateReport(findings,joint,recoveryStage);setShowReportPreview(false)}} />
          </div>}
        </div>
      )}
    </div>
  );

  // ─── DESKTOP ───
  if(phase==="landing")return(
    <div style={{width:"100%",height:"100vh",background:T.bg,overflow:"auto"}}>
      {styles}
      <LandingPage onStart={()=>setPhase("input")} onSelectCondition={selectCondition} mob={false} dark={dark} toggleDark={toggleDark} />
    </div>
  );
  return(
    <div style={{width:"100%",height:"100vh",background:T.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {styles}{hdr}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{width:phase==="analyzing"?0:(phase==="input"?400:360),borderRight:phase==="analyzing"?"none":`1px solid ${T.bd}`,display:"flex",flexDirection:"column",flexShrink:0,background:T.sf,transition:"width .5s cubic-bezier(.16,1,.3,1)",overflow:"hidden"}}>
          <div style={{padding:"22px 20px",display:"flex",flexDirection:"column",flex:1,overflow:"auto",minWidth:phase==="input"?400:360}}>
            {phase==="input"&&inputUI()}
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
                  background:"transparent",border:`1px solid ${T.bdM}`,color:T.txL,
                  padding:"4px 10px",borderRadius:5,fontSize:9,fontWeight:600,cursor:"pointer",
                }}>Lock</button>
              </div>}
              <TabbedPanel findings={findings} active={active} onSel={togSel} mob={false} tab={tab} setTab={onTabChange} activeEx={activeEx} setActiveEx={setActiveEx} activeTx={activeTx} setActiveTx={selectTx} txFinding={txFinding} paid={paid} onUnlock={startCheckout} assessAnswers={assessAnswers} onAssessComplete={(a)=>{setAssessAnswers(a);setShowReportPreview(true)}} onGenerateReport={(f,a,j)=>generateReport(f,j,recoveryStage)} joint={joint} doctorAnswers={doctorAnswers} recoveryStage={recoveryStage} theme={T} />
            </>}
          </div>
        </div>
        <ResizableSplit
          show={!!(detailFinding||activeEx||activeTx||showReportPreview)}
          defaultPct={50} minPct={30} maxPct={70}
          left={
            <div style={{width:"100%",height:"100%",position:"relative",background:`radial-gradient(ellipse at 50% 40%,${dark?"#222226":"#faf9f7"} 0%,${T.bg} 100%)`}}>
              <JointCanvas findings={findings} active={active} phase={phase} showH={showH} joint={joint} dark={dark} onStructureClick={(name)=>setExplorerInfo(name)} />
              {phase==="analyzing"&&<AnalyzingSplash joint={joint} mob={false} />}
              {phase==="summary"&&<SpecialistFinder joint={joint} mob={false} />}
              {active&&phase==="summary"&&!detailFinding&&!activeEx&&!activeTx&&!showReportPreview&&<div style={{position:"absolute",top:14,left:180,background:T.sf,padding:"7px 14px",borderRadius:9,boxShadow:"0 2px 12px rgba(0,0,0,.05)",fontSize:13,fontWeight:600,color:T.tx,zIndex:10,animation:"fadeIn .3s"}}>{active.str} <span style={{color:T[active.sev].c,fontSize:11,marginLeft:6}}>● {active.path}</span></div>}
              <div style={{position:"absolute",top:14,right:14,fontSize:10,color:T.txF,pointerEvents:"none"}}>{explorerInfo?"Tap structures to explore":"Drag to rotate · Scroll to zoom"}</div>
              {explorerInfo&&<AnatomyExplorerCard structureName={explorerInfo} onClose={()=>setExplorerInfo(null)} joint={joint} />}
              {phase==="input"&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none"}}><div style={{fontSize:48,marginBottom:14,opacity:.15}}>🦴</div><div style={{fontSize:15,color:T.txL,fontWeight:500}}>Your 3D joint model</div><div style={{fontSize:12,color:T.txF,marginTop:6}}>Paste an MRI report to see findings visualized</div></div>}
              {phase==="summary"&&!detailFinding&&!activeEx&&!activeTx&&!showReportPreview&&<div style={{position:"absolute",bottom:20,left:20,right:20,maxWidth:440,background:paid?T.sf:"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",borderRadius:11,padding:"14px 18px",boxShadow:"0 4px 20px rgba(0,0,0,.08)",border:paid?`1px solid ${T.bd}`:"none",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:10,animation:"slideUp .5s cubic-bezier(.16,1,.3,1)"}}><div><div style={{fontSize:13,fontWeight:600,color:paid?T.tx:"#fff"}}>{paid?"Your full report is ready":"Unlock detailed analysis"}</div><div style={{fontSize:11,color:paid?T.txL:"rgba(255,255,255,0.8)",marginTop:2}}>{paid?"Specialist perspectives, exercises, questions":"Specialist insights, exercise guides, treatment deep-dives"}</div></div><button onClick={paid?()=>generateReport(findings,joint,recoveryStage):startCheckout} style={{background:paid?T.ac:"#fff",border:"none",color:paid?"#fff":"#0071E3",padding:"9px 18px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,marginLeft:14,boxShadow:paid?"none":"0 2px 8px rgba(0,0,0,0.15)"}}>{paid?"Download PDF":`${PRICE} — Unlock Pro`}</button></div>}
            </div>
          }
          right={
            showReportPreview&&!detailFinding&&!activeEx&&!activeTx
              ? <ReportPreview findings={findings} joint={joint} paid={paid} onUnlock={startCheckout} onDismiss={()=>setShowReportPreview(false)} onDownload={()=>{generateReport(findings,joint,recoveryStage);setShowReportPreview(false)}} />
              : activeEx
              ? <ExerciseDetail ex={activeEx} onClose={()=>setActiveEx(null)} mob={false} paid={paid} onUnlock={startCheckout} />
              : activeTx
              ? <TreatmentDetail tx={activeTx} finding={txFinding} onClose={handleTxClose} allFindings={findings} paid={paid} onUnlock={startCheckout} />
              : <FindingDetail finding={detailFinding} onClose={()=>{setDetailFinding(null);setActive(null)}} mob={false} onSelectTx={selectTx} paid={paid} onUnlock={startCheckout} doctorAnswers={doctorAnswers} onDoctorAnswer={(k,v)=>setDoctorAnswers(p=>({...p,[k]:v}))} assessComplete={!!assessAnswers} joint={joint} recoveryStage={recoveryStage} onRecoveryStage={setRecoveryStage} />
          }
        />
      </div>
    </div>
  );
}
