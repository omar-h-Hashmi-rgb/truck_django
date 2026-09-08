import { useState, useEffect, useRef } from 'react';
import LandingPage from './components/LandingPage';
import Navbar from './components/Navbar';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import DailyLogSheet from './components/DailyLogSheet';
import TripTimeline from './components/TripTimeline';
import SavedTripsModal from './components/SavedTripsModal';
import { planTrip } from './services/api';

function App() {
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'landing';
  });
  const mainRef = useRef(null);
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'new';
  });
  const [tripData, setTripData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSavedModal, setShowSavedModal] = useState(false);

  const handleEnterApp = () => {
    setView('app');
    const url = new URL(window.location);
    url.searchParams.set('view', 'app');
    window.history.pushState({}, '', url);
  };

  const handleBackToLanding = () => {
    setView('landing');
    const url = new URL(window.location);
    url.searchParams.delete('view');
    url.searchParams.delete('tab');
    window.history.pushState({}, '', url);
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setView(params.get('view') || 'landing');
      setActiveTab(params.get('tab') || 'new');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location);
    url.searchParams.set('view', 'app');
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
    if (tab === 'saved') setShowSavedModal(true);
    mainRef.current?.focus();
  };

  const handleTripPlanned = async (formData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await planTrip(formData);
      setTripData({
        ...formData,
        ...response.data,
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to plan trip. Please try again.';
      setError(msg);
      console.error('Trip planning error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTrip = (trip) => {
    setTripData(trip);
    setActiveTab('new');
    const url = new URL(window.location);
    url.searchParams.set('view', 'app');
    url.searchParams.set('tab', 'new');
    window.history.pushState({}, '', url);
  };

  if (view === 'landing') {
    return <LandingPage onEnterApp={handleEnterApp} />;
  }

  return (
    <div className="min-h-dvh bg-[#02040a] text-slate-50 antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:bg-sky-400 focus:text-[#02040a] focus:px-4 focus:py-2 focus:rounded-none focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div className="no-print">
        <Navbar activeTab={activeTab} onTabChange={handleTabChange} onBackToLanding={handleBackToLanding} />
      </div>

      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 outline-none"
      >
        {error && (
          <div
            className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2 no-print animate-in fade-in"
            role="alert"
            aria-live="polite"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <TripForm onTripPlanned={handleTripPlanned} isLoading={isLoading} />
            {tripData && tripData.timeline_events && (
              <TripTimeline tripData={tripData} />
            )}
          </div>

          <div className="lg:col-span-8 space-y-8">
            <RouteMap tripData={tripData} />
            {tripData && tripData.hos_daily_logs && (
              <DailyLogSheet
                dailyLogs={tripData.hos_daily_logs}
                timelineEvents={tripData.timeline_events}
                tripData={tripData}
              />
            )}
          </div>
        </div>
      </main>

      <div className="no-print">
        <SavedTripsModal
          isOpen={showSavedModal}
          onClose={() => setShowSavedModal(false)}
          onSelectTrip={handleSelectTrip}
        />
      </div>
    </div>
  );
}

export default App;
