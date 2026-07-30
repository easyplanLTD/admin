import React, { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/* Constants & sample data                                             */
/* ------------------------------------------------------------------ */

const APPLIANCE_TYPES = [
  "Washing Machine",
  "Fridge/Freezer",
  "Dishwasher",
  "Oven/Cooker",
  "Tumble Dryer",
  "Microwave",
];

const BRANDS = [
  "Bosch",
  "Samsung",
  "LG",
  "Hotpoint",
  "Beko",
  "Zanussi",
  "Whirlpool",
  "Indesit",
  "AEG",
  "Miele",
];

const todayStr = () => new Date().toISOString().slice(0, 10);

const initialUsers = [
  {
    id: "u-owner",
    role: "owner",
    name: "Alex Morgan",
    email: "owner@fixflow.co.uk",
    password: "owner123",
    phone: "07700 900001",
  },
  {
    id: "u-staff",
    role: "staff",
    name: "James Whitfield",
    email: "james@fixflow.co.uk",
    password: "staff123",
    phone: "07700 900002",
  },
  {
    id: "u-eng-dave",
    role: "engineer",
    name: "Dave Thompson",
    email: "dave@fixflow.co.uk",
    password: "eng123",
    phone: "07700 900010",
    payRate: 45,
    postcodes: ["M", "SK"],
    applianceTypes: ["Washing Machine", "Fridge/Freezer", "Dishwasher"],
    brandExclusions: { "Fridge/Freezer": ["Miele"] },
    integratedExclusions: ["Dishwasher"],
    stats: { completed: 142, ber: 18 },
    engineerType: "both",
    leadPrefs: { active: true, dailyLeadTarget: 10, pricePerLead: 12, cardLast4: "4242" },
  },
  {
    id: "u-eng-sarah",
    role: "engineer",
    name: "Sarah Ahmed",
    email: "sarah@fixflow.co.uk",
    password: "eng123",
    phone: "07700 900011",
    payRate: 50,
    postcodes: ["LS", "BD"],
    applianceTypes: ["Oven/Cooker", "Tumble Dryer", "Washing Machine"],
    brandExclusions: {},
    integratedExclusions: ["Oven/Cooker"],
    stats: { completed: 98, ber: 6 },
    engineerType: "jobs",
    leadPrefs: { active: true, dailyLeadTarget: 15, pricePerLead: 15, cardLast4: "1881" },
  },
  {
    id: "u-eng-mike",
    role: "engineer",
    name: "Mike O'Connor",
    email: "mike@fixflow.co.uk",
    password: "eng123",
    phone: "07700 900012",
    payRate: 42,
    postcodes: ["B", "DY"],
    applianceTypes: ["Dishwasher", "Fridge/Freezer", "Microwave"],
    brandExclusions: { Dishwasher: ["AEG"] },
    integratedExclusions: [],
    stats: { completed: 61, ber: 14 },
    engineerType: "leads",
    leadPrefs: { active: true, dailyLeadTarget: 5, pricePerLead: 10, cardLast4: "3300" },
  },
];

const initialJobs = [
  {
    id: "j-1001",
    customerName: "Linda Carter",
    phone: "07911 111222",
    email: "linda.carter@mail.com",
    address: "14 Ashfield Road, Manchester",
    postcode: "M14 5TG",
    applianceType: "Washing Machine",
    brand: "Bosch",
    applianceAge: "4 years",
    isIntegrated: false,
    faultDescription: "Not spinning, leaves clothes soaking wet",
    notes: ["Customer available after 4pm weekdays"],
    scheduledDate: `${todayStr()}T10:00`,
    completedDate: null,
    engineerId: "u-eng-dave",
    status: "assigned",
    priority: "normal",
    source: "manchesterapplianceRepair.co.uk",
    parts: { needed: false, ordered: false, arrived: false },
    paid: false,
    notifications: { booking: true, reminder: true, onway: false, completed: false },
  },
  {
    id: "j-1002",
    customerName: "Raj Patel",
    phone: "07922 222333",
    email: "raj.patel@mail.com",
    address: "8 Kirkgate, Leeds",
    postcode: "LS1 6HD",
    applianceType: "Oven/Cooker",
    brand: "AEG",
    applianceAge: "7 years",
    isIntegrated: false,
    faultDescription: "Oven not heating up at all",
    notes: [],
    scheduledDate: `${todayStr()}T13:30`,
    completedDate: null,
    engineerId: "u-eng-sarah",
    status: "in_progress",
    priority: "high",
    source: "leedsapplianceRepair.co.uk",
    parts: { needed: true, ordered: true, arrived: false },
    paid: false,
    notifications: { booking: true, reminder: true, onway: true, completed: false },
  },
  {
    id: "j-1003",
    customerName: "Emma Wright",
    phone: "07933 333444",
    email: "emma.wright@mail.com",
    address: "22 Broad Street, Birmingham",
    postcode: "B1 2HF",
    applianceType: "Fridge/Freezer",
    brand: "Samsung",
    applianceAge: "2 years",
    isIntegrated: true,
    faultDescription: "Fridge warm, freezer fine — food spoiling",
    notes: ["Urgent — food spoiling"],
    scheduledDate: `${todayStr()}T09:00`,
    completedDate: `${todayStr()}T09:50`,
    engineerId: "u-eng-mike",
    status: "completed",
    priority: "urgent",
    source: "birminghamapplianceRepair.co.uk",
    parts: { needed: false, ordered: false, arrived: false },
    paid: false,
    notifications: { booking: true, reminder: true, onway: true, completed: true },
  },
  {
    id: "j-1004",
    customerName: "Tom Baxter",
    phone: "07944 444555",
    email: "tom.baxter@mail.com",
    address: "5 Mellor Street, Stockport",
    postcode: "SK1 3PW",
    applianceType: "Dishwasher",
    brand: "Whirlpool",
    applianceAge: "5 years",
    isIntegrated: true,
    faultDescription: "Leaking from the bottom during wash cycle",
    notes: [],
    scheduledDate: null,
    completedDate: null,
    engineerId: null,
    status: "unassigned",
    priority: "normal",
    source: "manchesterapplianceRepair.co.uk",
    parts: { needed: false, ordered: false, arrived: false },
    paid: false,
    notifications: { booking: true, reminder: false, onway: false, completed: false },
  },
];

const initialLeads = [
  {
    id: "l-2001",
    customerName: "Priya Nair",
    phone: "07955 555666",
    address: "3 Merrion Street, Leeds",
    postcode: "LS2 8NG",
    applianceType: "Tumble Dryer",
    brand: "Hotpoint",
    applianceAge: "6 years",
    isIntegrated: false,
    priority: "normal",
    description: "Dryer runs but no heat",
    source: "leedsapplianceRepair.co.uk",
    engineerId: "u-eng-sarah",
    status: "assigned",
    price: 15,

    billed: false,
    createdAt: `${todayStr()}T08:15`,
    assignedAt: `${todayStr()}T08:15`,
  },
  {
    id: "l-2002",
    customerName: "George Wallis",
    phone: "07966 666777",
    address: "19 Deansgate, Manchester",
    postcode: "M3 2FW",
    applianceType: "Washing Machine",
    brand: "Miele",
    applianceAge: "3 years",
    isIntegrated: false,
    priority: "high",
    description: "Drum not turning, loud clicking noise",
    source: "manchesterapplianceRepair.co.uk",
    engineerId: "u-eng-dave",
    status: "assigned",
    price: 12,
    billed: false,
    createdAt: `${todayStr()}T09:00`,
    assignedAt: `${todayStr()}T09:00`,
  },
  {
    id: "l-2003",
    customerName: "Helen Foster",
    phone: "07977 777888",
    address: "41 Colmore Row, Birmingham",
    postcode: "B4 6AT",
    applianceType: "Microwave",
    brand: "Samsung",
    applianceAge: "1 year",
    isIntegrated: true,
    priority: "normal",
    description: "Turntable not rotating, sparking inside",
    source: "birminghamapplianceRepair.co.uk",
    engineerId: null,
    status: "unassigned",
    price: null,
    billed: false,
    createdAt: `${todayStr()}T09:40`,
    assignedAt: null,
  },
  {
    id: "l-2004",
    customerName: "Owen Baxter",
    phone: "07988 888999",
    address: "2 Piccadilly, Manchester",
    postcode: "M1 3AN",
    applianceType: "Fridge/Freezer",
    brand: "LG",
    applianceAge: "8 years",
    isIntegrated: false,
    priority: "urgent",
    description: "Freezer not cooling, ice building up fast",
    source: "manchesterapplianceRepair.co.uk",
    engineerId: "u-eng-dave",
    status: "assigned",
    price: 12,
    billed: false,
    createdAt: `${todayStr()}T07:30`,
    assignedAt: `${todayStr()}T07:30`,
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function successRate(engineer) {
  const { completed, ber } = engineer.stats;
  const total = completed + ber;
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

function rateColor(rate) {
  if (rate >= 80) return "text-emerald-600";
  if (rate >= 60) return "text-amber-600";
  return "text-rose-600";
}

function postcodeMatches(engineer, postcode) {
  const p = (postcode || "").toUpperCase().replace(/\s/g, "");
  return engineer.postcodes.some((prefix) => p.startsWith(prefix.toUpperCase()));
}

function handlesAppliance(engineer, applianceType, brand, isIntegrated) {
  if (!engineer.applianceTypes.includes(applianceType)) return false;
  const excludedBrands = engineer.brandExclusions[applianceType] || [];
  if (excludedBrands.includes(brand)) return false;
  const avoidsIntegrated = (engineer.integratedExclusions || []).includes(applianceType);
  if (isIntegrated && avoidsIntegrated) return false;
  return true;
}

function ineligibleReason(engineer, job) {
  if (!postcodeMatches(engineer, job.postcode)) return "Doesn't cover this postcode area";
  if (!engineer.applianceTypes.includes(job.applianceType)) return `Doesn't repair ${job.applianceType.toLowerCase()}`;
  const excludedBrands = engineer.brandExclusions[job.applianceType] || [];
  if (excludedBrands.includes(job.brand)) return `Won't work on ${job.brand}`;
  if (job.isIntegrated && (engineer.integratedExclusions || []).includes(job.applianceType)) return "Won't work on integrated/built-in units";
  return "Doesn't match this job";
}

function activeJobCount(jobs, engineerId) {
  return jobs.filter(
    (j) => j.engineerId === engineerId && !["completed", "beyond_repair"].includes(j.status)
  ).length;
}

function leadsAssignedToday(leads, engineerId) {
  const today = todayStr();
  return leads.filter(
    (l) => l.engineerId === engineerId && l.assignedAt && l.assignedAt.startsWith(today)
  ).length;
}

function findBestEngineerForJob(engineers, jobs, job) {
  const eligible = engineers.filter(
    (e) =>
      e.engineerType !== "leads" &&
      postcodeMatches(e, job.postcode) &&
      handlesAppliance(e, job.applianceType, job.brand, job.isIntegrated)
  );
  if (!eligible.length) return null;
  eligible.sort((a, b) => {
    const r = successRate(b) - successRate(a);
    if (r !== 0) return r;
    return activeJobCount(jobs, a.id) - activeJobCount(jobs, b.id);
  });
  return eligible[0];
}

// Leads are pooled by area: any engineer whose postcode coverage matches the
// lead's postcode, and who repairs that appliance type/brand, is in the same
// pool. Within a pool, leads are handed out to whoever is furthest below
// their own daily target first, so everyone's target fills evenly across the
// day instead of the top performer soaking up the whole pool. Success rate
// is only used to break ties between engineers at the same distance from
// their target.
function findBestEngineerForLead(engineers, leads, lead) {
  const eligible = engineers.filter(
    (e) =>
      e.engineerType !== "jobs" &&
      e.leadPrefs.active &&
      postcodeMatches(e, lead.postcode) &&
      handlesAppliance(e, lead.applianceType, lead.brand, lead.isIntegrated) &&
      leadsAssignedToday(leads, e.id) < e.leadPrefs.dailyLeadTarget
  );
  if (!eligible.length) return null;
  eligible.sort((a, b) => {
    const aFraction = leadsAssignedToday(leads, a.id) / a.leadPrefs.dailyLeadTarget;
    const bFraction = leadsAssignedToday(leads, b.id) / b.leadPrefs.dailyLeadTarget;
    if (aFraction !== bFraction) return aFraction - bFraction; // furthest below their own target goes first
    return successRate(b) - successRate(a);
  });
  return eligible[0];
}

function fmtMoney(n) {
  return `£${Number(n || 0).toFixed(2)}`;
}

function fmtDateTime(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const STATUS_STYLES = {
  unassigned: "bg-amber-100 text-amber-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
  beyond_repair: "bg-rose-100 text-rose-800",
};

const LEAD_STATUS_STYLES = {
  unassigned: "bg-slate-200 text-slate-700",
  assigned: "bg-violet-100 text-violet-800",
};

const PRIORITY_STYLES = {
  normal: "bg-slate-100 text-slate-600",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-rose-100 text-rose-800",
};

/* ------------------------------------------------------------------ */
/* Small UI atoms                                                       */
/* ------------------------------------------------------------------ */

function Pill({ className, children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 overflow-y-auto p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} mx-auto my-8`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-200 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500";

/* ------------------------------------------------------------------ */
/* Login                                                                */
/* ------------------------------------------------------------------ */

function LoginScreen({ users, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function attemptLogin(emailVal, passwordVal) {
    const u = users.find(
      (u) =>
        u.email.trim().toLowerCase() === emailVal.trim().toLowerCase() &&
        u.password === passwordVal.trim()
    );
    if (u) {
      setError("");
      onLogin(u);
    } else {
      setError("Incorrect email or password.");
    }
  }

  function submit(e) {
    e.preventDefault();
    attemptLogin(email, password);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-white">
            <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center font-bold">F</div>
            <span className="text-2xl font-bold tracking-tight">FixFlow Pro</span>
          </div>
          <p className="text-slate-400 text-sm mt-2">Appliance repair operations & lead marketplace</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-xl shadow-xl p-6">
          <Field label="Email">
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@fixflow.co.uk" />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}
          <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg py-2.5 transition">
            Log in
          </button>
        </form>
        <div className="mt-5 bg-slate-800 rounded-lg p-4 text-xs text-slate-300">
          <p className="font-semibold text-slate-200 mb-3">Demo logins — click to log straight in</p>
          <div className="space-y-1.5">
            {[
              { label: "Owner", email: "owner@fixflow.co.uk", password: "owner123" },
              { label: "Staff", email: "james@fixflow.co.uk", password: "staff123" },
              { label: "Engineer (Dave)", email: "dave@fixflow.co.uk", password: "eng123" },
              { label: "Engineer (Sarah)", email: "sarah@fixflow.co.uk", password: "eng123" },
              { label: "Engineer (Mike)", email: "mike@fixflow.co.uk", password: "eng123" },
            ].map((d) => (
              <button
                key={d.email}
                onClick={() => attemptLogin(d.email, d.password)}
                className="w-full flex items-center justify-between bg-slate-700 hover:bg-slate-600 rounded-md px-3 py-2 transition text-left"
              >
                <span className="text-slate-200 font-medium">{d.label}</span>
                <span className="text-slate-400">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                              */
/* ------------------------------------------------------------------ */

function Sidebar({ currentUser, activeView, setActiveView, onLogout }) {
  const nav = [
    { key: "dashboard", label: "Dashboard", roles: ["owner", "staff"] },
    { key: "jobs", label: "All Jobs", roles: ["owner", "staff"] },
    { key: "myjobs", label: "My Jobs", roles: ["engineer"], engineerTypes: ["jobs", "both"] },
    { key: "leads", label: "Lead Engineers", roles: ["owner", "staff"] },
    { key: "myleads", label: "My Leads", roles: ["engineer"], engineerTypes: ["leads", "both"] },
    { key: "engineers", label: "Engineers", roles: ["owner", "staff"] },
    { key: "payments", label: "Payments & Billing", roles: ["owner", "staff"] },
    { key: "users", label: "User Accounts", roles: ["owner"] },
  ];

  const visibleNav = nav.filter((n) => {
    if (!n.roles.includes(currentUser.role)) return false;
    if (currentUser.role === "engineer" && n.engineerTypes) {
      return n.engineerTypes.includes(currentUser.engineerType);
    }
    return true;
  });

  return (
    <div className="w-56 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white text-sm">F</div>
        <span className="text-white font-bold tracking-tight">FixFlow Pro</span>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-3">
        {visibleNav.map((n) => (
            <button
              key={n.key}
              onClick={() => setActiveView(n.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeView === n.key ? "bg-teal-600 text-white" : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              {n.label}
            </button>
          ))}
      </nav>
      <div className="px-4 py-4 border-t border-slate-800">
        <p className="text-sm font-medium text-white">{currentUser.name}</p>
        <p className="text-xs text-slate-400 capitalize mb-3">{currentUser.role}</p>
        <button onClick={onLogout} className="text-xs text-slate-400 hover:text-white underline">
          Log out
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

function DashboardView({ jobs, engineers }) {
  const today = todayStr();
  const todaysJobs = jobs.filter((j) => j.scheduledDate && j.scheduledDate.startsWith(today));
  const unassigned = jobs.filter((j) => j.status === "unassigned");
  const outstanding = jobs.filter((j) => j.status === "completed" && !j.paid);
  const outstandingTotal = outstanding.reduce((sum, j) => {
    const eng = engineers.find((e) => e.id === j.engineerId);
    return sum + (eng ? eng.payRate : 0);
  }, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Jobs today</p>
          <p className="text-3xl font-bold text-slate-800">{todaysJobs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Unassigned jobs</p>
          <p className="text-3xl font-bold text-amber-600">{unassigned.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Outstanding engineer pay</p>
          <p className="text-3xl font-bold text-slate-800">{fmtMoney(outstandingTotal)}</p>
        </div>
      </div>

      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="font-medium text-amber-800 mb-2">Unassigned jobs need attention</p>
          {unassigned.map((j) => (
            <div key={j.id} className="text-sm text-amber-800">
              {j.customerName} — {j.applianceType} ({j.postcode})
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold text-slate-800 mb-3">Today's schedule</h2>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {todaysJobs.length === 0 && <p className="p-4 text-sm text-slate-500">Nothing scheduled today.</p>}
        {todaysJobs.map((j) => {
          const eng = engineers.find((e) => e.id === j.engineerId);
          return (
            <div key={j.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{j.customerName} — {j.applianceType} ({j.brand})</p>
                <p className="text-sm text-slate-500">{fmtDateTime(j.scheduledDate)} · {eng ? eng.name : "Unassigned"}</p>
              </div>
              <Pill className={STATUS_STYLES[j.status]}>{j.status.replace("_", " ")}</Pill>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Jobs                                                                 */
/* ------------------------------------------------------------------ */

function JobsView({ jobs, engineers, currentUser, onOpenJob, restrictToEngineer }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [engineerFilter, setEngineerFilter] = useState("all");

  const visibleJobs = jobs.filter((j) => {
    if (restrictToEngineer && j.engineerId !== currentUser.id) return false;
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (engineerFilter !== "all" && j.engineerId !== engineerFilter) return false;
    if (search && !`${j.customerName} ${j.postcode} ${j.applianceType}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{restrictToEngineer ? "My Jobs" : "All Jobs"}</h1>
      <div className="flex gap-3 mb-4">
        <input className={`${inputCls} max-w-xs`} placeholder="Search customer, postcode, appliance…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={`${inputCls} max-w-[160px]`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="unassigned">Unassigned</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="beyond_repair">Beyond repair</option>
        </select>
        {!restrictToEngineer && (
          <select className={`${inputCls} max-w-[180px]`} value={engineerFilter} onChange={(e) => setEngineerFilter(e.target.value)}>
            <option value="all">All engineers</option>
            {engineers.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Appliance</th>
              <th className="px-4 py-2 font-medium">Scheduled</th>
              <th className="px-4 py-2 font-medium">Engineer</th>
              <th className="px-4 py-2 font-medium">Priority</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleJobs.map((j) => {
              const eng = engineers.find((e) => e.id === j.engineerId);
              return (
                <tr key={j.id} onClick={() => onOpenJob(j)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-2.5">{j.customerName}<br /><span className="text-xs text-slate-400">{j.postcode}</span></td>
                  <td className="px-4 py-2.5">
                    {j.applianceType}{j.isIntegrated && <Pill className="bg-indigo-100 text-indigo-700 ml-1">Integrated</Pill>}
                    <br /><span className="text-xs text-slate-400">{j.brand} · {j.applianceAge}</span>
                  </td>
                  <td className="px-4 py-2.5">{fmtDateTime(j.scheduledDate)}</td>
                  <td className="px-4 py-2.5">{eng ? eng.name : "—"}</td>
                  <td className="px-4 py-2.5"><Pill className={PRIORITY_STYLES[j.priority]}>{j.priority}</Pill></td>
                  <td className="px-4 py-2.5"><Pill className={STATUS_STYLES[j.status]}>{j.status.replace("_", " ")}</Pill></td>
                </tr>
              );
            })}
            {visibleJobs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No jobs match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobDetailModal({ job, engineers, currentUser, onClose, onUpdate, onAutoAssign }) {
  const [notes, setNotes] = useState(job.notes.join("\n"));
  const [showReassign, setShowReassign] = useState(false);
  const eng = engineers.find((e) => e.id === job.engineerId);
  const isEngineer = currentUser.role === "engineer";
  const suggestion = findBestEngineerForJob(engineers, [], job);

  function setStatus(status) {
    onUpdate({ ...job, status, completedDate: status === "completed" ? new Date().toISOString() : job.completedDate });
  }

  function saveNotes() {
    onUpdate({ ...job, notes: notes.split("\n").filter(Boolean) });
  }

  function toggleParts(field) {
    onUpdate({ ...job, parts: { ...job.parts, [field]: !job.parts[field] } });
  }

  function reassign(newEngId) {
    onUpdate({ ...job, engineerId: newEngId, status: "assigned" });
    setShowReassign(false);
  }

  return (
    <Modal title={`${job.customerName} — ${job.applianceType}`} onClose={onClose} wide>
      <div className="flex gap-2 mb-4">
        <Pill className={PRIORITY_STYLES[job.priority]}>{job.priority}</Pill>
        <Pill className={STATUS_STYLES[job.status]}>{job.status.replace("_", " ")}</Pill>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-5">
        <p><span className="text-slate-500">Appliance:</span> {job.applianceType}, {job.brand}, {job.applianceAge}{job.isIntegrated ? ", integrated/built-in" : ""}</p>
        <p><span className="text-slate-500">Address:</span> {job.address}</p>
        {!isEngineer && <p><span className="text-slate-500">Phone:</span> {job.phone}</p>}
        {!isEngineer && <p><span className="text-slate-500">Email:</span> {job.email}</p>}
        {isEngineer && <p><span className="text-slate-500">Phone:</span> {job.phone}</p>}
        <p><span className="text-slate-500">Scheduled:</span> {fmtDateTime(job.scheduledDate)}</p>
        <p><span className="text-slate-500">Source:</span> {job.source}</p>
        <p><span className="text-slate-500">Engineer:</span> {eng ? eng.name : "Unassigned"}</p>
        {currentUser.role === "owner" && eng && <p><span className="text-slate-500">Pay rate:</span> {fmtMoney(eng.payRate)}</p>}
      </div>

      <p className="text-sm text-slate-700 mb-4"><span className="text-slate-500">Fault:</span> {job.faultDescription}</p>

      {(currentUser.role === "engineer" || currentUser.role === "owner" || currentUser.role === "staff") && (
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Parts</p>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={job.parts.needed} onChange={() => toggleParts("needed")} /> Needed</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={job.parts.ordered} onChange={() => toggleParts("ordered")} /> Ordered</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={job.parts.arrived} onChange={() => toggleParts("arrived")} /> Arrived</label>
          </div>
        </div>
      )}

      <div className="mb-4">
        <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
        <textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} />
      </div>

      {!isEngineer && (
        <div className="mb-4 bg-slate-50 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-500 mb-1">Customer notifications sent</p>
          <div className="flex gap-3 text-xs">
            {["booking", "reminder", "onway", "completed"].map((k) => (
              <span key={k} className={job.notifications[k] ? "text-emerald-600" : "text-slate-400"}>
                {job.notifications[k] ? "✓" : "○"} {k}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isEngineer ? (
          <>
            <button onClick={() => setStatus("in_progress")} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium">Mark In Progress</button>
            <button onClick={() => setStatus("completed")} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium">Mark Completed</button>
            <button onClick={() => setStatus("beyond_repair")} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm font-medium">Beyond Repair</button>
          </>
        ) : (
          <>
            {job.status === "unassigned" && (
              <button onClick={() => onAutoAssign(job)} className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium">⚡ Auto-Assign Best Match</button>
            )}
            <button onClick={() => setShowReassign(!showReassign)} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium">⇄ Reassign Engineer</button>
            {job.status === "completed" && (
              <button onClick={() => onUpdate({ ...job, paid: !job.paid })} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm font-medium">
                {job.paid ? "Mark Unpaid" : "Mark Paid"}
              </button>
            )}
          </>
        )}
      </div>

      {showReassign && (
        <div className="mt-4 border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-500 mb-2">Compare engineers</p>
          {engineers.map((e) => {
            const rate = successRate(e);
            const eligible = postcodeMatches(e, job.postcode) && handlesAppliance(e, job.applianceType, job.brand, job.isIntegrated);
            const isSuggested = suggestion && suggestion.id === e.id;
            return (
              <div key={e.id} className="flex items-center justify-between py-2 border-t border-slate-100 first:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{e.name} {isSuggested && <span className="text-teal-600 text-xs font-semibold">(suggested)</span>}</p>
                  <p className={`text-xs ${rateColor(rate)}`}>{rate}% success rate</p>
                  {!eligible && <p className="text-xs text-rose-500">{ineligibleReason(e, job)}</p>}
                </div>
                <button onClick={() => reassign(e.id)} className="px-2.5 py-1 rounded-md bg-slate-800 text-white text-xs font-medium">Assign</button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Engineers                                                            */
/* ------------------------------------------------------------------ */

function EngineersView({ engineers, jobs, leads, currentUser, onEdit, onAddEngineer }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Engineers</h1>
        {currentUser.role === "owner" && (
          <button onClick={onAddEngineer} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">+ Add Engineer</button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {engineers.map((e) => {
          const rate = successRate(e);
          const active = activeJobCount(jobs, e.id);
          return (
            <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800">{e.name}</p>
                  <p className="text-xs text-slate-500">{e.phone} · {e.email}</p>
                </div>
                <button onClick={() => onEdit(e)} className="text-xs text-teal-600 font-medium">Edit</button>
              </div>
              <Pill className="bg-slate-800 text-white mb-3">
                {e.engineerType === "both" ? "Jobs & Leads" : e.engineerType === "jobs" ? "Jobs only" : "Leads only"}
              </Pill>
              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                <div><p className="text-lg font-bold text-slate-800">{active}</p><p className="text-xs text-slate-500">Active</p></div>
                <div><p className="text-lg font-bold text-slate-800">{e.stats.completed}</p><p className="text-xs text-slate-500">Repaired</p></div>
                <div><p className="text-lg font-bold text-slate-800">{e.stats.ber}</p><p className="text-xs text-slate-500">BER</p></div>
                <div><p className={`text-lg font-bold ${rateColor(rate)}`}>{rate}%</p><p className="text-xs text-slate-500">Success</p></div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {e.postcodes.map((p) => <Pill key={p} className="bg-slate-100 text-slate-600">{p}</Pill>)}
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {e.applianceTypes.map((a) => <Pill key={a} className="bg-blue-50 text-blue-700">{a}</Pill>)}
              </div>
              {e.engineerType !== "jobs" && (
                <div className="flex items-center justify-between text-xs bg-violet-50 rounded-lg px-3 py-2">
                  <span className="text-violet-700 font-medium">Leads: {e.leadPrefs.active ? "Active" : "Paused"}</span>
                  <span className="text-violet-700">{leadsAssignedToday(leads, e.id)}/{e.leadPrefs.dailyLeadTarget} today · {fmtMoney(e.leadPrefs.pricePerLead)}/lead</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EngineerEditModal({ engineer, currentUser, onClose, onSave, isNew }) {
  const [form, setForm] = useState(JSON.parse(JSON.stringify(engineer)));
  const canSave = form.name.trim() && form.email.trim() && form.password.trim() && form.postcodes.length > 0 && form.applianceTypes.length > 0;

  function toggleApplianceType(type) {
    setForm((f) => {
      const has = f.applianceTypes.includes(type);
      return {
        ...f,
        applianceTypes: has ? f.applianceTypes.filter((t) => t !== type) : [...f.applianceTypes, type],
      };
    });
  }

  function toggleBrandExclusion(type, brand) {
    setForm((f) => {
      const current = f.brandExclusions[type] || [];
      const updated = current.includes(brand) ? current.filter((b) => b !== brand) : [...current, brand];
      return { ...f, brandExclusions: { ...f.brandExclusions, [type]: updated } };
    });
  }

  function toggleIntegratedExclusion(type) {
    setForm((f) => {
      const current = f.integratedExclusions || [];
      const updated = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
      return { ...f, integratedExclusions: updated };
    });
  }

  function addPostcode(val) {
    if (!val) return;
    setForm((f) => ({ ...f, postcodes: [...f.postcodes, val.toUpperCase()] }));
  }

  function removePostcode(p) {
    setForm((f) => ({ ...f, postcodes: f.postcodes.filter((x) => x !== p) }));
  }

  const [pcInput, setPcInput] = useState("");

  const footerContent = (
    <div className="flex items-center justify-end gap-3">
      {!canSave && (
        <p className="text-xs text-rose-500 mr-auto">
          Still needed: {[
            !form.name.trim() && "name",
            !form.email.trim() && "email",
            !form.password.trim() && "password",
            form.postcodes.length === 0 && "a postcode area",
            form.applianceTypes.length === 0 && "an appliance type",
          ].filter(Boolean).join(", ")}
        </p>
      )}
      <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">Cancel</button>
      <button
        onClick={() => { if (canSave) onSave(form); }}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"
      >
        {isNew ? "Add Engineer" : "Save changes"}
      </button>
    </div>
  );

  return (
    <Modal title={isNew ? "Add New Engineer" : `Edit ${engineer.name}`} onClose={onClose} wide footer={footerContent}>
      <div className="mb-5">
        <p className="text-sm font-semibold text-slate-700 mb-2">Works on</p>
        <select
          className={inputCls}
          value={form.engineerType}
          onChange={(e) => setForm({ ...form, engineerType: e.target.value })}
        >
          <option value="both">Jobs & Leads</option>
          <option value="jobs">Jobs only</option>
          <option value="leads">Leads only</option>
        </select>
        <p className="text-xs text-slate-500 mt-1">
          Controls whether this engineer is included in job auto-assign, lead auto-assign, or both.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Contact & login details</p>
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Phone"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Password"><input className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          {currentUser.role === "owner" && form.engineerType !== "leads" && (
            <Field label="Pay rate per job (£)">
              <input className={inputCls} type="number" value={form.payRate} onChange={(e) => setForm({ ...form, payRate: Number(e.target.value) })} />
            </Field>
          )}

          <p className="text-sm font-semibold text-slate-700 mt-5 mb-2">Postcode areas covered</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {form.postcodes.map((p) => (
              <Pill key={p} className="bg-slate-100 text-slate-700">
                {p} <button onClick={() => removePostcode(p)} className="ml-1 text-slate-400 hover:text-rose-600">×</button>
              </Pill>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} placeholder="e.g. M1" value={pcInput} onChange={(e) => setPcInput(e.target.value)} />
            <button onClick={() => { addPostcode(pcInput); setPcInput(""); }} className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm">Add</button>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-1">Appliance types & brand exclusions</p>
          <p className="text-xs text-slate-500 mb-2">Tick an appliance type below, then brand and integrated-unit options will appear underneath it — click a brand to mark it as one they won't repair, or tick the integrated box if they don't do built-in units for that type.</p>
          <div className="space-y-2 mb-5">
            {APPLIANCE_TYPES.map((type) => {
              const active = form.applianceTypes.includes(type);
              const avoidsIntegrated = (form.integratedExclusions || []).includes(type);
              return (
                <div key={type} className="border border-slate-200 rounded-lg p-2.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={active} onChange={() => toggleApplianceType(type)} /> {type}
                  </label>
                  {active ? (
                    <>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {BRANDS.map((b) => {
                          const excluded = (form.brandExclusions[type] || []).includes(b);
                          return (
                            <button
                              key={b}
                              onClick={() => toggleBrandExclusion(type, b)}
                              className={`text-xs px-2 py-1 rounded-md ${excluded ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}
                            >
                              {b}
                            </button>
                          );
                        })}
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                        <input type="checkbox" checked={avoidsIntegrated} onChange={() => toggleIntegratedExclusion(type)} />
                        Won't work on integrated / built-in {type.toLowerCase()} units
                      </label>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1 ml-6">Tick to set brand and integrated-unit exclusions for this type</p>
                  )}
                </div>
              );
            })}
          </div>

          {form.engineerType !== "jobs" && (
            <>
              <p className="text-sm font-semibold text-violet-700 mb-2">Lead marketplace preferences</p>
              <div className="bg-violet-50 rounded-lg p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-violet-800">
                  <input
                    type="checkbox"
                    checked={form.leadPrefs.active}
                    onChange={(e) => setForm({ ...form, leadPrefs: { ...form.leadPrefs, active: e.target.checked } })}
                  />
                  Currently in the lead pool
                </label>
                <Field label={`How many leads they'd like per day: ${form.leadPrefs.dailyLeadTarget}/day`}>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={form.leadPrefs.dailyLeadTarget}
                    onChange={(e) => setForm({ ...form, leadPrefs: { ...form.leadPrefs, dailyLeadTarget: Number(e.target.value) } })}
                    className="w-full accent-violet-600"
                  />
                </Field>
                <Field label="Price they pay per lead (£)">
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    value={form.leadPrefs.pricePerLead}
                    onChange={(e) => setForm({ ...form, leadPrefs: { ...form.leadPrefs, pricePerLead: Number(e.target.value) } })}
                  />
                </Field>
                <p className="text-xs text-violet-600">
                  Leads are assigned automatically up to this daily amount, split fairly across everyone in the area who repairs this
                  appliance type — no accept/decline needed. Card on file: {form.leadPrefs.cardLast4 ? `•••• ${form.leadPrefs.cardLast4}` : "None saved"}, charged automatically at end of day.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Lead Engineers (marketplace)                                        */
/* ------------------------------------------------------------------ */

function NewLeadForm({ onCreate, onCancel }) {
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: "",
    postcode: "",
    applianceType: APPLIANCE_TYPES[0],
    brand: BRANDS[0],
    applianceAge: "",
    isIntegrated: false,
    priority: "normal",
    description: "",
    source: "",
  });

  return (
    <Modal title="New Lead" onClose={onCancel}>
      <Field label="Customer name"><input className={inputCls} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></Field>
      <Field label="Phone"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Address"><input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      <Field label="Postcode"><input className={inputCls} value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Appliance type">
          <select className={inputCls} value={form.applianceType} onChange={(e) => setForm({ ...form, applianceType: e.target.value })}>
            {APPLIANCE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Brand">
          <select className={inputCls} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
            {BRANDS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Appliance age"><input className={inputCls} placeholder="e.g. 4 years" value={form.applianceAge} onChange={(e) => setForm({ ...form, applianceAge: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm text-slate-700 mb-3">
        <input type="checkbox" checked={form.isIntegrated} onChange={(e) => setForm({ ...form, isIntegrated: e.target.checked })} />
        Integrated / built-in unit
      </label>
      <Field label="Priority">
        <select className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </Field>
      <Field label="Description"><textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <Field label="Source website"><input className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">Cancel</button>
        <button onClick={() => onCreate(form)} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium">Create & auto-assign</button>
      </div>
    </Modal>
  );
}

function LeadsView({ leads, engineers, onCreateLead, onAutoAssign }) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Lead Engineers</h1>
        <button onClick={() => setShowNew(true)} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium">+ New Lead</button>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Leads come in from the booking form the same way jobs do. Each one is auto-assigned within its area's pool — every engineer
        whose postcode coverage matches and who repairs that appliance type/brand — and handed to whoever is furthest below their
        own daily target, so everyone's requested number fills evenly. No accept/decline; it's simply assigned.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {engineers.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="font-medium text-slate-800 text-sm">{e.name}</p>
            <p className="text-xs text-slate-500 mb-2">{e.leadPrefs.active ? "In the pool" : "Paused"} · covers {e.postcodes.join(", ")}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-violet-700 font-semibold">{leadsAssignedToday(leads, e.id)}/{e.leadPrefs.dailyLeadTarget} today</span>
              <span className="text-slate-500">{fmtMoney(e.leadPrefs.pricePerLead)}/lead</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Appliance</th>
              <th className="px-4 py-2 font-medium">Priority</th>
              <th className="px-4 py-2 font-medium">Engineer</th>
              <th className="px-4 py-2 font-medium">Price</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const eng = engineers.find((e) => e.id === l.engineerId);
              return (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5">{l.customerName}<br /><span className="text-xs text-slate-400">{l.postcode}</span></td>
                  <td className="px-4 py-2.5">
                    {l.applianceType}{l.isIntegrated && <Pill className="bg-indigo-100 text-indigo-700 ml-1">Integrated</Pill>}
                    <br /><span className="text-xs text-slate-400">{l.brand} · {l.applianceAge || "—"}</span>
                  </td>
                  <td className="px-4 py-2.5"><Pill className={PRIORITY_STYLES[l.priority]}>{l.priority}</Pill></td>
                  <td className="px-4 py-2.5">{eng ? eng.name : "—"}</td>
                  <td className="px-4 py-2.5">{l.price ? fmtMoney(l.price) : "—"}</td>
                  <td className="px-4 py-2.5"><Pill className={LEAD_STATUS_STYLES[l.status]}>{l.status}</Pill></td>
                  <td className="px-4 py-2.5">
                    {l.status === "unassigned" && (
                      <button onClick={() => onAutoAssign(l)} className="text-xs text-violet-600 font-medium">⚡ Auto-assign</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewLeadForm
          onCancel={() => setShowNew(false)}
          onCreate={(form) => {
            onCreateLead(form);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

function MyLeadsView({ leads, currentUser, onUpdateTarget }) {
  const mine = leads.filter((l) => l.engineerId === currentUser.id);
  const todayCount = leadsAssignedToday(leads, currentUser.id);
  const todaysLeads = mine.filter((l) => l.assignedAt && l.assignedAt.startsWith(todayStr()));
  const owedToday = todaysLeads.reduce((sum, l) => sum + (l.price || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-4">My Leads</h1>
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-6 flex gap-8">
        <div>
          <p className="text-xs text-violet-600">Leads today</p>
          <p className="text-xl font-bold text-violet-800">{todayCount} / {currentUser.leadPrefs.dailyLeadTarget}</p>
        </div>
        <div>
          <p className="text-xs text-violet-600">Estimated charge tonight</p>
          <p className="text-xl font-bold text-violet-800">{fmtMoney(owedToday)}</p>
        </div>
        <div>
          <p className="text-xs text-violet-600">Card on file</p>
          <p className="text-xl font-bold text-violet-800">{currentUser.leadPrefs.cardLast4 ? `•••• ${currentUser.leadPrefs.cardLast4}` : "None"}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <p className="text-sm font-semibold text-slate-700 mb-1">How many leads would you like per day?</p>
        <p className="text-xs text-slate-500 mb-4">
          We'll assign you up to this many leads a day, matched to your area and the appliances you repair, at {fmtMoney(currentUser.leadPrefs.pricePerLead)} each.
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={currentUser.leadPrefs.dailyLeadTarget}
            onChange={(e) => onUpdateTarget(Number(e.target.value))}
            className="flex-1 accent-violet-600"
          />
          <span className="w-24 text-right text-2xl font-bold text-violet-700">{currentUser.leadPrefs.dailyLeadTarget}/day</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {mine.length === 0 && <p className="p-4 text-sm text-slate-500">No leads assigned yet.</p>}
        {mine.map((l) => (
          <div key={l.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="font-medium text-slate-800">{l.customerName}</p>
              <Pill className={LEAD_STATUS_STYLES[l.status]}>{l.status}</Pill>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-700 mb-2">
              <p><span className="text-slate-500">Phone:</span> {l.phone}</p>
              <p><span className="text-slate-500">Address:</span> {l.address} ({l.postcode})</p>
              <p><span className="text-slate-500">Appliance:</span> {l.applianceType}{l.isIntegrated ? " (Integrated/built-in)" : ""}</p>
              <p><span className="text-slate-500">Brand:</span> {l.brand}</p>
              <p><span className="text-slate-500">Age:</span> {l.applianceAge || "Not given"}</p>
              <p><span className="text-slate-500">Priority:</span> {l.priority}</p>
            </div>
            <p className="text-sm text-slate-600 mb-2">{l.description}</p>
            <p className="text-xs text-slate-400">Price: {fmtMoney(l.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Payments & Billing                                                   */
/* ------------------------------------------------------------------ */

function PaymentsView({ jobs, leads, engineers, currentUser, onMarkPaid, billingRuns, onRunBilling }) {
  const [tab, setTab] = useState("jobs");
  const unpaidJobs = jobs.filter((j) => j.status === "completed" && !j.paid);

  const today = todayStr();
  const dueToday = engineers
    .map((e) => {
      const count = leads.filter((l) => l.engineerId === e.id && l.status === "assigned" && l.assignedAt?.startsWith(today) && !l.billed).length;
      return { engineer: e, count, total: count * e.leadPrefs.pricePerLead };
    })
    .filter((d) => d.count > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Payments & Billing</h1>
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("jobs")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "jobs" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>Job payments</button>
        <button onClick={() => setTab("leads")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "leads" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}>Lead billing</button>
      </div>

      {tab === "jobs" && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {unpaidJobs.length === 0 && <p className="p-4 text-sm text-slate-500">No outstanding engineer payments.</p>}
          {unpaidJobs.map((j) => {
            const eng = engineers.find((e) => e.id === j.engineerId);
            return (
              <div key={j.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{eng?.name} — {j.customerName}</p>
                  <p className="text-sm text-slate-500">Completed {fmtDateTime(j.completedDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800">{fmtMoney(eng?.payRate)}</span>
                  <button onClick={() => onMarkPaid(j)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium">Mark Paid</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "leads" && (
        <>
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-violet-800">
              Engineers pay per lead assigned to them. At the end of each day the system charges each engineer's card on file for the
              leads they received. This demo simulates that charge — connecting a real processor (e.g. Stripe) is needed to actually collect payment live.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-4">
            {dueToday.length === 0 && <p className="p-4 text-sm text-slate-500">No leads awaiting billing today.</p>}
            {dueToday.map(({ engineer, count, total }) => (
              <div key={engineer.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{engineer.name}</p>
                  <p className="text-sm text-slate-500">{count} lead{count !== 1 ? "s" : ""} × {fmtMoney(engineer.leadPrefs.pricePerLead)}</p>
                </div>
                <span className="font-semibold text-slate-800">{fmtMoney(total)}</span>
              </div>
            ))}
          </div>
          {currentUser.role !== "engineer" && dueToday.length > 0 && (
            <button onClick={onRunBilling} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium mb-6">
              Run end-of-day billing now ({fmtMoney(dueToday.reduce((s, d) => s + d.total, 0))} total)
            </button>
          )}

          <h2 className="text-lg font-semibold text-slate-800 mb-3">Billing history</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {billingRuns.length === 0 && <p className="p-4 text-sm text-slate-500">No billing runs yet.</p>}
            {billingRuns.map((run) => (
              <div key={run.id} className="p-4">
                <p className="text-sm font-medium text-slate-800">{fmtDateTime(run.timestamp)} — {fmtMoney(run.total)} charged</p>
                {run.entries.map((en) => (
                  <p key={en.engineerId} className="text-xs text-slate-500 ml-2">
                    {en.engineerName}: {en.count} lead{en.count !== 1 ? "s" : ""} — {fmtMoney(en.total)} ✓ charged {en.cardLast4 ? `•••• ${en.cardLast4}` : ""}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Users                                                                */
/* ------------------------------------------------------------------ */

function UsersView({ users, onEditUser, onAddUser }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">User Accounts</h1>
        <button onClick={onAddUser} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">+ Add User</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {users.map((u) => (
          <div key={u.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">{u.name}</p>
              <p className="text-sm text-slate-500">{u.email} · <span className="capitalize">{u.role}</span></p>
            </div>
            <button onClick={() => onEditUser(u)} className="text-sm text-teal-600 font-medium">Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserEditModal({ user, onClose, onSave, isNew }) {
  const [form, setForm] = useState({ ...user });
  const canSave = form.name.trim() && form.email.trim() && form.password.trim();

  const footerContent = (
    <div className="flex items-center justify-end gap-2">
      {!canSave && <p className="text-xs text-rose-500 mr-auto">Name, email, and password are required.</p>}
      <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">Cancel</button>
      <button
        onClick={() => { if (canSave) onSave(form); }}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"
      >
        {isNew ? "Add User" : "Save changes"}
      </button>
    </div>
  );

  return (
    <Modal title={isNew ? "Add New User" : `Edit ${user.name}`} onClose={onClose} footer={footerContent}>
      <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Password"><input className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
      <Field label="Phone"><input className={inputCls} value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Role">
        <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="owner">Owner</option>
          <option value="staff">Staff</option>
          {!isNew && <option value="engineer">Engineer</option>}
        </select>
      </Field>
      {isNew && (
        <p className="text-xs text-slate-500 -mt-2 mb-3">
          To add an engineer, use the <strong>+ Add Engineer</strong> button on the Engineers tab instead — it captures their
          coverage area, appliance types, and lead preferences in one place.
        </p>
      )}
      {form.role === "engineer" && (
        <Field label="Pay rate per job (£)">
          <input className={inputCls} type="number" value={form.payRate || 0} onChange={(e) => setForm({ ...form, payRate: Number(e.target.value) })} />
        </Field>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                  */
/* ------------------------------------------------------------------ */

export default function App() {
  const [users, setUsers] = useState(initialUsers);
  const [jobs, setJobs] = useState(initialJobs);
  const [leads, setLeads] = useState(initialLeads);
  const [billingRuns, setBillingRuns] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [openJob, setOpenJob] = useState(null);
  const [editEngineer, setEditEngineer] = useState(null);
  const [editUser, setEditUser] = useState(null);

  const engineers = users.filter((u) => u.role === "engineer");

  function blankEngineer() {
    return {
      id: `u-eng-${Date.now()}`,
      role: "engineer",
      name: "",
      email: "",
      password: "",
      phone: "",
      payRate: 40,
      postcodes: [],
      applianceTypes: [],
      brandExclusions: {},
      integratedExclusions: [],
      stats: { completed: 0, ber: 0 },
      engineerType: "both",
      leadPrefs: { active: true, dailyLeadTarget: 5, pricePerLead: 10, cardLast4: null },
    };
  }

  function blankUser() {
    return {
      id: `u-${Date.now()}`,
      role: "staff",
      name: "",
      email: "",
      password: "",
      phone: "",
    };
  }

  function handleLogin(user) {
    setCurrentUser(user);
    setActiveView(user.role === "engineer" ? "myjobs" : "dashboard");
  }

  function updateJob(updated) {
    setJobs((js) => js.map((j) => (j.id === updated.id ? updated : j)));
    setOpenJob(updated);
  }

  function autoAssignJob(job) {
    const best = findBestEngineerForJob(engineers, jobs, job);
    if (best) updateJob({ ...job, engineerId: best.id, status: "assigned" });
  }

  function saveEngineer(form) {
    setUsers((us) => {
      const exists = us.some((u) => u.id === form.id);
      return exists ? us.map((u) => (u.id === form.id ? form : u)) : [...us, form];
    });
    setEditEngineer(null);
    if (currentUser.id === form.id) setCurrentUser(form);
  }

  function updateOwnLeadTarget(newTarget) {
    setUsers((us) =>
      us.map((u) => (u.id === currentUser.id ? { ...u, leadPrefs: { ...u.leadPrefs, dailyLeadTarget: newTarget } } : u))
    );
    setCurrentUser((cu) => ({ ...cu, leadPrefs: { ...cu.leadPrefs, dailyLeadTarget: newTarget } }));
  }

  function saveUser(form) {
    setUsers((us) => {
      const exists = us.some((u) => u.id === form.id);
      return exists ? us.map((u) => (u.id === form.id ? form : u)) : [...us, form];
    });
    setEditUser(null);
  }

  function createLead(form) {
    const newLead = {
      id: `l-${Date.now()}`,
      ...form,
      engineerId: null,
      status: "unassigned",
      price: null,
      billed: false,
      createdAt: new Date().toISOString(),
      assignedAt: null,
    };
    const best = findBestEngineerForLead(engineers, leads, newLead);
    const assigned = best
      ? { ...newLead, engineerId: best.id, status: "assigned", price: best.leadPrefs.pricePerLead, assignedAt: new Date().toISOString() }
      : newLead;
    setLeads((ls) => [...ls, assigned]);
  }

  function autoAssignLead(lead) {
    const best = findBestEngineerForLead(engineers, leads, lead);
    if (best) {
      setLeads((ls) =>
        ls.map((l) =>
          l.id === lead.id
            ? { ...l, engineerId: best.id, status: "assigned", price: best.leadPrefs.pricePerLead, assignedAt: new Date().toISOString() }
            : l
        )
      );
    }
  }

  function runBilling() {
    const today = todayStr();
    const entries = engineers
      .map((e) => {
        const billable = leads.filter((l) => l.engineerId === e.id && l.status === "assigned" && l.assignedAt?.startsWith(today) && !l.billed);
        if (billable.length === 0) return null;
        return {
          engineerId: e.id,
          engineerName: e.name,
          count: billable.length,
          total: billable.length * e.leadPrefs.pricePerLead,
          cardLast4: e.leadPrefs.cardLast4,
          leadIds: billable.map((l) => l.id),
        };
      })
      .filter(Boolean);
    if (entries.length === 0) return;
    const run = {
      id: `run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      total: entries.reduce((s, e) => s + e.total, 0),
      entries,
    };
    setBillingRuns((rs) => [run, ...rs]);
    const billedIds = new Set(entries.flatMap((e) => e.leadIds));
    setLeads((ls) => ls.map((l) => (billedIds.has(l.id) ? { ...l, billed: true } : l)));
  }

  function markJobPaid(job) {
    updateJob({ ...job, paid: true });
  }

  if (!currentUser) return <LoginScreen users={users} onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar currentUser={currentUser} activeView={activeView} setActiveView={setActiveView} onLogout={() => setCurrentUser(null)} />
      <main className="flex-1 p-8">
        {activeView === "dashboard" && <DashboardView jobs={jobs} engineers={engineers} />}
        {activeView === "jobs" && (
          <JobsView jobs={jobs} engineers={engineers} currentUser={currentUser} onOpenJob={setOpenJob} restrictToEngineer={false} />
        )}
        {activeView === "myjobs" && (
          <JobsView jobs={jobs} engineers={engineers} currentUser={currentUser} onOpenJob={setOpenJob} restrictToEngineer={true} />
        )}
        {activeView === "leads" && (
          <LeadsView leads={leads} engineers={engineers} onCreateLead={createLead} onAutoAssign={autoAssignLead} />
        )}
        {activeView === "myleads" && <MyLeadsView leads={leads} currentUser={currentUser} onUpdateTarget={updateOwnLeadTarget} />}
        {activeView === "engineers" && (
          <EngineersView engineers={engineers} jobs={jobs} leads={leads} currentUser={currentUser} onEdit={setEditEngineer} onAddEngineer={() => setEditEngineer(blankEngineer())} />
        )}
        {activeView === "payments" && (
          <PaymentsView
            jobs={jobs}
            leads={leads}
            engineers={engineers}
            currentUser={currentUser}
            onMarkPaid={markJobPaid}
            billingRuns={billingRuns}
            onRunBilling={runBilling}
          />
        )}
        {activeView === "users" && <UsersView users={users} onEditUser={setEditUser} onAddUser={() => setEditUser(blankUser())} />}
      </main>

      {openJob && (
        <JobDetailModal
          job={openJob}
          engineers={engineers}
          currentUser={currentUser}
          onClose={() => setOpenJob(null)}
          onUpdate={updateJob}
          onAutoAssign={autoAssignJob}
        />
      )}
      {editEngineer && (
        <EngineerEditModal
          engineer={editEngineer}
          currentUser={currentUser}
          onClose={() => setEditEngineer(null)}
          onSave={saveEngineer}
          isNew={!users.some((u) => u.id === editEngineer.id)}
        />
      )}
      {editUser && (
        <UserEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={saveUser}
          isNew={!users.some((u) => u.id === editUser.id)}
        />
      )}
    </div>
  );
}
