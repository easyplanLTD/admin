import { useState, useMemo, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const APPLIANCE_TYPES = ["Washing Machine","Tumble Dryer","Dishwasher","Fridge/Freezer","Oven/Cooker","Hob","Microwave"];
const BRANDS = {
  "Washing Machine":["AEG","Beko","Bosch","Candy","Hoover","Hotpoint","Indesit","LG","Miele","Samsung","Siemens","Whirlpool","Zanussi","Other"],
  "Tumble Dryer":   ["AEG","Beko","Bosch","Candy","Hoover","Hotpoint","Indesit","LG","Miele","Samsung","Siemens","Whirlpool","Zanussi","Other"],
  "Dishwasher":     ["AEG","Beko","Bosch","Candy","Hoover","Hotpoint","Indesit","LG","Miele","Samsung","Siemens","Whirlpool","Zanussi","Other"],
  "Fridge/Freezer": ["AEG","Beko","Bosch","Candy","Haier","Hotpoint","Indesit","LG","Miele","Samsung","Siemens","Whirlpool","Zanussi","Other"],
  "Oven/Cooker":    ["AEG","Beko","Bosch","Candy","Hotpoint","Indesit","Neff","Rangemaster","Samsung","Siemens","Smeg","Other"],
  "Hob":            ["AEG","Beko","Bosch","Candy","Hotpoint","Indesit","Neff","Siemens","Smeg","Other"],
  "Microwave":      ["Bosch","Hotpoint","LG","Panasonic","Samsung","Sharp","Siemens","Other"],
};
const SOURCES  = ["Manchester Site","Leeds Site","Sheffield Site","Liverpool Site","Birmingham Site","Direct Call","Other"];
const STATUSES = ["Booked","Assigned","Parts Awaited","In Progress","Completed","Beyond Repair","Cancelled"];
const TODAY    = "2026-06-06";

// When someone follows an invite or password-reset email, Supabase redirects here with
// #access_token=...&type=invite (or type=recovery) in the URL. supabase-js's own
// auto-detection of this is turned off (see supabaseClient.js) because it ran
// asynchronously and reliably beat any check we did at render time -- by the time we
// looked, it had already consumed and stripped the hash, so the "set your password"
// screen this is supposed to trigger never appeared. Instead we capture it ourselves here,
// synchronously, the instant this module loads -- before anything else can touch it -- and
// the App component below establishes the session from these tokens itself.
const AUTH_HASH = (() => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const type = params.get("type");
  if (!type) return null;
  return { type, accessToken: params.get("access_token"), refreshToken: params.get("refresh_token") };
})();

function inviteOrRecoveryType(){
  return AUTH_HASH?.type || null;
}

// ─── SEED DATA ───────────────────────────────────────────────────────────────
// Engineers and staff/owner accounts are real now (Supabase auth + the
// `profiles`/`engineers` tables) — see loadEngineers()/loadStaffUsers() in
// the App component below. Jobs remain local demo data for now (that's a
// separate, larger migration — see the project README), so the
// `engineerId` values below ("e1" etc.) are just placeholders and won't
// match any real engineer until you create one with a matching job
// assigned; until then these seed jobs will show as "Unassigned".
const SEED_JOBS = [
  { id:1001, customer:"Janet Moore",   phone:"07811 234567", email:"janet@email.com",    address:"14 Oak St, Manchester, M1 4AB",    postcode:"M1",  appliance:"Washing Machine", brand:"Hotpoint", applianceAge:5, issue:"Won't spin – loud noise",       source:"Manchester Site", status:"Completed",     engineerId:"e1", scheduledDate:"2026-06-02", scheduledTime:"09:00", completedDate:"2026-06-02", priority:"Normal", partsNeeded:false,partsOrdered:false,partsArrived:false, rate:45, paid:true,  notes:"Drum bearing replaced.", notifBooking:true,notifReminder:true,notifOnWay:true,notifComplete:true  },
  { id:1002, customer:"Robert Singh",  phone:"07922 345678", email:"rsingh@email.com",   address:"7 Birch Lane, Leeds, LS2 9JQ",     postcode:"LS2", appliance:"Fridge/Freezer",  brand:"Samsung",  applianceAge:3, issue:"Not cooling at all",            source:"Leeds Site",      status:"Parts Awaited", engineerId:"e2", scheduledDate:"2026-06-07", scheduledTime:"10:30", completedDate:null,         priority:"Urgent", partsNeeded:true, partsOrdered:true, partsArrived:false, rate:50, paid:false, notes:"Parts ETA Monday.",      notifBooking:true,notifReminder:false,notifOnWay:false,notifComplete:false },
  { id:1003, customer:"Claire Watson", phone:"07733 456789", email:"cwatson@email.com",  address:"22 Maple Rd, Sheffield, S3 8BN",   postcode:"S3",  appliance:"Dishwasher",      brand:"Bosch",    applianceAge:7, issue:"Leaking from base",             source:"Sheffield Site",  status:"Booked",        engineerId:null, scheduledDate:"2026-06-09", scheduledTime:"14:00", completedDate:null,         priority:"Normal", partsNeeded:false,partsOrdered:false,partsArrived:false, rate:null,paid:false, notes:"",                       notifBooking:true,notifReminder:false,notifOnWay:false,notifComplete:false },
  { id:1004, customer:"Tom Bradley",   phone:"07844 567890", email:"tbradley@email.com", address:"5 Elm Close, Liverpool, L4 2TH",   postcode:"L4",  appliance:"Oven/Cooker",     brand:"Hotpoint", applianceAge:4, issue:"Not heating – element gone",    source:"Liverpool Site",  status:"Assigned",      engineerId:"e3", scheduledDate:"2026-06-10", scheduledTime:"11:00", completedDate:null,         priority:"High",   partsNeeded:true, partsOrdered:true, partsArrived:false, rate:48, paid:false, notes:"Element ordered.",        notifBooking:true,notifReminder:false,notifOnWay:false,notifComplete:false },
  { id:1005, customer:"Anita Sharma",  phone:"07955 678901", email:"anita@email.com",    address:"88 Pine Ave, Manchester, M20 6GR", postcode:"M20", appliance:"Tumble Dryer",    brand:"AEG",      applianceAge:2, issue:"Not drying – 3+ cycles needed", source:"Manchester Site", status:"In Progress",   engineerId:"e1", scheduledDate:"2026-06-06", scheduledTime:"13:00", completedDate:null,         priority:"Normal", partsNeeded:false,partsOrdered:false,partsArrived:false, rate:45, paid:false, notes:"Engineer on site.",      notifBooking:true,notifReminder:true,notifOnWay:true,notifComplete:false },
  { id:1006, customer:"Liam Foster",   phone:"07612 789012", email:"liam@email.com",     address:"3 Cedar Mews, Birmingham, B2 5ST", postcode:"B2",  appliance:"Washing Machine", brand:"Beko",     applianceAge:8, issue:"Error code E3, door stuck",     source:"Birmingham Site", status:"Beyond Repair", engineerId:"e2", scheduledDate:"2026-06-04", scheduledTime:"09:30", completedDate:"2026-06-04", priority:"Normal", partsNeeded:false,partsOrdered:false,partsArrived:false, rate:50, paid:false, notes:"Parts unavailable, BER.", notifBooking:true,notifReminder:true,notifOnWay:true,notifComplete:true  },
  { id:1007, customer:"Nina Patel",    phone:"07521 890123", email:"nina@email.com",     address:"61 Sycamore Dr, Liverpool, L2 9QP",postcode:"L2",  appliance:"Washing Machine", brand:"LG",       applianceAge:6, issue:"Drum cracked",                  source:"Liverpool Site",  status:"Completed",     engineerId:"e3", scheduledDate:"2026-05-28", scheduledTime:"10:00", completedDate:"2026-05-28", priority:"Normal", partsNeeded:true, partsOrdered:true, partsArrived:true,  rate:48, paid:true,  notes:"Drum replaced.",         notifBooking:true,notifReminder:true,notifOnWay:true,notifComplete:true  },
];

let _nextJobId = 1008;

// ─── AUTO-ASSIGN ─────────────────────────────────────────────────────────────
function autoAssign(job, engineers, jobs) {
  const pc = (job.postcode || "").toUpperCase().trim();
  const pcAlpha = pc.replace(/[0-9\s]+$/, "");

  const eligible = engineers.filter(eng => {
    const covers = eng.postcodes.some(p => {
      const up = p.toUpperCase();
      return pc === up || pc.startsWith(up) || pcAlpha === up;
    });
    if (!covers) return false;
    if (!eng.applianceTypes.includes(job.appliance)) return false;
    const excl = eng.brandExclusions[job.appliance] || [];
    if (job.brand && excl.includes(job.brand)) return false;
    return true;
  });

  if (!eligible.length) return null;

  return eligible.sort((a, b) => {
    const totA = a.stats.repairs + a.stats.beyondRepair;
    const totB = b.stats.repairs + b.stats.beyondRepair;
    const rA = totA ? a.stats.repairs / totA : 0;
    const rB = totB ? b.stats.repairs / totB : 0;
    if (Math.abs(rA - rB) > 0.02) return rB - rA;
    const actA = jobs.filter(j => j.engineerId === a.id && !["Completed","Beyond Repair","Cancelled"].includes(j.status)).length;
    const actB = jobs.filter(j => j.engineerId === b.id && !["Completed","Beyond Repair","Cancelled"].includes(j.status)).length;
    return actA - actB;
  })[0];
}

