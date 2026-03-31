import React, { useState } from 'react';

const PrototypeCard = ({ type, title, problem, description, initialAccepted = false }) => {
  const [accepted, setAccepted] = useState(initialAccepted);

  return (
    <div className="flex flex-col relative overflow-hidden bg-white border border-slate-200 shadow-sm rounded-3xl p-7 transition-all duration-500 hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_15px_40px_-10px_rgba(249,115,22,0.15)] group">
      {/* Subtle top gradient glow on hover */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Glow effect on hover inside */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="relative z-10 flex-grow flex flex-col">
        {/* Badge */}
        <div className="self-start mb-5">
          <span className="inline-block px-3.5 py-1.5 text-xs font-bold tracking-wider rounded-full bg-orange-100 text-orange-600 border border-orange-200">
            {type}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-extrabold text-slate-800 mb-5 leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-amber-500 transition-all duration-300">
          {title}
        </h3>

        {/* Problem Box */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 mb-6">
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-1.5">
            Target Metric
          </p>
          <p className="text-sm font-semibold text-slate-700 w-full">
            {problem}
          </p>
        </div>

        {/* Description */}
        <p className="text-slate-500 text-[15px] leading-relaxed mb-8 flex-grow font-medium">
          {description}
        </p>

        {/* Action Button */}
        <button
          onClick={() => setAccepted(true)}
          disabled={accepted}
          className={`relative w-full py-4 px-6 rounded-2xl font-bold tracking-wide transition-all duration-300 transform active:scale-[0.98] overflow-hidden ${
            accepted
              ? 'bg-orange-50 border border-orange-200 text-orange-500 cursor-default'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-[0_8px_20px_-5px_rgba(249,115,22,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(249,115,22,0.5)]'
          }`}
        >
          {/* Button Shine Effect (only on unaccepted) */}
          {!accepted && (
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
          )}

          <span className="relative z-10 flex items-center justify-center gap-2">
            {accepted ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Active Quest
              </>
            ) : (
              'Accept & Begin Testing'
            )}
          </span>
        </button>
      </div>
    </div>
  );
};

const BotCompanion = () => {
  return (
    <div className="fixed bottom-8 right-8 flex flex-col items-end z-50">
      {/* Chat Bubble */}
      <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-br-none shadow-xl mb-3 max-w-[220px] animate-fade-in-up origin-bottom-right">
        <p className="text-[13px] text-slate-600 leading-relaxed font-medium break-words">
          Found <span className="text-orange-600 font-bold">3 localized projects</span> aligning with your recent activity.
        </p>
      </div>
      
      {/* Bot Avatar */}
      <div className="relative group cursor-pointer mr-2">
        {/* Glow */}
        <div className="absolute inset-0 bg-orange-400/30 rounded-full blur-xl group-hover:bg-orange-400/50 transition-colors duration-500"></div>
        {/* Physical bot body */}
        <div className="relative w-14 h-14 bg-white rounded-full border border-slate-200 flex items-center justify-center text-xl shadow-lg hover:border-orange-300 transition-colors duration-300">
          <span className="relative animate-bounce">🤖</span>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="relative min-h-screen bg-slate-50 selection:bg-orange-200 overflow-x-hidden font-sans pb-32">
      {/* Ambient Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-orange-200/40 blur-[100px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-amber-100/40 blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center gap-5">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 tracking-tight">
              Volunteer Dashboard
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Active Prototypes</h2>
            <p className="text-slate-500 font-medium text-sm">Hardware & Software ready for field validation.</p>
          </div>
          <button className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors hidden sm:block">
            View Past Missions &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          <PrototypeCard 
            type="HARDWARE"
            title="Solar Water Purifier"
            problem="Groundwater Silt Filtration"
            description="A low-cost purifier designed to filter hard groundwater in off-grid rural regions. Real-world flow rate data over a 2-week period is essential."
            initialAccepted={false}
          />

          <PrototypeCard 
            type="SOFTWARE"
            title="EduTrack Mobile"
            problem="Offline Sync Reliability"
            description="Testing an app used by local teachers to log student attendance and grades when internet connectivity drops. Does the background sync duplicate entries?"
            initialAccepted={false}
          />
          
          <PrototypeCard 
            type="SERVICE DESIGN"
            title="Community Med Kiosk"
            problem="Automated Dispensing Trust"
            description="A self-serve medical supply kiosk. We need observers to track first-time users and document moments of hesitation in the user interface."
            initialAccepted={false}
          />

        </div>
      </main>

      {/* Floating Bot */}
      <BotCompanion />
    </div>
  );
}

export default App;
