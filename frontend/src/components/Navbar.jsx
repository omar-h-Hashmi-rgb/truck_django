import { ClipboardList, Plus, ArrowLeft } from 'lucide-react';

export default function Navbar({ activeTab, onTabChange, onBackToLanding }) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#02040a]/80 backdrop-blur-md" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="p-2 -ml-2 rounded-none hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:scale-[0.97]"
              aria-label="Back to landing page"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="text-sm font-bold uppercase tracking-widest">ELD Trip Planner</span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1" role="tablist" aria-label="Main navigation">
          <TabBtn
            active={activeTab === 'new'}
            onClick={() => onTabChange('new')}
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            label="New Trip"
          />
          <TabBtn
            active={activeTab === 'saved'}
            onClick={() => onTabChange('saved')}
            icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
            label="Saved Trips"
          />
        </div>
      </div>
    </nav>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-none text-xs font-bold uppercase tracking-widest transition-colors min-h-[44px] cursor-pointer active:scale-[0.97] ${
        active
          ? 'bg-white text-[#02040a]'
          : 'text-slate-400 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