// ─── TOKENS — EasyRepair brand ───────────────────────────────────────────────
const C = {
  bg:"#000000",     card:"#141414",   sidebar:"#000000",
  primary:"#d4ff3c",  primaryLight:"rgba(212,255,60,0.12)",
  success:"#4ade80",  successLight:"rgba(74,222,128,0.12)",
  warn:"#fbbf24",     warnLight:"rgba(251,191,36,0.12)",
  danger:"#f87171",   dangerLight:"rgba(248,113,113,0.12)",
  purple:"#c084fc",   purpleLight:"rgba(192,132,252,0.12)",
  text:"#F1F5F9", mid:"#94A3B8", light:"#475569", border:"#262626",
};
const STATUS_C = {
  "Booked":        {bg:"rgba(251,191,36,0.15)",  t:"#fbbf24", dot:"#fbbf24"},
  "Assigned":      {bg:"rgba(212,255,60,0.12)",  t:"#d4ff3c", dot:"#d4ff3c"},
  "Parts Awaited": {bg:"rgba(192,132,252,0.15)", t:"#c084fc", dot:"#c084fc"},
  "In Progress":   {bg:"rgba(251,146,60,0.15)",  t:"#fb923c", dot:"#fb923c"},
  "Completed":     {bg:"rgba(74,222,128,0.15)",  t:"#4ade80", dot:"#4ade80"},
  "Beyond Repair": {bg:"rgba(248,113,113,0.15)", t:"#f87171", dot:"#f87171"},
  "Cancelled":     {bg:"rgba(100,116,139,0.15)", t:"#64748B", dot:"#64748B"},
};
const ROLE_C = {
  owner:   {label:"Owner",    color:"#c084fc", bg:"rgba(192,132,252,0.15)"},
  staff:   {label:"Staff",    color:"#d4ff3c", bg:"rgba(212,255,60,0.12)"},
  engineer:{label:"Engineer", color:"#4ade80", bg:"rgba(74,222,128,0.12)"},
};

