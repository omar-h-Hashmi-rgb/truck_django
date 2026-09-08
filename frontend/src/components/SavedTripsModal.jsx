import { useState, useEffect, useRef } from 'react';
import { X, Clock, Eye, MapPin, Route, Loader2 } from 'lucide-react';
import { getTrips, getTrip } from '../services/api';

export default function SavedTripsModal({ isOpen, onClose, onSelectTrip }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTripId, setLoadingTripId] = useState(null);
  const [error, setError] = useState(null);
  const overlayRef = useRef(null);
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      fetchTrips();
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const modal = overlayRef.current;
    if (!modal) return;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableEls = modal.querySelectorAll(focusableSelector);
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) { if (document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); } }
      else { if (document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); } }
    };
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };

    document.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTrips();
      setTrips(response.data);
    } catch (err) {
      setError('Failed to load trips');
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrip = async (trip) => {
    setLoadingTripId(trip.id);
    try {
      const response = await getTrip(trip.id);
      onSelectTrip(response.data);
      onClose();
    } catch (err) {
      console.error('Error loading trip details:', err);
      setError('Failed to load trip details');
    } finally {
      setLoadingTripId(null);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Saved trips"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="bg-[#090d16] border border-white/10 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Saved Trips</h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-none transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-400 border-t-transparent mx-auto" />
              <p className="mt-3 text-xs text-slate-500 uppercase tracking-widest">Loading trips...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12" role="alert">
              <p className="text-sm text-red-400 mb-2">{error}</p>
              <button onClick={fetchTrips} className="text-xs text-sky-400 hover:underline min-h-[44px] px-4 py-2 cursor-pointer uppercase tracking-widest">
                Try again
              </button>
            </div>
          )}

          {!loading && !error && trips.length === 0 && (
            <div className="text-center py-12">
              <Route className="h-10 w-10 mx-auto mb-3 text-slate-600" aria-hidden="true" />
              <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">No saved trips yet</p>
              <p className="text-xs text-slate-600 mt-1">Plan a trip to get started</p>
            </div>
          )}

          {!loading && !error && trips.length > 0 && (
            <div className="space-y-2">
              {trips.map((trip, i) => {
                const isLoadingThis = loadingTripId === trip.id;
                return (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip)}
                    disabled={loadingTripId !== null}
                    className="w-full text-left border border-white/5 bg-white/[0.02] p-4 hover:border-sky-400/30 transition-all group cursor-pointer animate-in slide-up rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-green-400 shrink-0" aria-hidden="true" />
                          <span className="text-white font-medium truncate" title={trip.current_location}>
                            {trip.current_location}
                          </span>
                          <span className="text-slate-600" aria-hidden="true">&rarr;</span>
                          <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" aria-hidden="true" />
                          <span className="text-white font-medium truncate" title={trip.dropoff_location}>
                            {trip.dropoff_location}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                          <span>Pickup: {trip.pickup_location}</span>
                          {trip.trip_summary?.total_miles && <span>{trip.trip_summary.total_miles} mi</span>}
                          {trip.trip_summary?.total_driving_hours && <span>{trip.trip_summary.total_driving_hours}h</span>}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1">
                          {new Date(trip.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 p-2 text-sky-400">
                        {isLoadingThis ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
