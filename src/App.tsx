import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rocket, 
  Target, 
  Wallet, 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Handshake, 
  ChevronRight, 
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  BarChart3,
  FileText,
  Map,
  Plus,
  Eye,
  Star,
  Heart,
  Shield,
  Coins,
  Zap,
  Trophy,
  Globe,
  LayoutDashboard,
  Boxes,
  FileCheck
} from 'lucide-react';
import { cn } from './lib/utils';
import { 
  StartupInfo, 
  DecisionPoint, 
  SimulationStep, 
  Metrics, 
  FinalReport,
  StartupStage,
  Prototype
} from './types';
import { generateNextDecision, simulateOutcome, generateFinalReport, simulateWhatIf } from './services/gemini';
import ReactMarkdown from 'react-markdown';
import MultiplayerGame from './components/MultiplayerGame';

const INITIAL_METRICS: Metrics = {
  impact: 50,
  financials: 50,
  risk: 30,
  trust: 50
};

export default function App() {
  const [view, setView] = useState<'welcome' | 'setup' | 'simulation' | 'report' | 'multiplayer' | 'volunteer-dashboard'>('welcome');
  const [startup, setStartup] = useState<StartupInfo | null>(null);
  const [history, setHistory] = useState<SimulationStep[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(INITIAL_METRICS);
  const [loading, setLoading] = useState(false);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [prototypes, setPrototypes] = useState<Prototype[]>([
    {
      id: '1',
      type: 'HARDWARE',
      title: 'Solar Water Purifier',
      problem: 'Groundwater Silt Filtration',
      description: 'A low-cost purifier designed to filter hard groundwater in off-grid rural regions. Real-world flow rate data over a 2-week period is essential.'
    },
    {
      id: '2',
      type: 'SOFTWARE',
      title: 'EduTrack Mobile',
      problem: 'Offline Sync Reliability',
      description: 'Testing an app used by local teachers to log student attendance and grades when internet connectivity drops. Does the background sync duplicate entries?'
    }
  ]);

  const submitForTesting = () => {
    if (!startup || !report) return;
    
    const newPrototype: Prototype = {
      id: `proto_${Date.now()}`,
      type: startup.stage === 'idea' ? 'SERVICE DESIGN' : 'SOFTWARE',
      title: startup.name,
      problem: startup.goals || startup.idea,
      description: report.summary
    };

    setPrototypes([newPrototype, ...prototypes]);
    setView('volunteer-dashboard');
  };

  const startSimulation = async (info: StartupInfo) => {
    setStartup(info);
    setLoading(true);
    try {
      const firstDecision = await generateNextDecision(info, []);
      setHistory([{ decision: firstDecision }]);
      setView('simulation');
    } catch (error) {
      console.error("Failed to start simulation:", error);
    } finally {
      setLoading(false);
    }
  };

  const [showLevelUp, setShowLevelUp] = useState(false);

  const handleDecision = async (optionId: string | 'custom', customInput?: string) => {
    if (!startup || history.length === 0) return;
    
    const currentStep = history[history.length - 1];
    setLoading(true);
    
    try {
      const outcome = await simulateOutcome(startup, currentStep.decision, optionId, metrics, customInput);
      
      // Update metrics
      const newMetrics = {
        impact: Math.max(0, Math.min(100, metrics.impact + (outcome.metricChanges.impact || 0))),
        financials: Math.max(0, Math.min(100, metrics.financials + (outcome.metricChanges.financials || 0))),
        risk: Math.max(0, Math.min(100, metrics.risk + (outcome.metricChanges.risk || 0))),
        trust: Math.max(0, Math.min(100, metrics.trust + (outcome.metricChanges.trust || 0))),
      };
      setMetrics(newMetrics);

      // Update history with outcome
      const updatedHistory = [...history];
      updatedHistory[updatedHistory.length - 1] = { 
        ...currentStep, 
        selectedOptionId: optionId === 'custom' ? undefined : optionId, 
        customDecision: optionId === 'custom' ? customInput : undefined,
        outcome 
      };
      setHistory(updatedHistory);
    } catch (error) {
      console.error("Failed to process decision:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextLevel = async () => {
    if (!startup || history.length === 0) return;
    const currentStep = history[history.length - 1];
    if (!currentStep.outcome) return;

    setLoading(true);
    try {
      // Show Level Up animation if not final
      if (!currentStep.decision.isFinal) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 2000);
      }

      // Check if we should continue or finish
      if (!currentStep.decision.isFinal) {
        const nextDecision = await generateNextDecision(startup, history);
        setHistory([...history, { decision: nextDecision }]);
      } else {
        const finalReport = await generateFinalReport(startup, history, metrics);
        setReport(finalReport);
        setView('report');
      }
    } catch (error) {
      console.error("Failed to proceed to next level:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatIf = async () => {
    if (!startup || history.length === 0) return;
    const currentStep = history[history.length - 1];
    if (!currentStep.outcome || currentStep.whatIfs) return;

    setWhatIfLoading(true);
    try {
      const otherOptionIds = currentStep.decision.options
        .map(o => o.id)
        .filter(id => id !== currentStep.selectedOptionId);
      
      const whatIfs = await simulateWhatIf(startup, currentStep.decision, otherOptionIds);
      
      const updatedHistory = [...history];
      updatedHistory[updatedHistory.length - 1] = { ...currentStep, whatIfs };
      setHistory(updatedHistory);
    } catch (error) {
      console.error("Failed to generate what-if analysis:", error);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const handleSwitchPath = async (newOptionId: string) => {
    if (!startup || history.length === 0) return;
    const currentStep = history[history.length - 1];
    if (!currentStep.outcome || !currentStep.whatIfs || !currentStep.whatIfs[newOptionId]) return;

    const newOutcomeData = currentStep.whatIfs[newOptionId];
    setLoading(true);

    try {
      // 1. Calculate metrics as they were BEFORE the current decision
      const prevMetrics = {
        impact: metrics.impact - (currentStep.outcome.metricChanges.impact || 0),
        financials: metrics.financials - (currentStep.outcome.metricChanges.financials || 0),
        risk: metrics.risk - (currentStep.outcome.metricChanges.risk || 0),
        trust: metrics.trust - (currentStep.outcome.metricChanges.trust || 0),
      };

      // 2. Apply the new outcome's changes
      const newMetrics = {
        impact: Math.max(0, Math.min(100, prevMetrics.impact + (newOutcomeData.metricChanges.impact || 0))),
        financials: Math.max(0, Math.min(100, prevMetrics.financials + (newOutcomeData.metricChanges.financials || 0))),
        risk: Math.max(0, Math.min(100, prevMetrics.risk + (newOutcomeData.metricChanges.risk || 0))),
        trust: Math.max(0, Math.min(100, prevMetrics.trust + (newOutcomeData.metricChanges.trust || 0))),
      };
      setMetrics(newMetrics);

      // 3. Update history with the switched outcome
      const updatedHistory = [...history];
      updatedHistory[updatedHistory.length - 1] = {
        ...currentStep,
        selectedOptionId: newOptionId,
        customDecision: undefined,
        outcome: {
          ...newOutcomeData,
          alternative: currentStep.outcome.alternative // Keep original alternative or AI could regenerate
        },
        whatIfs: undefined // Clear what-ifs as we've pivoted
      };
      setHistory(updatedHistory);
    } catch (error) {
      console.error("Failed to switch path:", error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStartup(null);
    setHistory([]);
    setMetrics(INITIAL_METRICS);
    setReport(null);
    setView('welcome');
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-orange-100">
      <header className="border-b-4 border-black bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-10 h-10 bg-orange-500 border-4 border-black rounded-xl flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-none transition-all">
              <Rocket size={22} />
            </div>
            <span className="font-black text-xl uppercase tracking-tighter italic">starters path</span>
          </div>
          {view === 'simulation' && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest">
                <Zap size={14} className="text-yellow-400" />
                Level {history.length}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {view === 'welcome' && (
            <WelcomeView 
              onStart={() => setView('setup')} 
              onMultiplayer={() => setView('multiplayer')} 
              onVolunteerDashboard={() => setView('volunteer-dashboard')} 
            />
          )}
          {view === 'setup' && <SetupView onComplete={startSimulation} loading={loading} />}
          {view === 'simulation' && (
            <SimulationView 
              key={history.length}
              history={history} 
              metrics={metrics} 
              onSelect={handleDecision} 
              onNext={handleNextLevel}
              onWhatIf={handleWhatIf}
              onSwitchPath={handleSwitchPath}
              loading={loading} 
              whatIfLoading={whatIfLoading}
            />
          )}
          {view === 'report' && report && <ReportView report={report} onReset={reset} onSubmitForTesting={submitForTesting} />}
          {view === 'multiplayer' && <MultiplayerGame onBack={reset} />}
          {view === 'volunteer-dashboard' && <VolunteerDashboard prototypes={prototypes} onBack={reset} />}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showLevelUp && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-orange-500 border-8 border-black p-12 rounded-[3rem] shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] text-center">
              <motion.div 
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                <Trophy size={80} className="text-white mx-auto mb-4" />
              </motion.div>
              <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter">Level Up!</h2>
              <p className="text-white/80 font-black uppercase tracking-widest mt-2">Next Challenge Unlocked</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WelcomeView({ onStart, onMultiplayer, onVolunteerDashboard }: { 
  onStart: () => void, 
  onMultiplayer: () => void, 
  onVolunteerDashboard: () => void 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="max-w-3xl mx-auto text-center py-20 px-8 bg-white border-8 border-black rounded-[3rem] shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.05] -z-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 10px, transparent 10px, transparent 20px)' }} />
      
      <motion.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="inline-flex items-center gap-3 px-6 py-2 rounded-2xl border-4 border-black bg-orange-500 text-white text-sm font-black uppercase tracking-[0.2em] mb-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      >
        <Trophy size={20} />
        New Game Available
      </motion.div>

      <h1 className="text-7xl font-black tracking-tighter mb-8 leading-[0.9] uppercase italic">
        starters <br />
        <span className="text-orange-500 text-8xl block mt-2">path</span>
      </h1>

      <p className="text-xl text-gray-600 mb-12 font-bold max-w-xl mx-auto leading-relaxed">
        Master the art of the pivot. Navigate the chaos. Build your empire one decision at a time.
      </p>

      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <button 
            onClick={onStart}
            className="group relative inline-flex items-center gap-4 px-12 py-6 bg-black text-white rounded-3xl font-black text-2xl uppercase tracking-widest transition-all hover:bg-orange-500 hover:scale-105 active:scale-95 shadow-[12px_12px_0px_0px_rgba(249,115,22,0.3)]"
          >
            Solo Mode
            <ArrowRight className="transition-transform group-hover:translate-x-2" size={32} />
          </button>
          
          <button 
            onClick={onMultiplayer}
            className="group relative inline-flex items-center gap-4 px-12 py-6 bg-white text-black border-4 border-black rounded-3xl font-black text-2xl uppercase tracking-widest transition-all hover:bg-black hover:text-white hover:scale-105 active:scale-95 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
          >
            Multiplayer
            <Users className="transition-transform group-hover:rotate-12" size={32} />
          </button>
        </div>
        
        <button 
          onClick={onVolunteerDashboard}
          className="mt-4 group relative inline-flex items-center gap-3 px-8 py-4 bg-orange-100 text-orange-600 border-4 border-orange-500 rounded-3xl font-black text-lg uppercase tracking-widest transition-all hover:bg-orange-500 hover:text-white hover:scale-105 active:scale-95 shadow-[8px_8px_0px_0px_rgba(249,115,22,1)]"
        >
          Volunteer Dashboard
          <LayoutDashboard size={24} />
        </button>
        
        <div className="flex items-center gap-8 mt-8">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl border-4 border-black bg-blue-100 flex items-center justify-center mb-2">
              <Zap size={24} className="text-blue-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Fast AI</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl border-4 border-black bg-green-100 flex items-center justify-center mb-2">
              <Coins size={24} className="text-green-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Real Stats</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl border-4 border-black bg-purple-100 flex items-center justify-center mb-2">
              <Target size={24} className="text-purple-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Epic Goals</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SetupView({ onComplete, loading }: { onComplete: (info: StartupInfo) => void, loading: boolean }) {
  const [formData, setFormData] = useState<StartupInfo>({
    name: '',
    idea: '',
    stage: 'idea',
    targetUsers: '',
    budget: '',
    goals: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-2xl mx-auto bg-white border-8 border-black rounded-[3rem] p-12 shadow-[24px_24px_0px_0px_rgba(0,0,0,1)]"
    >
      <div className="mb-12">
        <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 italic">Character Setup</h2>
        <p className="text-gray-500 font-bold">Define your startup avatar to begin the quest.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-3">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
            <Rocket size={14} className="text-orange-500" />
            Startup Name
          </label>
          <input 
            required
            className="w-full px-6 py-4 rounded-2xl border-4 border-black bg-gray-50 font-bold text-lg focus:bg-white focus:ring-4 focus:ring-orange-200 outline-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            placeholder="EcoFlow, HealthSync..."
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-3">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
            <Lightbulb size={14} className="text-yellow-500" />
            The Big Idea
          </label>
          <textarea 
            required
            className="w-full px-6 py-4 rounded-2xl border-4 border-black bg-gray-50 font-bold text-lg focus:bg-white focus:ring-4 focus:ring-orange-200 outline-none transition-all min-h-[120px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            placeholder="What problem are you solving?"
            value={formData.idea}
            onChange={e => setFormData({ ...formData, idea: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
              <Map size={14} className="text-blue-500" />
              Current Stage
            </label>
            <select 
              className="w-full px-6 py-4 rounded-2xl border-4 border-black bg-gray-50 font-bold text-lg focus:bg-white outline-none transition-all appearance-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              value={formData.stage}
              onChange={e => setFormData({ ...formData, stage: e.target.value as StartupStage })}
            >
              <option value="idea">Idea Stage</option>
              <option value="prototype">Prototype Stage</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
              <Users size={14} className="text-purple-500" />
              Target Users
            </label>
            <input 
              required
              className="w-full px-6 py-4 rounded-2xl border-4 border-black bg-gray-50 font-bold text-lg focus:bg-white focus:ring-4 focus:ring-orange-200 outline-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              placeholder="Gen Z, SMBs..."
              value={formData.targetUsers}
              onChange={e => setFormData({ ...formData, targetUsers: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
              <Wallet size={14} className="text-green-500" />
              Budget
            </label>
            <input 
              required
              className="w-full px-6 py-4 rounded-2xl border-4 border-black bg-gray-50 font-bold text-lg focus:bg-white focus:ring-4 focus:ring-orange-200 outline-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              placeholder="$10k, Bootstrapped..."
              value={formData.budget}
              onChange={e => setFormData({ ...formData, budget: e.target.value })}
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
              <Target size={14} className="text-red-500" />
              Primary Goal
            </label>
            <input 
              required
              className="w-full px-6 py-4 rounded-2xl border-4 border-black bg-gray-50 font-bold text-lg focus:bg-white focus:ring-4 focus:ring-orange-200 outline-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              placeholder="100 users, MVP..."
              value={formData.goals}
              onChange={e => setFormData({ ...formData, goals: e.target.value })}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full py-6 bg-orange-500 text-white border-4 border-black rounded-3xl font-black text-2xl uppercase tracking-widest transition-all hover:bg-orange-600 hover:translate-y-[-4px] active:translate-y-[2px] disabled:opacity-50 flex items-center justify-center gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        >
          {loading ? <RefreshCcw className="animate-spin" size={32} /> : (
            <>
              Start Quest
              <ArrowRight size={32} />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}

function LevelMap({ currentStep, totalSteps, isFinal }: { currentStep: number, totalSteps: number, isFinal?: boolean }) {
  const steps = Array.from({ length: Math.max(totalSteps, currentStep + 1) });
  
  return (
    <div className="relative w-full py-12 px-4 bg-gray-50/50 rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      <div className="relative flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((_, i) => {
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          const isUpcoming = i > currentStep;
          
          return (
            <React.Fragment key={i}>
              <div className="relative flex flex-col items-center group">
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: isActive ? 1.3 : 1,
                    y: isActive ? [0, -5, 0] : 0
                  }}
                  transition={{ 
                    y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                  }}
                  className={cn(
                    "w-12 h-12 rounded-2xl border-4 border-black flex items-center justify-center font-black text-lg z-10 relative transition-colors duration-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    isCompleted ? "bg-green-400" : isActive ? "bg-orange-500 text-white" : "bg-white text-gray-300"
                  )}
                >
                  {isCompleted ? <CheckCircle2 size={24} /> : i + 1}
                  
                  {isActive && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute -top-12 bg-black text-white text-[10px] px-2 py-1 rounded font-black uppercase tracking-widest whitespace-nowrap"
                    >
                      You are here
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45" />
                    </motion.div>
                  )}
                </motion.div>
                
                <span className={cn(
                  "mt-4 text-[10px] font-black uppercase tracking-widest",
                  isActive ? "text-orange-600" : "text-gray-400"
                )}>
                  LVL {i + 1}
                </span>
              </div>
              
              {i < steps.length - 1 && (
                <div className="flex-1 h-2 mx-2 relative">
                  <div className="absolute inset-0 bg-gray-200 rounded-full border-2 border-black" />
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    className="absolute inset-0 bg-green-400 rounded-full border-2 border-black transition-all duration-1000"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
        
        {isFinal && (
          <div className="flex items-center gap-2 ml-4">
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="w-14 h-14 bg-yellow-400 border-4 border-black rounded-2xl flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <Trophy size={28} />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

function MentorCharacter({ reaction }: { reaction?: 'positive' | 'negative' | 'neutral' }) {
  return (
    <div className="relative flex flex-col items-center">
      <motion.div 
        animate={{ 
          y: [0, -15, 0],
        }}
        transition={{ 
          y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
        }}
        className="relative group"
      >
        {/* Floating Aura */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className={cn(
            "absolute inset-0 rounded-full blur-2xl -z-10",
            reaction === 'positive' ? 'bg-green-400' : reaction === 'negative' ? 'bg-red-400' : 'bg-blue-400'
          )}
        />

        {/* Robot Body */}
        <div className="w-32 h-32 bg-white border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center overflow-hidden relative">
          {/* Screen Face */}
          <div className={cn(
            "w-24 h-20 rounded-2xl border-4 border-black flex flex-col items-center justify-center transition-colors duration-500",
            reaction === 'positive' ? 'bg-green-50' : reaction === 'negative' ? 'bg-red-50' : 'bg-blue-50'
          )}>
            {/* Eyes */}
            <div className="flex gap-6 mb-2">
              <motion.div 
                animate={{ 
                  height: reaction === 'negative' ? [8, 2, 8] : [8, 8, 8],
                  scaleY: reaction === 'positive' ? 1.5 : 1
                }}
                className="w-3 h-8 bg-black rounded-full" 
              />
              <motion.div 
                animate={{ 
                  height: reaction === 'negative' ? [8, 2, 8] : [8, 8, 8],
                  scaleY: reaction === 'positive' ? 1.5 : 1
                }}
                className="w-3 h-8 bg-black rounded-full" 
              />
            </div>
            {/* Mouth */}
            <motion.div 
              animate={{ 
                width: reaction === 'positive' ? 24 : reaction === 'negative' ? 16 : 12,
                height: reaction === 'positive' ? 8 : reaction === 'negative' ? 2 : 4,
                borderRadius: reaction === 'positive' ? '0 0 20px 20px' : '4px'
              }}
              className="bg-black" 
            />
          </div>
          
          {/* Antenna */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-4 bg-black" />
          <motion.div 
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className={cn(
              "absolute -top-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full",
              reaction === 'positive' ? 'bg-green-500' : reaction === 'negative' ? 'bg-red-500' : 'bg-orange-500'
            )}
          />
        </div>
        
        {/* Floating Hands */}
        <motion.div 
          animate={{ y: [0, 10, 0], x: [-5, 0, -5] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute -left-8 top-1/2 w-6 h-6 bg-white border-4 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        />
        <motion.div 
          animate={{ y: [0, -10, 0], x: [5, 0, 5] }}
          transition={{ repeat: Infinity, duration: 2.8 }}
          className="absolute -right-8 top-1/2 w-6 h-6 bg-white border-4 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        />
      </motion.div>
      
      <div className="w-24 h-4 bg-black/10 rounded-full blur-md mt-12" />
    </div>
  );
}

function SimulationView({ history, metrics, onSelect, onNext, onWhatIf, onSwitchPath, loading, whatIfLoading }: { 
  history: SimulationStep[], 
  metrics: Metrics, 
  onSelect: (id: string | 'custom', customInput?: string) => void,
  onNext: () => void,
  onWhatIf: () => void,
  onSwitchPath: (id: string) => void,
  loading: boolean,
  whatIfLoading: boolean
}) {
  const currentStep = history[history.length - 1];
  const isWaitingForOutcome = !currentStep.selectedOptionId && !currentStep.customDecision;
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-8">
      <LevelMap 
        currentStep={history.length - 1} 
        totalSteps={history.length + (currentStep.decision.isFinal ? 0 : 1)} 
        isFinal={currentStep.decision.isFinal}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Stats Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black text-sm uppercase tracking-tighter mb-6 flex items-center gap-2">
              <BarChart3 size={18} />
              Founder Stats
            </h3>
            <div className="space-y-6">
              <MetricBar label="Impact" value={metrics.impact} icon={<Star size={14} />} color="bg-yellow-400" change={currentStep.outcome?.metricChanges.impact} />
              <MetricBar label="Cash" value={metrics.financials} icon={<Coins size={14} />} color="bg-green-400" change={currentStep.outcome?.metricChanges.financials} />
              <MetricBar label="Risk" value={metrics.risk} icon={<Shield size={14} />} color="bg-red-400" change={currentStep.outcome?.metricChanges.risk} inverse />
              <MetricBar label="Trust" value={metrics.trust} icon={<Heart size={14} />} color="bg-pink-400" change={currentStep.outcome?.metricChanges.trust} />
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="lg:col-span-3 space-y-8">
          <AnimatePresence mode="wait">
            {loading && isWaitingForOutcome ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center justify-center py-20 space-y-6"
              >
                <MentorCharacter />
                <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-t-4 border-l-4 border-black rotate-45" />
                  <p className="font-bold text-lg animate-pulse">Calculating the next challenge...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key={currentStep.decision.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Character & Speech Bubble */}
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <MentorCharacter reaction={currentStep.outcome?.stakeholders[0]?.reaction} />
                  
                  <div className="flex-1 bg-white border-4 border-black p-8 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative">
                    <div className="hidden md:block absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 bg-white border-l-4 border-b-4 border-black rotate-45" />
                    <div className="md:hidden absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border-t-4 border-l-4 border-black rotate-45" />
                    
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-2 block">Level {history.length}: {currentStep.decision.title}</span>
                    <h2 className="text-2xl font-black mb-4 leading-tight">{currentStep.decision.context}</h2>
                    
                    {!isWaitingForOutcome && currentStep.outcome && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 pt-6 border-t-2 border-dashed border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                              currentStep.outcome.successRate >= 80 ? "bg-green-400" : 
                              currentStep.outcome.successRate >= 50 ? "bg-yellow-400" : "bg-red-400"
                            )}>
                              Success Rate: {currentStep.outcome.successRate}%
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600 font-medium leading-relaxed">{currentStep.outcome.insight}</p>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  {isWaitingForOutcome ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {showCustom ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="md:col-span-2 bg-white border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-black text-xl uppercase tracking-tighter italic">Your Custom Strategy</h3>
                            <button onClick={() => setShowCustom(false)} className="text-gray-400 hover:text-black">Cancel</button>
                          </div>
                          <textarea 
                            autoFocus
                            className="w-full p-6 rounded-2xl border-4 border-black bg-gray-50 font-bold text-lg focus:bg-white outline-none min-h-[150px] transition-all"
                            placeholder="Describe your unique approach..."
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                          />
                          <button 
                            disabled={!customInput.trim() || loading}
                            onClick={() => onSelect('custom', customInput)}
                            className="w-full py-4 bg-orange-500 text-white border-4 border-black rounded-2xl font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            Execute Strategy
                            <Zap size={20} />
                          </button>
                        </motion.div>
                      ) : (
                        <>
                          {currentStep.decision.options.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => onSelect(option.id)}
                              className="group text-left p-6 rounded-2xl border-4 border-black bg-white hover:bg-orange-500 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                            >
                              <h4 className="font-black text-lg mb-1">{option.label}</h4>
                              <p className="text-sm opacity-70 font-medium">{option.description}</p>
                            </button>
                          ))}
                          <button 
                            onClick={() => setShowCustom(true)}
                            className="md:col-span-2 py-4 border-4 border-dashed border-black rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus size={20} />
                            Custom Strategy
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {currentStep.outcome?.stakeholders.map((s, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-black text-xs uppercase">{s.name}</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                s.reaction === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              )}>{s.reaction}</span>
                            </div>
                            <p className="text-xs text-gray-500 italic">"{s.comment}"</p>
                          </motion.div>
                        ))}
                      </div>

                      <div className="flex flex-col md:flex-row gap-4">
                        <button 
                          onClick={onWhatIf}
                          disabled={whatIfLoading}
                          className="flex-1 py-4 bg-blue-500 text-white border-4 border-black rounded-2xl font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] flex items-center justify-center gap-2"
                        >
                          {whatIfLoading ? <RefreshCcw className="animate-spin" /> : <Eye size={20} />}
                          What If?
                        </button>
                        <button 
                          onClick={onNext}
                          disabled={loading}
                          className="flex-1 py-4 bg-orange-500 text-white border-4 border-black rounded-2xl font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] flex items-center justify-center gap-2"
                        >
                          {loading ? <RefreshCcw className="animate-spin" /> : (
                            <>
                              {currentStep.decision.isFinal ? 'Finish Simulation' : 'Next Level'}
                              <ArrowRight size={20} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* What If Analysis */}
                {currentStep.whatIfs && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black text-white p-8 rounded-3xl space-y-6"
                  >
                    <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
                      <Eye size={24} className="text-blue-400" />
                      Alternative Realities
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(currentStep.whatIfs)
                        .filter(([id]) => id !== currentStep.selectedOptionId)
                        .map(([id, outcome]) => {
                          const isBetter = outcome.successRate > (currentStep.outcome?.successRate || 0);
                          return (
                            <div key={id} className={cn(
                              "p-6 rounded-2xl border-2 transition-all",
                              isBetter ? "border-green-500/50 bg-green-500/5" : "border-white/10 bg-white/5"
                            )}>
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-black text-lg text-blue-400">
                                      {currentStep.decision.options.find(o => o.id === id)?.label}
                                    </h4>
                                    {isBetter && (
                                      <span className="px-2 py-0.5 bg-green-500 text-black text-[8px] font-black uppercase rounded">Better Choice</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Success Rate: {outcome.successRate}%
                                  </div>
                                </div>
                                <button 
                                  onClick={() => onSwitchPath(id)}
                                  className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
                                >
                                  Switch Path
                                </button>
                              </div>
                              <p className="text-sm text-gray-400 mb-4">{outcome.insight}</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(outcome.metricChanges).map(([metric, change]) => (
                                  <div key={metric} className={cn(
                                    "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                    (change as number) > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                  )}>
                                    {metric} {change as number > 0 ? '+' : ''}{change}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function MetricBar({ label, value, icon, color, change, inverse }: { 
  label: string, 
  value: number, 
  icon: React.ReactNode, 
  color: string,
  change?: number,
  inverse?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
          <div className={cn("p-1.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]", color.replace('bg-', 'text-').replace('400', '500'))}>
            {icon}
          </div>
          {label}
        </div>
        <div className="flex items-center gap-2">
          {change !== undefined && change !== 0 && (
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded border-2 border-black",
                ((change > 0 && !inverse) || (change < 0 && inverse)) ? "bg-green-400" : "bg-red-400"
              )}
            >
              {change > 0 ? '+' : ''}{change}
            </motion.span>
          )}
          <span className="text-sm font-black">{value}%</span>
        </div>
      </div>
      <div className="h-4 w-full bg-gray-100 rounded-lg border-2 border-black overflow-hidden p-0.5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={cn("h-full rounded-sm transition-all duration-500 shadow-inner", color)}
        />
      </div>
    </div>
  );
}

function ReportView({ report, onReset, onSubmitForTesting }: { report: FinalReport, onReset: () => void, onSubmitForTesting: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-12"
    >
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Impact', value: report.scores.impact, icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Financials', value: report.scores.financials, icon: Coins, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Risk', value: report.scores.risk, icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Trust', value: report.scores.trust, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center group hover:-translate-y-1 transition-all"
          >
            <div className={cn("w-12 h-12 mx-auto rounded-xl border-4 border-black flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", stat.bg)}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
            <p className="text-4xl font-black">{stat.value}%</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white border-8 border-black rounded-[3rem] p-12 shadow-[24px_24px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 pb-8 border-b-4 border-dashed border-gray-100">
          <div>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-2">Quest Complete</h2>
            <p className="text-gray-500 font-bold text-lg">Your startup journey results are in.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onSubmitForTesting}
              className="flex items-center gap-3 px-8 py-4 bg-orange-500 text-white rounded-3xl font-black text-lg uppercase tracking-widest transition-all hover:bg-black hover:scale-105 active:scale-95 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]"
            >
              Submit for Testing
              <Boxes size={24} />
            </button>
            <button 
              onClick={onReset}
              className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-3xl font-black text-lg uppercase tracking-widest transition-all hover:bg-orange-500 hover:scale-105 active:scale-95 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]"
            >
              New Journey
              <RefreshCcw size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border-4 border-black rounded-3xl p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black text-2xl uppercase tracking-tighter mb-6 flex items-center gap-3">
              <FileText className="text-orange-500" size={28} />
              Executive Summary
            </h3>
            <div className="prose prose-orange max-w-none text-gray-600 font-medium leading-relaxed">
              <ReactMarkdown>{report.summary}</ReactMarkdown>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border-4 border-black rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(34,197,94,0.2)]">
              <h4 className="font-black text-xl text-green-600 mb-6 uppercase tracking-widest flex items-center gap-2">
                <Star size={20} />
                Strengths
              </h4>
              <ul className="space-y-4">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm font-bold text-gray-600">
                    <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center text-green-600 shrink-0">✓</div>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border-4 border-black rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(239,68,68,0.2)]">
              <h4 className="font-black text-xl text-red-600 mb-6 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert size={20} />
                Weaknesses
              </h4>
              <ul className="space-y-4">
                {report.weaknesses.map((w, i) => (
                  <li key={i} className="flex gap-3 text-sm font-bold text-gray-600">
                    <div className="w-5 h-5 rounded bg-red-100 flex items-center justify-center text-red-600 shrink-0">!</div>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-black text-white rounded-[3rem] p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.2)] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <h3 className="font-black text-3xl uppercase tracking-tighter mb-12 flex items-center gap-4 relative">
              <Map className="text-orange-500" size={32} />
              The Roadmap
            </h3>
            <div className="space-y-12 relative">
              <div className="absolute left-6 top-4 bottom-4 w-1 bg-white/20 rounded-full" />
              {report.roadmap.map((item, i) => (
                <div key={i} className="relative pl-16">
                  <div className="absolute left-0 top-0 w-12 h-12 rounded-2xl border-4 border-white bg-orange-500 flex items-center justify-center font-black text-xl shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
                    {i + 1}
                  </div>
                  <h5 className="font-black text-orange-400 mb-2 uppercase tracking-[0.2em] text-xs">{item.step}</h5>
                  <p className="text-gray-300 font-medium text-lg leading-relaxed">{item.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border-8 border-black rounded-[3rem] p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] sticky top-24">
            <h3 className="font-black text-xl uppercase tracking-tighter mb-8 flex items-center gap-3">
              <BarChart3 size={24} className="text-orange-500" />
              Final Stats
            </h3>
            <div className="space-y-8">
              <MetricBar label="Impact" value={report.scores.impact} icon={<Star size={16} />} color="bg-yellow-400" />
              <MetricBar label="Cash" value={report.scores.financials} icon={<Coins size={16} />} color="bg-green-400" />
              <MetricBar label="Risk" value={report.scores.risk} icon={<Shield size={16} />} color="bg-red-400" inverse />
              <MetricBar label="Trust" value={report.scores.trust} icon={<Heart size={16} />} color="bg-pink-400" />
            </div>
            
            <button 
              onClick={onReset}
              className="w-full mt-12 py-6 bg-black text-white border-4 border-black rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-orange-500 hover:translate-y-[-4px] active:translate-y-[2px] flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <RefreshCcw size={20} />
              New Quest
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const PrototypeCard = ({ type, title, problem, description, initialAccepted = false }: Prototype) => {
  const [accepted, setAccepted] = useState(initialAccepted);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col relative overflow-hidden bg-white border-4 border-black rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] group shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
    >
      <div className="relative z-10 flex-grow flex flex-col">
        <div className="self-start mb-6">
          <span className="inline-block px-4 py-1.5 text-[10px] font-black tracking-widest rounded-xl bg-orange-500 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {type}
          </span>
        </div>

        <h3 className="text-2xl font-black text-black mb-4 leading-tight">
          {title}
        </h3>

        <div className="bg-gray-100 border-2 border-black rounded-xl p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1.5">
            Testing Target
          </p>
          <p className="text-sm font-bold text-black">
            {problem}
          </p>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed mb-8 flex-grow font-bold">
          {description}
        </p>

        <button
          onClick={() => setAccepted(true)}
          disabled={accepted}
          className={cn(
            "relative w-full py-4 px-6 rounded-2xl font-black tracking-widest uppercase text-xs transition-all duration-300 transform active:scale-[0.98] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
            accepted
              ? 'bg-green-100 text-green-600 cursor-default shadow-none translate-x-[2px] translate-y-[2px]'
              : 'bg-orange-500 text-white hover:bg-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
          )}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {accepted ? (
              <>
                <FileCheck className="w-5 h-5" />
                Active Tester
              </>
            ) : (
              'Accept & Begin Testing'
            )}
          </span>
        </button>
      </div>
    </motion.div>
  );
};

function VolunteerDashboard({ prototypes, onBack }: { prototypes: Prototype[], onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-6xl mx-auto"
    >
      <header className="flex justify-between items-end mb-16">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500 text-white border-2 border-black rounded-xl text-xs font-black uppercase tracking-widest mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <LayoutDashboard size={14} />
            Testing Hub
          </div>
          <h1 className="text-6xl font-black text-black tracking-tighter uppercase italic mb-4">
            Volunteer Dashboard
          </h1>
          <p className="text-xl text-gray-500 font-bold max-w-xl">
            Hardware & Software ready for localized field validation across communities.
          </p>
        </div>
        <button 
          onClick={onBack}
          className="px-8 py-4 bg-black text-white rounded-3xl font-black text-lg uppercase tracking-widest transition-all hover:bg-orange-500 hover:scale-105 active:scale-95 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]"
        >
          Back
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {prototypes.map((p) => (
          <PrototypeCard key={p.id} {...p} />
        ))}
      </div>
    </motion.div>
  );
}