const inp = {width:"100%",padding:"8px 11px",border:"1.5px solid #262626",borderRadius:7,fontSize:13,color:"#F1F5F9",background:"#000000",boxSizing:"border-box",fontFamily:"inherit",outline:"none"};
const ta  = {...inp,resize:"vertical",minHeight:68};
const fmt = d => d ? new Date(d+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";
const pct = (a,b) => b===0 ? "—" : Math.round(a/b*100)+"%";

// ─── ATOMS ───────────────────────────────────────────────────────────────────
const Badge = ({status}) => {
  const c = STATUS_C[status]||STATUS_C["Booked"];
  return <span style={{background:c.bg,color:c.t,padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}><span style={{width:6,height:6,borderRadius:"50%",background:c.dot,flexShrink:0}}/>{status}</span>;
};
const PBadge = ({p}) => {
  const m={Normal:{bg:"rgba(100,116,139,0.2)",t:"#94A3B8"},High:{bg:"rgba(251,191,36,0.15)",t:"#fbbf24"},Urgent:{bg:"rgba(248,113,113,0.15)",t:"#f87171"}}[p]||{bg:"rgba(100,116,139,0.2)",t:"#94A3B8"};
  return <span style={{background:m.bg,color:m.t,padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:800,letterSpacing:.5}}>{(p||"Normal").toUpperCase()}</span>;
};
const RolePill = ({role}) => {
  const m=ROLE_C[role]||ROLE_C.staff;
  return <span style={{background:m.bg,color:m.color,padding:"2px 9px",borderRadius:12,fontSize:11,fontWeight:700}}>{m.label}</span>;
};
const Av = ({initials,size=32,color=C.primary}) =>
  <div style={{width:size,height:size,borderRadius:"50%",background:color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:size*.34,flexShrink:0}}>{initials}</div>;
const StatCard = ({label,value,sub,color="#d4ff3c"}) =>
  <div style={{background:C.card,borderRadius:11,padding:"16px 18px",borderLeft:`4px solid ${color}`,flex:1,minWidth:120,boxShadow:"0 4px 16px rgba(0,0,0,.3)"}}><div style={{fontSize:24,fontWeight:900,color:C.text}}>{value}</div><div style={{fontSize:11,color:C.mid,marginTop:1}}>{label}</div>{sub&&<div style={{fontSize:10,color,fontWeight:700,marginTop:2}}>{sub}</div>}</div>;
const Fl = ({label,children}) =>
  <div style={{marginBottom:11}}><div style={{fontSize:10,fontWeight:700,color:C.light,textTransform:"uppercase",letterSpacing:.7,marginBottom:4}}>{label}</div>{children}</div>;
const Btn = ({onClick,children,variant="primary",sm,full,style:s={}}) => {
  const v={
    primary:{bg:"#d4ff3c",c:"#000000"},
    ghost:  {bg:"rgba(255,255,255,0.07)",c:"#94A3B8"},
    danger: {bg:"rgba(248,113,113,0.15)",c:"#f87171"},
    success:{bg:"rgba(74,222,128,0.15)",c:"#4ade80"},
  }[variant]||{bg:"#d4ff3c",c:"#000000"};
  return <button onClick={onClick} style={{background:v.bg,color:v.c,border:"none",borderRadius:7,padding:sm?"5px 10px":"9px 16px",fontWeight:700,fontSize:sm?11:13,cursor:"pointer",fontFamily:"inherit",width:full?"100%":"auto",...s}}>{children}</button>;
};

// ─── MODAL ───────────────────────────────────────────────────────────────────
const Modal = ({title,onClose,children,wide}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(10,15,30,.6)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:12}} onClick={onClose}>
    <div style={{background:C.card,borderRadius:14,width:"100%",maxWidth:wide?840:620,maxHeight:"93vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.3)"}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:"15px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.card,zIndex:1}}>
        <div style={{fontWeight:800,fontSize:15,color:C.text}}>{title}</div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",width:26,height:26,borderRadius:"50%",cursor:"pointer",fontSize:16,color:C.mid,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      <div style={{padding:"18px 22px"}}>{children}</div>
    </div>
  </div>
);

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// Real Supabase auth. FixFlow is staff/owner only — if the credentials
// belong to an engineer account (they now sign in at portal.easyrepair.co.uk
// instead), we sign them straight back out and explain why, rather than
// letting an engineer role into the admin panel.
function Login({onLogin}) {
  const [email,setEmail]=useState(""); const [pass,setPass]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const go = async () => {
    setErr(""); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) { setErr("Incorrect email or password."); setLoading(false); return; }
    const { data: profile, error: profErr } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    if (profErr || !profile) {
      await supabase.auth.signOut();
      setErr("Couldn't find an account for this login. Contact an owner."); setLoading(false); return;
    }
    if (profile.role === "engineer") {
      await supabase.auth.signOut();
      setErr("Engineers sign in at portal.easyrepair.co.uk — this is the staff/owner admin panel."); setLoading(false); return;
    }
    onLogin(profile);
  };
  return (
    <div style={{minHeight:"100vh",background:"#000000",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',sans-serif",padding:16}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <img src="/logo.png" alt="Easy Repair" style={{height:40,margin:"0 auto 10px",display:"block"}}/>
          <div style={{color:"#475569",fontSize:11,marginTop:2}}>FixFlow — Internal Portal</div>
        </div>
        <div style={{background:"#141414",borderRadius:16,padding:30,boxShadow:"0 24px 80px rgba(0,0,0,.6)",border:"1px solid #262626"}}>
          <Fl label="Email"><input style={inp} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@easyrepair.co.uk" onKeyDown={e=>e.key==="Enter"&&go()}/></Fl>
          <Fl label="Password"><input type="password" style={inp} value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&go()}/></Fl>
          {err&&<div style={{background:"rgba(248,113,113,0.15)",color:"#f87171",borderRadius:7,padding:"8px 12px",fontSize:13,marginBottom:12,fontWeight:600,border:"1px solid rgba(248,113,113,0.3)"}}>{err}</div>}
          <Btn onClick={go} full style={{padding:"12px 0",fontSize:14,opacity:loading?.7:1}}>{loading?"Signing in…":"Sign In →"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── SET PASSWORD (invite / reset link landing) ────────────────────────────────
function SetPasswordScreen({onDone}) {
  const [pass,setPass]=useState(""); const [confirm,setConfirm]=useState(""); const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const submit = async () => {
    setErr("");
    if(pass.length<8){setErr("Password must be at least 8 characters.");return;}
    if(pass!==confirm){setErr("Passwords don't match.");return;}
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setBusy(false);
    if(error){setErr(error.message);return;}
    window.history.replaceState(null,"",window.location.pathname+window.location.search);
    onDone();
  };
  return (
    <div style={{minHeight:"100vh",background:"#000000",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',sans-serif",padding:16}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <img src="/logo.png" alt="Easy Repair" style={{height:40,margin:"0 auto 10px",display:"block"}}/>
          <div style={{color:"#475569",fontSize:11,marginTop:2}}>Set your password</div>
        </div>
        <div style={{background:"#141414",borderRadius:16,padding:30,boxShadow:"0 24px 80px rgba(0,0,0,.6)",border:"1px solid #262626"}}>
          <Fl label="New Password"><input type="password" style={inp} value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••"/></Fl>
          <Fl label="Confirm Password"><input type="password" style={inp} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()}/></Fl>
          {err&&<div style={{background:"rgba(248,113,113,0.15)",color:"#f87171",borderRadius:7,padding:"8px 12px",fontSize:13,marginBottom:12,fontWeight:600}}>{err}</div>}
          <Btn onClick={submit} full style={{padding:"12px 0",fontSize:14,opacity:busy?.7:1}}>{busy?"Saving…":"Set Password →"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── JOB FORM ─────────────────────────────────────────────────────────────────
function JobForm({initial,onSave,onCancel,canEditRate,engineers,jobs}) {
  const blank = {customer:"",phone:"",email:"",address:"",postcode:"",appliance:APPLIANCE_TYPES[0],brand:"",applianceAge:"",issue:"",source:SOURCES[0],status:"Booked",engineerId:null,scheduledDate:"",scheduledTime:"09:00",completedDate:"",priority:"Normal",partsNeeded:false,partsOrdered:false,partsArrived:false,rate:"",paid:false,notes:""};
  const [f,setF] = useState(initial?{...initial,rate:initial.rate??""}:blank);
  const [hint,setHint] = useState(null);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const brandList = BRANDS[f.appliance]||[];

  const tryAuto = () => {
    const s = autoAssign(f, engineers, jobs);
    if (s) { setHint({type:"ok",msg:`Best match: ${s.name} (${Math.round(s.stats.repairs/(s.stats.repairs+s.stats.beyondRepair)*100)||0}% success rate)`}); set("engineerId",s.id); if(!f.rate&&canEditRate) set("rate",s.rate); }
    else setHint({type:"err",msg:"No eligible engineer found for this postcode, appliance and brand combination."});
  };

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Fl label="Customer Name"><input style={inp} value={f.customer} onChange={e=>set("customer",e.target.value)} placeholder="Full name"/></Fl>
        <Fl label="Phone"><input style={inp} value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="07..."/></Fl>
        <Fl label="Email"><input style={inp} value={f.email} onChange={e=>set("email",e.target.value)}/></Fl>
        <Fl label="Source Website"><select style={inp} value={f.source} onChange={e=>set("source",e.target.value)}>{SOURCES.map(s=><option key={s}>{s}</option>)}</select></Fl>
      </div>
      <Fl label="Full Address (inc. postcode)"><input style={inp} value={f.address} onChange={e=>set("address",e.target.value)} placeholder="Street, City, Postcode"/></Fl>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <Fl label="Postcode area (for matching)"><input style={inp} value={f.postcode} onChange={e=>set("postcode",e.target.value.toUpperCase())} placeholder="e.g. M1 or LS2"/></Fl>
        <Fl label="Appliance Type"><select style={inp} value={f.appliance} onChange={e=>{set("appliance",e.target.value);set("brand","");}}>{APPLIANCE_TYPES.map(a=><option key={a}>{a}</option>)}</select></Fl>
        <Fl label="Brand"><select style={inp} value={f.brand} onChange={e=>set("brand",e.target.value)}><option value="">— Select —</option>{brandList.map(b=><option key={b}>{b}</option>)}</select></Fl>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <Fl label="Appliance Age (years)"><input type="number" min="0" max="30" style={inp} value={f.applianceAge} onChange={e=>set("applianceAge",e.target.value)} placeholder="e.g. 5"/></Fl>
        <Fl label="Priority"><select style={inp} value={f.priority} onChange={e=>set("priority",e.target.value)}><option>Normal</option><option>High</option><option>Urgent</option></select></Fl>
        <Fl label="Status"><select style={inp} value={f.status} onChange={e=>set("status",e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></Fl>
      </div>
      <Fl label="Fault Description"><textarea style={ta} value={f.issue} onChange={e=>set("issue",e.target.value)} placeholder="Describe the fault in detail..."/></Fl>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Fl label="Scheduled Date"><input type="date" style={inp} value={f.scheduledDate} onChange={e=>set("scheduledDate",e.target.value)}/></Fl>
        <Fl label="Scheduled Time"><input type="time" style={inp} value={f.scheduledTime} onChange={e=>set("scheduledTime",e.target.value)}/></Fl>
      </div>

      <div style={{background:C.primaryLight,border:`1px solid #BFDBFE`,borderRadius:9,padding:"12px 14px",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:700,color:C.primary}}>Engineer Assignment</span>
          <Btn onClick={tryAuto} sm>⚡ Auto-Assign Best Match</Btn>
        </div>
        {hint&&<div style={{fontSize:12,fontWeight:600,marginBottom:8,color:hint.type==="ok"?C.success:C.danger}}>{hint.type==="ok"?"✓":"✕"} {hint.msg}</div>}
        <select style={inp} value={f.engineerId||""} onChange={e=>{const v=e.target.value;set("engineerId",v||null);if(v&&!f.rate&&canEditRate){const en=engineers.find(x=>x.id===v);if(en)set("rate",en.rate);}}}>
          <option value="">— Unassigned —</option>
          {engineers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {canEditRate&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Fl label="Engineer Rate (£)"><input type="number" style={inp} value={f.rate} onChange={e=>set("rate",e.target.value)}/></Fl>
          <Fl label="Date Completed"><input type="date" style={inp} value={f.completedDate||""} onChange={e=>set("completedDate",e.target.value)}/></Fl>
        </div>
      )}
      <div style={{display:"flex",gap:18,marginBottom:12,flexWrap:"wrap"}}>
        {[["partsNeeded","Parts needed"],["partsOrdered","Parts ordered"],["partsArrived","Parts arrived"],...(canEditRate?[["paid","Engineer paid"]]:[])] .map(([k,l])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={!!f[k]} onChange={e=>set(k,e.target.checked)}/>{l}</label>
        ))}
      </div>
      <Fl label="Internal Notes"><textarea style={ta} value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="Admin notes (not visible to customer)..."/></Fl>
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <Btn onClick={()=>onSave(f)} full style={{padding:"10px 0"}}>Save Job</Btn>
        <Btn onClick={onCancel} variant="ghost" full style={{padding:"10px 0"}}>Cancel</Btn>
      </div>
    </div>
  );
}

// ─── JOB DETAIL ───────────────────────────────────────────────────────────────
// Staff/owner only now — engineers manage their own jobs in the Portal.
function JobDetail({job,onClose,onEdit,onReassign,engineers}) {
  const eng = engineers.find(e=>e.id===job.engineerId);
  return (
    <div>
      <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
        <Badge status={job.status}/><PBadge p={job.priority}/>
        {job.partsNeeded&&<span style={{background:C.warnLight,color:C.warn,padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:800}}>PARTS{job.partsOrdered?" · ORDERED":""}{job.partsArrived?" · ARRIVED":""}</span>}
      </div>

      {/* Appliance banner */}
      <div style={{background:C.primaryLight,border:`1px solid #BFDBFE`,borderRadius:9,padding:"10px 16px",marginBottom:14,display:"flex",gap:24,flexWrap:"wrap",alignItems:"center"}}>
        {[["Appliance",job.appliance],["Brand",job.brand||"Unknown"],["Age",job.applianceAge?`${job.applianceAge} yr${job.applianceAge!=1?"s":""}` :"Unknown"],["Source",job.source]].map(([l,v])=>(
          <div key={l}><div style={{fontSize:10,color:C.light,fontWeight:700,textTransform:"uppercase"}}>{l}</div><div style={{fontWeight:700,fontSize:14,color:C.text}}>{v}</div></div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div style={{background:"#1E2530",borderRadius:9,padding:12}}>
          <div style={{fontSize:10,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Customer</div>
          <div style={{fontWeight:700,fontSize:14}}>{job.customer}</div>
          <div style={{color:C.mid,fontSize:12,marginTop:2}}>📞 {job.phone}</div>
          <div style={{color:C.mid,fontSize:12}}>✉ {job.email}</div>
        </div>
        <div style={{background:"#1E2530",borderRadius:9,padding:12}}>
          <div style={{fontSize:10,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Engineer</div>
          {eng?<><div style={{fontWeight:700,fontSize:14}}>{eng.name}</div><div style={{color:C.mid,fontSize:12,marginTop:2}}>📞 {eng.phone}</div></>
              :<div style={{color:C.danger,fontStyle:"italic",fontSize:13}}>Not assigned</div>}
          <Btn onClick={onReassign} variant="ghost" sm style={{marginTop:8}}>⇄ Reassign Engineer</Btn>
        </div>
        <div style={{background:"#1E2530",borderRadius:9,padding:12}}>
          <div style={{fontSize:10,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Scheduled</div>
          <div style={{fontWeight:700}}>{fmt(job.scheduledDate)} at {job.scheduledTime}</div>
          {job.completedDate&&<div style={{color:C.success,fontSize:12,fontWeight:600,marginTop:4}}>✓ Completed {fmt(job.completedDate)}</div>}
        </div>
        <div style={{background:"#1E2530",borderRadius:9,padding:12}}>
          <div style={{fontSize:10,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Engineer Pay</div>
          <div style={{fontWeight:900,fontSize:18,color:job.paid?C.success:C.danger}}>{job.rate?`£${job.rate}`:"—"}<span style={{fontSize:10,marginLeft:6,fontWeight:700}}>{job.paid?"✓ PAID":"UNPAID"}</span></div>
        </div>
      </div>

      <div style={{background:"#1E2530",borderRadius:9,padding:12,marginBottom:12}}>
        <div style={{fontSize:10,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Address</div>
        <div style={{fontSize:13}}>{job.address}</div>
        <a href={`https://maps.google.com?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer" style={{fontSize:12,color:C.primary,marginTop:3,display:"inline-block"}}>Open in Maps →</a>
      </div>

      <div style={{background:"#1E2530",borderRadius:9,padding:12,marginBottom:12}}>
        <div style={{fontSize:10,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Fault Description</div>
        <div style={{fontSize:13}}>{job.issue}</div>
      </div>

      <div style={{background:"#1E2530",borderRadius:9,padding:12,marginBottom:12}}>
        <div style={{fontSize:10,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Customer Notifications</div>
        {[["📩","Booking Confirmation",job.notifBooking],["🔔","Day-Before Reminder",job.notifReminder],["🚗","Engineer On the Way",job.notifOnWay],["✅","Job Completed",job.notifComplete]].map(([ic,lb,sent])=>(
          <div key={lb} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
            <span>{ic}</span><div style={{flex:1,fontSize:13,fontWeight:600}}>{lb}</div>
            <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:9,background:sent?C.successLight:"#F1F5F9",color:sent?C.success:C.light}}>{sent?"SENT":"PENDING"}</span>
          </div>
        ))}
      </div>

      {job.notes&&<div style={{background:"rgba(251,191,36,0.08)",borderRadius:9,padding:12,marginBottom:12,border:"1px solid rgba(251,191,36,0.25)"}}><div style={{fontSize:10,color:"#fbbf24",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Notes</div><div style={{fontSize:13,color:"#F1F5F9",whiteSpace:"pre-wrap"}}>{job.notes}</div></div>}
      <Btn onClick={onEdit} variant="ghost" full style={{padding:"10px 0"}}>✏ Edit This Job</Btn>
    </div>
  );
}

// ─── REASSIGN MODAL ───────────────────────────────────────────────────────────
function ReassignModal({job,engineers,jobs,onReassign,onClose}) {
  const [chosen,setChosen] = useState(job.engineerId||"");
  const suggested = useMemo(()=>autoAssign(job,engineers,jobs),[]);
  return (
    <Modal title={`Reassign — Job #${job.id}: ${job.customer}`} onClose={onClose}>
      {suggested&&<div style={{background:C.successLight,border:`1px solid #A7F3D0`,borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,fontWeight:600,color:C.success}}>⚡ Auto-suggestion: <strong>{suggested.name}</strong> — best match for postcode, appliance &amp; brand</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {engineers.map(e=>{
          const pc=(job.postcode||"").toUpperCase(); const pcA=pc.replace(/[0-9\s]+$/,"");
          const covers=e.postcodes.some(p=>{const up=p.toUpperCase();return pc===up||pc.startsWith(up)||pcA===up;});
          const handles=e.applianceTypes.includes(job.appliance);
          const excl=(e.brandExclusions[job.appliance]||[]).includes(job.brand);
          const ok=covers&&handles&&!excl;
          const done=jobs.filter(j=>j.engineerId===e.id&&j.status==="Completed").length;
          const ber=jobs.filter(j=>j.engineerId===e.id&&j.status==="Beyond Repair").length;
          return (
            <div key={e.id} onClick={()=>setChosen(e.id)} style={{border:`2px solid ${chosen===e.id?C.primary:C.border}`,borderRadius:9,padding:"10px 12px",cursor:"pointer",background:chosen===e.id?C.primaryLight:"#1E2530"}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{e.name}</div>
              <div style={{fontSize:11,color:C.success}}>✅ {done} repaired</div>
              <div style={{fontSize:11,color:C.danger}}>🔴 {ber} BER</div>
              <div style={{fontSize:11,color:C.mid}}>Success: {pct(done,done+ber)}</div>
              {!ok&&<div style={{fontSize:10,color:C.warn,marginTop:4,fontWeight:700}}>⚠ Outside criteria</div>}
            </div>
          );
        })}
      </div>
      <Fl label="Or select manually">
        <select style={inp} value={chosen} onChange={e=>setChosen(e.target.value)}>
          <option value="">— Unassigned —</option>
          {engineers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Fl>
      <div style={{display:"flex",gap:10,marginTop:10}}>
        <Btn onClick={()=>onReassign(chosen||null)} full style={{padding:"10px 0"}}>Confirm Reassignment</Btn>
        <Btn onClick={onClose} variant="ghost" full style={{padding:"10px 0"}}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ─── ENGINEER PROFILE EDITOR (existing engineers only — see AddEngineerModal
// for creating new ones, which is where login provisioning happens) ──────────
const ENG_DAYS = [["mon","Mon"],["tue","Tue"],["wed","Wed"],["thu","Thu"],["fri","Fri"],["sat","Sat"],["sun","Sun"]];
const ENG_DOC_KINDS = [
  { key:"id", label:"Photo ID", pathField:"idDocumentPath", uploadedField:"idDocumentUploadedAt", column:"id_document_path", uploadedColumn:"id_document_uploaded_at" },
  { key:"insurance", label:"Public Liability Insurance", pathField:"insuranceDocumentPath", uploadedField:"insuranceDocumentUploadedAt", column:"insurance_document_path", uploadedColumn:"insurance_document_uploaded_at" },
];

function EngineerEditor({eng,onSave,onCancel,isOwner}) {
  const [e,setE] = useState({...eng,brandExclusions:{...APPLIANCE_TYPES.reduce((a,t)=>({...a,[t]:[]}),{}),workingHours:eng.workingHours||{},...eng.brandExclusions}});
  const [newPc,setNewPc] = useState("");
  const [uploading,setUploading] = useState(null);
  const [uploadErr,setUploadErr] = useState("");
  const setEng=(k,v)=>setE(p=>({...p,[k]:v}));
  const setDay=(day,patch)=>setEng("workingHours",{...e.workingHours,[day]:{...(e.workingHours[day]||{}),...patch}});
  const gaps = engineerProfileGaps(e);

  const uploadDoc = async (kind, file) => {
    if(!file) return;
    setUploadErr(""); setUploading(kind.key);
    const ext = file.name.split(".").pop()||"pdf";
    const path = `${eng.profileId}/${kind.key}-document.${ext}`;
    const { error: upErr } = await supabase.storage.from("engineer-documents").upload(path, file, {upsert:true});
    if(upErr){ setUploadErr(upErr.message); setUploading(null); return; }
    const nowIso = new Date().toISOString();
    // Written straight to the engineers row (not deferred to "Save All
    // Changes") so the file and its DB pointer never fall out of sync if
    // staff upload a document then cancel the rest of the form.
    const { error: dbErr } = await supabase.from("engineers").update({[kind.column]:path,[kind.uploadedColumn]:nowIso}).eq("id",eng.id);
    setUploading(null);
    if(dbErr){ setUploadErr(dbErr.message); return; }
    setEng(kind.pathField, path); setEng(kind.uploadedField, nowIso);
  };
  const addPc=()=>{const pc=newPc.trim().toUpperCase();if(pc&&!e.postcodes.includes(pc))setEng("postcodes",[...e.postcodes,pc]);setNewPc("");};
  const remPc=pc=>setEng("postcodes",e.postcodes.filter(x=>x!==pc));
  const toggleApp=a=>setEng("applianceTypes",e.applianceTypes.includes(a)?e.applianceTypes.filter(x=>x!==a):[...e.applianceTypes,a]);
  const toggleExcl=(app,brand)=>{const cur=e.brandExclusions[app]||[];setEng("brandExclusions",{...e.brandExclusions,[app]:cur.includes(brand)?cur.filter(b=>b!==brand):[...cur,brand]});};
  return (
    <div>
      <div style={{fontWeight:800,fontSize:13,color:C.mid,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:.5}}>Contact Details</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <Fl label="Full Name"><input style={inp} value={e.name} onChange={ev=>setEng("name",ev.target.value)}/></Fl>
        <Fl label="Phone"><input style={inp} value={e.phone} onChange={ev=>setEng("phone",ev.target.value)}/></Fl>
        <Fl label="Portal Login Email"><input style={inp} value={e.email} disabled/></Fl>
        {isOwner&&<Fl label="Pay Rate (£ per job)"><input type="number" style={inp} value={e.rate} onChange={ev=>setEng("rate",Number(ev.target.value))}/></Fl>}
      </div>
      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:18,fontSize:13}}>
        <input type="checkbox" checked={!!e.selfServiceEnabled} onChange={ev=>setEng("selfServiceEnabled",ev.target.checked)}/>
        Let this engineer edit their own Portal Settings (skills, coverage)
      </label>

      <div style={{fontWeight:800,fontSize:13,color:C.mid,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:.5}}>Postcode Areas Covered</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {e.postcodes.map(pc=>(
          <span key={pc} style={{background:C.primaryLight,color:C.primary,padding:"3px 9px",borderRadius:6,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
            {pc}
            <button onClick={()=>remPc(pc)} style={{background:"none",border:"none",cursor:"pointer",color:C.primary,fontSize:14,padding:0,lineHeight:1}}>×</button>
          </span>
        ))}
        {!e.postcodes.length&&<span style={{color:C.light,fontSize:12,fontStyle:"italic"}}>No areas added yet</span>}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <input style={{...inp,maxWidth:130}} value={newPc} onChange={ev=>setNewPc(ev.target.value)} placeholder="e.g. M1 or LS" onKeyDown={ev=>ev.key==="Enter"&&addPc()}/>
        <Btn onClick={addPc} sm>+ Add</Btn>
      </div>

      <div style={{fontWeight:800,fontSize:13,color:C.mid,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:.5}}>Appliance Types &amp; Brand Exclusions</div>
      <div style={{fontSize:11,color:C.light,marginBottom:12}}>Tick the appliance types this engineer handles. For each active type, click any brands they <strong>won't</strong> repair (highlighted in red).</div>
      {APPLIANCE_TYPES.map(app=>{
        const active=e.applianceTypes.includes(app);
        const excl=e.brandExclusions[app]||[];
        return (
          <div key={app} style={{marginBottom:10,background:active?"#141414":"#000000",borderRadius:9,padding:"10px 13px",border:`1.5px solid ${active?C.border:"transparent"}`}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:active?10:0}}>
              <input type="checkbox" checked={active} onChange={()=>toggleApp(app)}/>
              <span style={{fontWeight:700,fontSize:13,color:active?C.text:C.light}}>{app}</span>
              {active&&excl.length>0&&<span style={{fontSize:10,color:C.danger,fontWeight:700}}>({excl.length} brand{excl.length>1?"s":""} excluded)</span>}
            </label>
            {active&&(
              <div>
                <div style={{fontSize:10,color:C.light,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Won't repair — click to toggle:</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {(BRANDS[app]||[]).filter(b=>b!=="Other").map(b=>(
                    <button key={b} onClick={()=>toggleExcl(app,b)} style={{padding:"3px 9px",borderRadius:5,border:`1.5px solid ${excl.includes(b)?C.danger:C.border}`,background:excl.includes(b)?C.dangerLight:"#fff",color:excl.includes(b)?C.danger:C.mid,fontSize:11,fontWeight:excl.includes(b)?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                      {excl.includes(b)?"✕ ":""}{b}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div style={{fontWeight:800,fontSize:13,color:C.mid,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:.5,marginTop:20}}>Working Hours</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
        {ENG_DAYS.map(([key,label])=>{
          const d=e.workingHours[key]||{};
          return (
            <div key={key} style={{display:"flex",alignItems:"center",gap:10,fontSize:12,background:"#000",borderRadius:7,padding:"7px 10px"}}>
              <span style={{width:36,color:C.text,fontWeight:700}}>{label}</span>
              <label style={{display:"flex",alignItems:"center",gap:5,color:C.mid}}>
                <input type="checkbox" checked={!!d.off} onChange={ev=>setDay(key,{off:ev.target.checked})}/> Off
              </label>
              {!d.off&&(
                <>
                  <input type="time" style={{...inp,width:110,padding:"5px 8px"}} value={d.start||"09:00"} onChange={ev=>setDay(key,{start:ev.target.value})}/>
                  <span style={{color:C.mid}}>to</span>
                  <input type="time" style={{...inp,width:110,padding:"5px 8px"}} value={d.end||"17:00"} onChange={ev=>setDay(key,{end:ev.target.value})}/>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={{fontWeight:800,fontSize:13,color:C.mid,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:.5}}>Documents</div>
      {uploadErr&&<div style={{background:"rgba(248,113,113,0.15)",color:"#f87171",borderRadius:7,padding:"8px 12px",fontSize:13,marginBottom:10,fontWeight:600}}>{uploadErr}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
        {ENG_DOC_KINDS.map(kind=>{
          const uploadedAt = e[kind.uploadedField];
          return (
            <div key={kind.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#000",borderRadius:7,padding:"8px 12px",fontSize:12}}>
              <div>
                <span style={{color:C.text,fontWeight:600}}>{kind.label}</span>
                {uploadedAt&&<span style={{marginLeft:8,color:C.light}}>Uploaded {new Date(uploadedAt).toLocaleDateString("en-GB")}</span>}
              </div>
              <label style={{fontSize:11,fontWeight:700,borderRadius:6,padding:"5px 10px",cursor:"pointer",background:uploadedAt?"#1a1a1a":C.primary,color:uploadedAt?C.text:"#000",opacity:uploading===kind.key?0.7:1}}>
                {uploading===kind.key?"Uploading…":uploadedAt?"Replace":"Upload"}
                <input type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={ev=>uploadDoc(kind,ev.target.files?.[0])}/>
              </label>
            </div>
          );
        })}
      </div>
      <Fl label="Insurance Expiry Date"><input type="date" style={inp} value={e.insuranceExpiryDate||""} onChange={ev=>setEng("insuranceExpiryDate",ev.target.value)}/></Fl>

      {gaps.length>0&&(
        <div style={{background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:9,padding:"10px 13px",marginTop:16,marginBottom:6,fontSize:12,color:"#d97706"}}>
          <strong>Profile incomplete:</strong> {gaps.join(", ")}. The engineer sees a reminder for these in the Portal until either of you fills them in.
        </div>
      )}

      <div style={{display:"flex",gap:10,marginTop:14}}>
        <Btn onClick={()=>onSave(e)} full style={{padding:"10px 0"}}>Save All Changes</Btn>
        <Btn onClick={onCancel} variant="ghost" full style={{padding:"10px 0"}}>Cancel</Btn>
      </div>
    </div>
  );
}

// supabase.functions.invoke() resolves `error` as a generic FunctionsHttpError whose
// .message is always the same unhelpful "Edge Function returned a non-2xx status code" —
// the actual reason our create-user function gave (e.g. "A user with this email address
// has already been registered") is only available by reading the raw Response it attaches
// as `.context`. Without this, every failure looked identical and gave no clue why.
async function edgeFnErrorMessage(error, fallback){
  if(!error) return null;
  if(error.context && typeof error.context.json==="function"){
    try{
      const body = await error.context.json();
      if(body?.error) return body.error;
    }catch{}
  }
  return error.message || fallback;
}

// ─── ADD ENGINEER MODAL — creates the auth login + engineers row via the
// create-user Edge Function. This is the only place a new engineer account
// gets created, and it's also where staff choose how that engineer gets
// into the Portal for the first time. ─────────────────────────────────────
function AddEngineerModal({onCreated,onCancel}) {
  const [f,setF] = useState({name:"",email:"",phone:"",rate:45,provisioning:"invite",password:""});
  const [busy,setBusy] = useState(false);
  const [err,setErr] = useState("");
  const set=(k,v)=>setF(p=>({...p,[k]:v}));

  const submit = async () => {
    setErr("");
    if(!f.name||!f.email){setErr("Name and email are required.");return;}
    if(f.provisioning==="password"&&f.password.length<8){setErr("Password must be at least 8 characters.");return;}
    setBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        name:f.name, email:f.email, phone:f.phone, role:"engineer",
        provisioning:f.provisioning, password:f.provisioning==="password"?f.password:undefined,
        engineer:{ payRate:Number(f.rate)||45, postcodes:[], applianceTypes:[], brandExclusions:{}, selfServiceEnabled:false },
      },
      headers:{ Authorization:`Bearer ${sess?.session?.access_token}` },
    });
    setBusy(false);
    if(error||data?.error){ setErr(data?.error || await edgeFnErrorMessage(error,"Something went wrong creating this engineer.")); return; }
    onCreated(data);
  };

  return (
    <Modal title="Add Engineer" onClose={onCancel}>
      {err&&<div style={{background:"rgba(248,113,113,0.15)",color:"#f87171",borderRadius:7,padding:"8px 12px",fontSize:13,marginBottom:12,fontWeight:600}}>{err}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Fl label="Full Name"><input style={inp} value={f.name} onChange={e=>set("name",e.target.value)}/></Fl>
        <Fl label="Phone"><input style={inp} value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="07..."/></Fl>
        <Fl label="Email"><input style={inp} value={f.email} onChange={e=>set("email",e.target.value)} placeholder="engineer@easyrepair.co.uk"/></Fl>
        <Fl label="Pay Rate (£ per job)"><input type="number" style={inp} value={f.rate} onChange={e=>set("rate",e.target.value)}/></Fl>
      </div>
      <div style={{background:C.primaryLight,border:`1px solid #BFDBFE`,borderRadius:9,padding:"12px 14px",marginTop:6,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:C.primary,marginBottom:9}}>Portal Access</div>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,marginBottom:8,cursor:"pointer"}}>
          <input type="radio" checked={f.provisioning==="invite"} onChange={()=>set("provisioning","invite")}/>
          Email them an invite link to set their own password (recommended)
        </label>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
          <input type="radio" checked={f.provisioning==="password"} onChange={()=>set("provisioning","password")}/>
          Set a temporary password myself
        </label>
        {f.provisioning==="password"&&(
          <div style={{marginTop:10}}>
            <input style={inp} type="text" value={f.password} onChange={e=>set("password",e.target.value)} placeholder="Temporary password (min 8 characters)"/>
            <div style={{fontSize:11,color:C.light,marginTop:5}}>Share this password with the engineer directly — they can change it once logged in to portal.easyrepair.co.uk.</div>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:10}}>
        <Btn onClick={submit} full style={{padding:"10px 0",opacity:busy?.7:1}}>{busy?"Creating…":"Create Engineer"}</Btn>
        <Btn onClick={onCancel} variant="ghost" full style={{padding:"10px 0"}}>Cancel</Btn>
      </div>
    </Modal>
  );
}

// ─── USER MANAGER ─────────────────────────────────────────────────────────────
// Owner/staff accounts only now — engineers are created from the Engineers
// page (AddEngineerModal above), since that's also where their portal
// access gets provisioned. Account creation here goes through the same
// create-user Edge Function so these are real logins too.
function UserManager({users,onUserCreated}) {
  const [editing,setEditing]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [newU,setNewU]=useState({name:"",email:"",phone:"",role:"staff",provisioning:"invite",password:""});
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const setN=(k,v)=>setNewU(p=>({...p,[k]:v}));

  const addUser=async ()=>{
    setErr("");
    if(!newU.name||!newU.email){setErr("Name and email are required.");return;}
    if(newU.provisioning==="password"&&newU.password.length<8){setErr("Password must be at least 8 characters.");return;}
    setBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("create-user", {
      body:{ name:newU.name, email:newU.email, phone:newU.phone, role:newU.role,
             provisioning:newU.provisioning, password:newU.provisioning==="password"?newU.password:undefined },
      headers:{ Authorization:`Bearer ${sess?.session?.access_token}` },
    });
    setBusy(false);
    if(error||data?.error){ setErr(data?.error || await edgeFnErrorMessage(error,"Something went wrong creating this user.")); return; }
    onUserCreated();
    setNewU({name:"",email:"",phone:"",role:"staff",provisioning:"invite",password:""});setShowAdd(false);
  };

  const saveEdit=async (updated)=>{
    await supabase.from("profiles").update({name:updated.name,phone:updated.phone,role:updated.role}).eq("id",updated.id);
    onUserCreated();
    setEditing(null);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:900,color:C.text}}>User Accounts</h2>
        <Btn onClick={()=>{setErr("");setShowAdd(true);}}>+ Add User</Btn>
      </div>
      <div style={{background:C.card,borderRadius:13,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
        {users.map((u,i)=>(
          <div key={u.id} style={{padding:"12px 18px",borderBottom:i<users.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12}}>
            <Av initials={(u.name||u.email).split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)} color={ROLE_C[u.role].color}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13}}>{u.name}</div>
              <div style={{color:C.light,fontSize:11}}>{u.email}</div>
            </div>
            <RolePill role={u.role}/>
            <Btn onClick={()=>setEditing({...u})} variant="ghost" sm>Edit</Btn>
          </div>
        ))}
        {users.length===0&&<div style={{padding:22,textAlign:"center",color:C.light,fontSize:13}}>No staff/owner accounts yet.</div>}
      </div>

      {editing&&(
        <Modal title={`Edit User: ${editing.name}`} onClose={()=>setEditing(null)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <Fl label="Full Name"><input style={inp} value={editing.name} onChange={e=>setEditing(p=>({...p,name:e.target.value}))}/></Fl>
            <Fl label="Role"><select style={inp} value={editing.role} onChange={e=>setEditing(p=>({...p,role:e.target.value}))}><option value="owner">Owner</option><option value="staff">Staff</option></select></Fl>
            <Fl label="Phone"><input style={inp} value={editing.phone} onChange={e=>setEditing(p=>({...p,phone:e.target.value}))}/></Fl>
            <Fl label="Email (login)"><input style={inp} value={editing.email} disabled/></Fl>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={()=>saveEdit(editing)} full style={{padding:"10px 0"}}>Save Changes</Btn>
            <Btn onClick={()=>setEditing(null)} variant="ghost" full style={{padding:"10px 0"}}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {showAdd&&(
        <Modal title="Add New User" onClose={()=>setShowAdd(false)}>
          {err&&<div style={{background:"rgba(248,113,113,0.15)",color:"#f87171",borderRadius:7,padding:"8px 12px",fontSize:13,marginBottom:12,fontWeight:600}}>{err}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fl label="Full Name"><input style={inp} value={newU.name} onChange={e=>setN("name",e.target.value)}/></Fl>
            <Fl label="Role"><select style={inp} value={newU.role} onChange={e=>setN("role",e.target.value)}><option value="staff">Staff</option><option value="owner">Owner</option></select></Fl>
            <Fl label="Email"><input style={inp} value={newU.email} onChange={e=>setN("email",e.target.value)}/></Fl>
            <Fl label="Phone"><input style={inp} value={newU.phone} onChange={e=>setN("phone",e.target.value)} placeholder="07..."/></Fl>
          </div>
          <div style={{background:C.primaryLight,border:`1px solid #BFDBFE`,borderRadius:9,padding:"12px 14px",marginTop:6,marginBottom:6}}>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,marginBottom:8,cursor:"pointer"}}>
              <input type="radio" checked={newU.provisioning==="invite"} onChange={()=>setN("provisioning","invite")}/>
              Email an invite link to set their own password (recommended)
            </label>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
              <input type="radio" checked={newU.provisioning==="password"} onChange={()=>setN("provisioning","password")}/>
              Set a temporary password myself
            </label>
            {newU.provisioning==="password"&&<input style={{...inp,marginTop:10}} value={newU.password} onChange={e=>setN("password",e.target.value)} placeholder="Temporary password (min 8 characters)"/>}
          </div>
          <div style={{display:"flex",gap:10,marginTop:10}}>
            <Btn onClick={addUser} full style={{padding:"10px 0",opacity:busy?.7:1}}>{busy?"Creating…":"Create User"}</Btn>
            <Btn onClick={()=>setShowAdd(false)} variant="ghost" full style={{padding:"10px 0"}}>Cancel</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
// Maps a Supabase `engineers` row (joined with its `profiles` row) to the
// flat shape the rest of this file already expects, so JobForm/ReassignModal/
// EngineerEditor etc. didn't need to change.
function mapEngineerRow(row){
  return {
    id: row.id, profileId: row.profile_id,
    name: row.profile?.name||"", phone: row.profile?.phone||"", email: row.profile?.email||"",
    rate: row.pay_rate, postcodes: row.postcodes||[], applianceTypes: row.appliance_types||[],
    brandExclusions: row.brand_exclusions||{}, selfServiceEnabled: row.self_service_enabled,
    stats: { repairs: row.stats_completed, beyondRepair: row.stats_ber },
    workingHours: row.working_hours||{},
    idDocumentPath: row.id_document_path||null, idDocumentUploadedAt: row.id_document_uploaded_at||null,
    insuranceDocumentPath: row.insurance_document_path||null, insuranceDocumentUploadedAt: row.insurance_document_uploaded_at||null,
    insuranceExpiryDate: row.insurance_expiry_date||null,
  };
}

// Same completion check Portal uses for its dashboard nudge — kept in sync
// here so staff can see at a glance what's still missing for an engineer,
// since either side filling these in clears the nudge for both.
function engineerProfileGaps(eng){
  const gaps=[];
  if(!eng.postcodes?.length) gaps.push("Coverage postcodes");
  if(!eng.applianceTypes?.length) gaps.push("Skills / appliance types");
  if(!eng.workingHours||Object.keys(eng.workingHours).length===0) gaps.push("Working hours");
  if(!eng.idDocumentPath) gaps.push("ID document");
  if(!eng.insuranceDocumentPath) gaps.push("Public Liability Insurance document");
  return gaps;
}

export default function App() {
  const [currentUser,setCU]       = useState(null);
  const [authChecked,setAuthChecked] = useState(false);
  const [jobs,setJobs]            = useState(SEED_JOBS);
  const [users,setUsers]          = useState([]);
  const [engineers,setEngineers]  = useState([]);
  const [view,setView]            = useState("dashboard");
  const [selJob,setSelJob]        = useState(null);
  const [editJob,setEditJob]      = useState(null);
  const [showNew,setShowNew]      = useState(false);
  const [reassign,setReassign]    = useState(null);
  const [editEng,setEditEng]      = useState(null);
  const [showAddEng,setShowAddEng]= useState(false);
  const [fsStatus,setFsStatus]    = useState("All");
  const [fsEng,setFsEng]          = useState("All");
  const [fsSearch,setFsSearch]    = useState("");

  const isOwner = currentUser?.role==="owner";
  const accent  = {owner:C.purple,staff:C.primary}[currentUser?.role]||C.primary;

  const loadEngineers = async () => {
    const { data, error } = await supabase.from("engineers").select("*, profile:profiles(name,phone,email)").order("created_at");
    if(!error) setEngineers((data||[]).map(mapEngineerRow));
  };
  const loadStaffUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*").in("role",["owner","staff"]).order("created_at");
    if(!error) setUsers(data||[]);
  };

  // Restore session on load, and react to sign-in/out (e.g. after Login calls signInWithPassword).
  useEffect(()=>{
    (async ()=>{
      // If this page load is an invite/recovery link, establish the session from its
      // tokens ourselves now that supabase-js's own auto-detection is off (AUTH_HASH above).
      if(AUTH_HASH?.accessToken && AUTH_HASH?.refreshToken){
        await supabase.auth.setSession({ access_token: AUTH_HASH.accessToken, refresh_token: AUTH_HASH.refreshToken });
      }
      const { data } = await supabase.auth.getSession();
      if(data?.session?.user){
        const { data: profile } = await supabase.from("profiles").select("*").eq("id",data.session.user.id).single();
        if(profile && profile.role!=="engineer") setCU(profile);
        else if(profile?.role==="engineer") await supabase.auth.signOut();
      }
      setAuthChecked(true);
    })();
  },[]);

  useEffect(()=>{ if(currentUser){ loadEngineers(); loadStaffUsers(); } },[currentUser]);

  const filtJobs = jobs.filter(j=>{
    if(fsStatus!=="All"&&j.status!==fsStatus)return false;
    if(fsEng!=="All"&&j.engineerId!==fsEng)return false;
    if(fsSearch&&![j.customer,j.address,String(j.id),j.appliance,j.brand||"",j.postcode||""].some(s=>s.toLowerCase().includes(fsSearch.toLowerCase())))return false;
    return true;
  });

  const todayJobs  = jobs.filter(j=>j.scheduledDate===TODAY);
  const unassigned = jobs.filter(j=>!j.engineerId&&!["Cancelled","Completed","Beyond Repair"].includes(j.status));
  const unpaidDone = jobs.filter(j=>j.status==="Completed"&&!j.paid);
  const unpaidAmt  = unpaidDone.reduce((s,j)=>s+Number(j.rate||0),0);

  // Engineers no longer log into FixFlow to update their own jobs (that's
  // the Portal's job now) — staff/owner update status via "Edit This Job",
  // so that's also where we keep each engineer's repaired/BER stats in
  // sync (used by auto-assign's success-rate scoring, and shown in the
  // Portal via the `engineers` table).
  const saveJob=(form)=>{
    if(editJob){
      setJobs(js=>js.map(j=>j.id===editJob.id?{...j,...form,rate:isOwner?form.rate:j.rate}:j));
      const justFinished = ["Completed","Beyond Repair"].includes(form.status) && form.status!==editJob.status && form.engineerId;
      if(justFinished){
        const delta = { completed: form.status==="Completed"?1:0, ber: form.status==="Beyond Repair"?1:0 };
        const current = engineers.find(e=>e.id===form.engineerId);
        if(current){
          const stats = { repairs: current.stats.repairs+delta.completed, beyondRepair: current.stats.beyondRepair+delta.ber };
          setEngineers(es=>es.map(e=>e.id!==form.engineerId?e:{...e,stats}));
          supabase.from("engineers").update({stats_completed:stats.repairs,stats_ber:stats.beyondRepair}).eq("id",current.id);
        }
      }
    }
    else{setJobs(js=>[...js,{...form,id:_nextJobId++,notifBooking:true,notifReminder:false,notifOnWay:false,notifComplete:false}]);}
    setEditJob(null);setShowNew(false);setSelJob(null);
  };

  const doReassign=(engId)=>{
    const eng=engineers.find(e=>e.id===engId);
    setJobs(js=>js.map(j=>j.id!==reassign.id?j:{...j,engineerId:engId||null,status:engId?"Assigned":"Booked",rate:eng?eng.rate:j.rate}));
    setReassign(null);setSelJob(null);
  };

  const saveEng=async (engData)=>{
    await supabase.from("profiles").update({name:engData.name,phone:engData.phone}).eq("id",engData.profileId);
    await supabase.from("engineers").update({
      pay_rate:engData.rate, postcodes:engData.postcodes, appliance_types:engData.applianceTypes,
      brand_exclusions:engData.brandExclusions, self_service_enabled:engData.selfServiceEnabled,
      working_hours:engData.workingHours, insurance_expiry_date:engData.insuranceExpiryDate||null,
    }).eq("id",engData.id);
    await loadEngineers();
    setEditEng(null);
  };

  const NAV = [{id:"dashboard",label:"Dashboard",ic:"⊞"},{id:"jobs",label:"All Bookings",ic:"📋"},{id:"engineers",label:"Engineers",ic:"🔧"},{id:"payments",label:"Payments",ic:"£"},...(isOwner?[{id:"users",label:"Users",ic:"👤"}]:[])];

  // Clears the forced-password-change flag once they've set their own —
  // covers both provisioning paths (they typed the temp password directly,
  // or clicked the emailed link) since this runs after either one lands
  // them here with a real session.
  const onPasswordChanged = async () => {
    if(currentUser) await supabase.from("profiles").update({must_change_password:false}).eq("id",currentUser.id);
    window.location.reload();
  };

  if(!authChecked) return null;
  if(["invite","recovery"].includes(inviteOrRecoveryType())) return <SetPasswordScreen onDone={()=>window.location.reload()}/>;
  if(!currentUser) return <Login onLogin={u=>{setCU(u);setView("dashboard");}}/>;
  if(currentUser.must_change_password) return <SetPasswordScreen onDone={onPasswordChanged}/>;

  return (
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:"#000000",minHeight:"100vh",display:"flex"}}>
      {/* Sidebar -- desktop/tablet only; "display:flex" lives in the className
          (not inline) so the "hidden" half of "hidden md:flex" can actually
          take effect below md. On phones the MobileTabBar further down takes
          over instead. */}
      <div className="hidden md:flex" style={{width:208,background:C.sidebar,flexDirection:"column",height:"100vh",position:"sticky",top:0,flexShrink:0}}>
        <div style={{padding:"18px 15px 14px",display:"flex",alignItems:"center",borderBottom:"1px solid #141414"}}>
          <img src="/logo.png" alt="Easy Repair" style={{height:22,display:"block"}}/>
        </div>
        <nav style={{flex:1,padding:"6px 10px"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{width:"100%",textAlign:"left",background:view===n.id?"rgba(212,255,60,0.08)":"none",color:view===n.id?"#d4ff3c":"#475569",border:"none",borderLeft:`3px solid ${view===n.id?"#d4ff3c":"transparent"}`,borderRadius:"0 7px 7px 0",padding:"9px 11px",cursor:"pointer",fontSize:13,fontWeight:view===n.id?700:500,display:"flex",alignItems:"center",gap:9,marginBottom:1,fontFamily:"inherit"}}>
              <span>{n.ic}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"12px 13px",borderTop:"1px solid #1F2937",display:"flex",alignItems:"center",gap:9}}>
          <Av initials={(currentUser.avatar||currentUser.name||"").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)} size={30} color={accent}/>
          <div style={{flex:1,overflow:"hidden"}}><div style={{color:"#E5E7EB",fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{currentUser.name}</div><RolePill role={currentUser.role}/></div>
          <button onClick={()=>{setCU(null);setView("dashboard");}} style={{background:"none",border:"none",color:"#6B7280",cursor:"pointer",fontSize:17,padding:0}} title="Sign out">⏻</button>
        </div>
      </div>

      {/* Mobile bottom tab bar -- same NAV array as the sidebar above, so the
          two layouts can never list different destinations. "md:hidden"
          keeps this off desktop/tablet where the sidebar handles navigation. */}
      <nav className="md:hidden" style={{position:"fixed",bottom:0,left:0,right:0,display:"flex",background:C.sidebar,borderTop:"1px solid #262626",zIndex:50,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setView(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"7px 2px",background:"none",border:"none",color:view===n.id?"#d4ff3c":"#475569",cursor:"pointer",fontFamily:"inherit"}}>
            <span style={{fontSize:17,lineHeight:1}}>{n.ic}</span>
            <span style={{fontSize:10,fontWeight:600,lineHeight:1}}>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Content -- paddingBottom deliberately left out of the inline style
          (unlike top/left/right) so the "pb-[..]" classes below can actually
          control it per breakpoint; an inline padding shorthand would win
          over any Tailwind class regardless of breakpoint. Mobile gets extra
          clearance so content doesn't sit behind the fixed bottom tab bar. */}
      <div className="pb-[88px] md:pb-[22px]" style={{flex:1,overflowY:"auto",paddingTop:22,paddingLeft:24,paddingRight:24}}>
        <div style={{maxWidth:1080}}>

          {/* ── DASHBOARD ── */}
          {view==="dashboard"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <div><h1 style={{margin:0,fontSize:20,fontWeight:900,color:C.text}}>Dashboard</h1><div style={{color:C.light,fontSize:12,marginTop:1}}>Saturday 6 June 2026</div></div>
                <Btn onClick={()=>{setEditJob(null);setShowNew(true);}}>+ New Booking</Btn>
              </div>
              <div style={{display:"flex",gap:12,marginBottom:18,flexWrap:"wrap"}}>
                <StatCard label="Today's Bookings" value={todayJobs.length} color={C.primary} sub={`${todayJobs.filter(j=>j.status==="Completed").length} done`}/>
                <StatCard label="Unassigned" value={unassigned.length} color={C.warn} sub="Need engineer"/>
                <StatCard label="Active Bookings" value={jobs.filter(j=>!["Cancelled","Completed","Beyond Repair"].includes(j.status)).length} color={C.purple}/>
                {isOwner&&<StatCard label="Outstanding Pay" value={`£${unpaidAmt}`} color={C.danger} sub={`${unpaidDone.length} unpaid`}/>}
              </div>
              <div style={{background:C.card,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.05)",overflow:"hidden",marginBottom:14}}>
                <div style={{padding:"11px 17px",borderBottom:`1px solid ${C.border}`,fontWeight:800,color:C.text,fontSize:13}}>Today's Schedule</div>
                {todayJobs.length===0?<div style={{padding:22,textAlign:"center",color:C.light,fontSize:13}}>No jobs scheduled today</div>:todayJobs.map(j=>{
                  const eng=engineers.find(e=>e.id===j.engineerId);
                  return <div key={j.id} onClick={()=>setSelJob(j)} style={{padding:"10px 17px",borderBottom:`1px solid #262626`,cursor:"pointer",display:"flex",alignItems:"center",gap:12}} onMouseOver={e=>e.currentTarget.style.background="#1E2530"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{fontWeight:800,color:C.primary,fontSize:12,minWidth:42}}>{j.scheduledTime}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13}}>{j.customer} <span style={{color:C.light,fontWeight:400}}>· {j.appliance} · {j.brand||"?"}{j.applianceAge?` · ${j.applianceAge}yr`:""}</span></div>
                      <div style={{color:C.mid,fontSize:11}}>{j.address}</div>
                    </div>
                    <div style={{fontSize:11,color:C.mid}}>{eng?.name||<span style={{color:C.danger,fontWeight:700}}>Unassigned</span>}</div>
                    <Badge status={j.status}/><PBadge p={j.priority}/>
                  </div>;
                })}
              </div>
              {unassigned.length>0&&(
                <div style={{background:C.warnLight,border:`1px solid #FDE68A`,borderRadius:11,padding:"12px 16px"}}>
                  <div style={{fontWeight:700,color:"#fbbf24",marginBottom:9,fontSize:12}}>⚠ {unassigned.length} job{unassigned.length>1?"s":""} awaiting engineer assignment</div>
                  {unassigned.map(j=>(
                    <div key={j.id} onClick={()=>setSelJob(j)} style={{background:"#141414",borderRadius:7,padding:"8px 12px",marginBottom:6,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:13}}><strong>{j.customer}</strong> · {j.appliance} · {j.brand||"?"} · {fmt(j.scheduledDate)}</span><PBadge p={j.priority}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ALL BOOKINGS ── */}
          {view==="jobs"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:15}}>
                <h1 style={{margin:0,fontSize:19,fontWeight:900,color:C.text}}>All Bookings</h1>
                <Btn onClick={()=>{setEditJob(null);setShowNew(true);}}>+ New Booking</Btn>
              </div>
              <div style={{display:"flex",gap:9,marginBottom:12,flexWrap:"wrap"}}>
                <input style={{...inp,maxWidth:210}} placeholder="Name / address / brand / #ID" value={fsSearch} onChange={e=>setFsSearch(e.target.value)}/>
                <select style={{...inp,maxWidth:155}} value={fsStatus} onChange={e=>setFsStatus(e.target.value)}><option value="All">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
                <select style={{...inp,maxWidth:165}} value={fsEng} onChange={e=>setFsEng(e.target.value)}><option value="All">All Engineers</option>{engineers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select>
              </div>
              <div style={{background:C.card,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.05)",overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:860}}>
                  <thead><tr style={{background:"#161B22"}}>
                    {["#","Customer","Appliance","Brand","Age","Scheduled","Engineer","Status","Pay"].map(h=>(
                      <th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:10,fontWeight:700,color:C.light,textTransform:"uppercase",letterSpacing:.5,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filtJobs.length===0?<tr><td colSpan={9} style={{padding:28,textAlign:"center",color:C.light}}>No bookings found</td></tr>:filtJobs.map(j=>{
                      const eng=engineers.find(e=>e.id===j.engineerId);
                      return <tr key={j.id} onClick={()=>setSelJob(j)} style={{cursor:"pointer",borderBottom:`1px solid #262626`}} onMouseOver={e=>e.currentTarget.style.background="#1E2530"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{padding:"9px 13px",fontSize:12,color:C.primary,fontWeight:800}}>#{j.id}</td>
                        <td style={{padding:"9px 13px"}}><div style={{fontWeight:700,fontSize:13}}>{j.customer}</div><div style={{color:C.light,fontSize:10}}>{j.source}</div></td>
                        <td style={{padding:"9px 13px",fontSize:12}}>{j.appliance}</td>
                        <td style={{padding:"9px 13px",fontSize:12,fontWeight:600}}>{j.brand||<span style={{color:C.light}}>—</span>}</td>
                        <td style={{padding:"9px 13px",fontSize:12}}>{j.applianceAge?`${j.applianceAge}yr`:<span style={{color:C.light}}>—</span>}</td>
                        <td style={{padding:"9px 13px",fontSize:11}}>{fmt(j.scheduledDate)}<br/><span style={{color:C.light}}>{j.scheduledTime}</span></td>
                        <td style={{padding:"9px 13px",fontSize:12,color:eng?C.text:C.danger,fontWeight:eng?400:700}}>{eng?.name||"Unassigned"}</td>
                        <td style={{padding:"9px 13px"}}><Badge status={j.status}/></td>
                        <td style={{padding:"9px 13px",fontSize:12,fontWeight:800,color:j.paid?C.success:j.rate?C.danger:C.light}}>{j.rate?`£${j.rate}`:"—"}{j.paid?" ✓":""}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ENGINEERS ── */}
          {view==="engineers"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h1 style={{margin:0,fontSize:19,fontWeight:900,color:C.text}}>Engineers</h1>
                <Btn onClick={()=>setShowAddEng(true)}>+ Add Engineer</Btn>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:14}}>
                {engineers.length===0&&<div style={{color:C.light,fontSize:13}}>No engineers yet — add one to get started.</div>}
                {engineers.map(eng=>{
                  const eJobs=jobs.filter(j=>j.engineerId===eng.id);
                  const done=eJobs.filter(j=>j.status==="Completed").length;
                  const ber=eJobs.filter(j=>j.status==="Beyond Repair").length;
                  const total=done+ber;
                  const sr=total?Math.round(done/total*100):null;
                  const active=eJobs.filter(j=>!["Completed","Beyond Repair","Cancelled"].includes(j.status)).length;
                  const owed=eJobs.filter(j=>j.status==="Completed"&&!j.paid).reduce((s,j)=>s+Number(j.rate||0),0);
                  return (
                    <div key={eng.id} style={{background:C.card,borderRadius:13,boxShadow:"0 1px 3px rgba(0,0,0,.05)",overflow:"hidden"}}>
                      <div style={{padding:"13px 15px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"center"}}>
                        <Av initials={eng.name.split(" ").map(w=>w[0]).join("")} color={accent}/>
                        <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14}}>{eng.name}</div><div style={{color:C.light,fontSize:11}}>{eng.phone} · {eng.email}</div></div>
                        {isOwner&&<span style={{fontWeight:800,color:accent,fontSize:13}}>£{eng.rate}/job</span>}
                        <Btn onClick={()=>setEditEng(eng)} variant="ghost" sm>Edit</Btn>
                      </div>

                      {/* Stats row */}
                      <div style={{padding:"10px 15px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,borderBottom:`1px solid ${C.border}`,background:"#161B22"}}>
                        {[["Active",active,C.primary],["Repaired",done,C.success],["BER",ber,C.danger],["Success",sr!==null?`${sr}%`:"—",sr>=80?C.success:sr>=60?C.warn:sr!==null?C.danger:C.light]].map(([l,v,col])=>(
                          <div key={l} style={{textAlign:"center"}}><div style={{fontWeight:900,fontSize:17,color:col}}>{v}</div><div style={{fontSize:9,color:C.light,textTransform:"uppercase",letterSpacing:.3}}>{l}</div></div>
                        ))}
                      </div>

                      {/* Coverage */}
                      <div style={{padding:"9px 15px",borderBottom:`1px solid ${C.border}`}}>
                        <div style={{fontSize:9,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:5,letterSpacing:.4}}>Postcode Areas</div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {eng.postcodes.length?eng.postcodes.map(pc=><span key={pc} style={{background:C.primaryLight,color:C.primary,fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4}}>{pc}</span>):<span style={{color:C.light,fontSize:11,fontStyle:"italic"}}>None set</span>}
                        </div>
                      </div>
                      <div style={{padding:"9px 15px",borderBottom:`1px solid ${C.border}`}}>
                        <div style={{fontSize:9,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:5,letterSpacing:.4}}>Appliances Covered</div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {eng.applianceTypes.length?eng.applianceTypes.map(a=><span key={a} style={{background:C.successLight,color:C.success,fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4}}>{a}</span>):<span style={{color:C.light,fontSize:11,fontStyle:"italic"}}>None set</span>}
                        </div>
                      </div>

                      {isOwner&&owed>0&&<div style={{padding:"7px 15px",background:"rgba(248,113,113,0.12)",fontSize:12,color:"#f87171",fontWeight:700}}>£{owed} owed in unpaid jobs</div>}

                      {/* Recent jobs */}
                      <div style={{padding:"8px 15px"}}>
                        {eJobs.filter(j=>!["Completed","Beyond Repair","Cancelled"].includes(j.status)).slice(0,2).map(j=>(
                          <div key={j.id} onClick={()=>setSelJob(j)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,padding:"4px 0",cursor:"pointer",color:C.mid}} onMouseOver={e=>e.currentTarget.style.color=C.primary} onMouseOut={e=>e.currentTarget.style.color=C.mid}>
                            <span><strong style={{color:C.text}}>{j.customer}</strong> · {j.appliance}{j.brand?` · ${j.brand}`:""}</span><Badge status={j.status}/>
                          </div>
                        ))}
                        {!eJobs.filter(j=>!["Completed","Beyond Repair","Cancelled"].includes(j.status)).length&&<div style={{fontSize:11,color:C.light,fontStyle:"italic"}}>No active jobs</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {view==="payments"&&(
            <div>
              <h1 style={{margin:"0 0 16px",fontSize:19,fontWeight:900,color:C.text}}>Payments</h1>
              {engineers.map(eng=>{
                const done=jobs.filter(j=>j.engineerId===eng.id&&j.status==="Completed");
                const ber=jobs.filter(j=>j.engineerId===eng.id&&j.status==="Beyond Repair");
                const unpaid=done.filter(j=>!j.paid);
                const paid=done.filter(j=>j.paid);
                return (
                  <div key={eng.id} style={{background:C.card,borderRadius:13,boxShadow:"0 1px 3px rgba(0,0,0,.05)",marginBottom:16,overflow:"hidden"}}>
                    <div style={{padding:"13px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:"#161B22"}}>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <Av initials={eng.name.split(" ").map(w=>w[0]).join("")} color={accent}/>
                        <div><div style={{fontWeight:800,fontSize:14}}>{eng.name}</div><div style={{color:C.light,fontSize:11}}>{done.length} completed · {ber.length} BER</div></div>
                      </div>
                      <div style={{textAlign:"right"}}><div style={{color:C.danger,fontWeight:900,fontSize:16}}>£{unpaid.reduce((s,j)=>s+Number(j.rate||0),0)} owed</div><div style={{color:C.success,fontSize:11,fontWeight:600}}>£{paid.reduce((s,j)=>s+Number(j.rate||0),0)} paid total</div></div>
                    </div>
                    {unpaid.length===0?<div style={{padding:"11px 18px",color:C.success,fontWeight:600,fontSize:12}}>✓ All payments up to date</div>:unpaid.map(j=>(
                      <div key={j.id} style={{padding:"9px 18px",borderBottom:`1px solid #262626`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div><span style={{fontWeight:700,fontSize:13}}>#{j.id} {j.customer}</span><span style={{color:C.light,fontSize:11}}> · {j.appliance}{j.brand?` · ${j.brand}`:""} · {fmt(j.completedDate||j.scheduledDate)}</span></div>
                        <div style={{display:"flex",gap:9,alignItems:"center"}}>
                          <span style={{fontWeight:800,color:C.danger}}>£{j.rate}</span>
                          {isOwner&&<Btn onClick={()=>setJobs(js=>js.map(x=>x.id===j.id?{...x,paid:true}:x))} variant="success" sm>Mark Paid</Btn>}
                        </div>
                      </div>
                    ))}
                    {paid.length>0&&<div style={{padding:"9px 18px",background:"#161B22"}}>
                      <div style={{fontSize:9,color:C.light,fontWeight:700,textTransform:"uppercase",marginBottom:5,letterSpacing:.4}}>Payment History</div>
                      {paid.map(j=><div key={j.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0",color:C.mid}}><span>#{j.id} {j.customer} · {j.appliance}{j.brand?` · ${j.brand}`:""}</span><span style={{color:C.success,fontWeight:700}}>£{j.rate} ✓</span></div>)}
                    </div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── USERS ── */}
          {view==="users"&&isOwner&&<UserManager users={users} onUserCreated={loadStaffUsers}/>}

        </div>
      </div>

      {/* ── MODALS ── */}
      {(showNew||editJob)&&(
        <Modal title={editJob?`Edit Job #${editJob.id}`:"New Booking"} onClose={()=>{setShowNew(false);setEditJob(null);}} wide>
          <JobForm initial={editJob} onSave={saveJob} onCancel={()=>{setShowNew(false);setEditJob(null);}} canEditRate={isOwner} engineers={engineers} jobs={jobs}/>
        </Modal>
      )}
      {selJob&&!editJob&&!reassign&&(
        <Modal title={`Job #${selJob.id} — ${selJob.customer}`} onClose={()=>setSelJob(null)} wide>
          <JobDetail job={selJob} onClose={()=>setSelJob(null)} onEdit={()=>{setEditJob(selJob);setSelJob(null);}} onReassign={()=>setReassign(selJob)} engineers={engineers}/>
        </Modal>
      )}
      {reassign&&(
        <ReassignModal job={reassign} engineers={engineers} jobs={jobs} onReassign={doReassign} onClose={()=>setReassign(null)}/>
      )}
      {editEng&&(
        <Modal title={`Edit Engineer: ${editEng.name}`} onClose={()=>setEditEng(null)} wide>
          <EngineerEditor eng={editEng} onSave={saveEng} onCancel={()=>setEditEng(null)} isOwner={isOwner}/>
        </Modal>
      )}
      {showAddEng&&(
        <AddEngineerModal onCreated={()=>{loadEngineers();setShowAddEng(false);}} onCancel={()=>setShowAddEng(false)}/>
      )}
    </div>
  );
}
