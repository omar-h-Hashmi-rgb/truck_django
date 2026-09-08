import { useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

export default function TripForm({ onTripPlanned, isLoading }) {
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_hours: 0,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'current_cycle_hours' ? parseFloat(value) || 0 : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (!value.trim() && name !== 'current_cycle_hours') {
      setErrors((prev) => ({ ...prev, [name]: `${name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} is required` }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.current_location.trim()) errs.current_location = 'Current location is required';
    if (!formData.pickup_location.trim()) errs.pickup_location = 'Pickup location is required';
    if (!formData.dropoff_location.trim()) errs.dropoff_location = 'Dropoff location is required';
    const cycle = parseFloat(formData.current_cycle_hours);
    if (isNaN(cycle) || cycle < 0 || cycle > 70) errs.current_cycle_hours = 'Must be between 0 and 70';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    onTripPlanned({
      ...formData,
      current_cycle_hours: Math.max(0, Math.min(70, parseFloat(formData.current_cycle_hours) || 0)),
    });
  };

  return (
    <div className="border border-white/5 bg-[#090d16]/50 p-8 no-print">
      <h2 className="mb-6 text-lg font-bold uppercase tracking-tight text-white flex items-center gap-2">
        <MapPin className="h-5 w-5 text-sky-400" aria-hidden="true" />
        Plan Your Trip
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-label="Trip planning form">
        <Field
          label="Current Location"
          name="current_location"
          value={formData.current_location}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. Dallas, TX"
          icon={<NavIcon />}
          error={errors.current_location}
          required
          autoComplete="address-line1"
        />
        <Field
          label="Pickup Location"
          name="pickup_location"
          value={formData.pickup_location}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. Houston, TX"
          icon={<PickupIcon />}
          error={errors.pickup_location}
          required
          autoComplete="address-line1"
        />
        <Field
          label="Dropoff Location"
          name="dropoff_location"
          value={formData.dropoff_location}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. Chicago, IL"
          icon={<DropIcon />}
          error={errors.dropoff_location}
          required
          autoComplete="address-line1"
        />

        <div>
          <label htmlFor="current_cycle_hours" className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Current Cycle Hours Used
          </label>
          <div className="relative">
            <input
              type="number"
              id="current_cycle_hours"
              name="current_cycle_hours"
              value={formData.current_cycle_hours}
              onChange={handleChange}
              min="0"
              max="70"
              step="0.5"
              aria-describedby={errors.current_cycle_hours ? 'cycle-error' : 'cycle-helper'}
              aria-invalid={!!errors.current_cycle_hours}
              className={`w-full px-4 py-3 border bg-white/5 text-white rounded-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:border-transparent outline-none transition-all text-base min-h-[44px] ${
                errors.current_cycle_hours ? 'border-red-500/50' : 'border-white/10'
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5" aria-hidden="true">
              <span className="text-xs text-slate-500">/ 70h</span>
              <div className="w-16 h-1.5 bg-white/10 rounded-none overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all"
                  style={{ width: `${Math.min(((formData.current_cycle_hours || 0) / 70) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          {errors.current_cycle_hours ? (
            <p id="cycle-error" className="text-xs text-red-400 mt-2 flex items-center gap-1" role="alert">
              <AlertCircle className="h-3 w-3" />
              {errors.current_cycle_hours}
            </p>
          ) : (
            <p id="cycle-helper" className="text-xs text-slate-500 mt-2">
              Hours used in your current 70-hour / 8-day cycle
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-sky-400 text-[#02040a] py-3 px-4 rounded-none text-xs font-bold uppercase tracking-widest transition-colors duration-300 hover:bg-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] cursor-pointer active:scale-[0.98]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Planning Route...
            </>
          ) : (
            <>
              <MapPin className="h-5 w-5" aria-hidden="true" />
              Plan Trip
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, value, onChange, onBlur, placeholder, icon, error, required, autoComplete }) {
  const fieldId = `field-${name}`;
  const errorId = `error-${name}`;
  return (
    <div>
      <label htmlFor={fieldId} className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
        {label}
        {required && <span className="text-sky-400 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">
          {icon}
        </span>
        <input
          type="text"
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-full pl-10 pr-4 py-3 border bg-white/5 text-white placeholder:text-slate-600 rounded-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:border-transparent outline-none transition-all text-base min-h-[44px] ${
            error ? 'border-red-500/50' : 'border-white/10'
          }`}
        />
      </div>
      {error && (
        <p id={errorId} className="text-xs text-red-400 mt-2 flex items-center gap-1" role="alert">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function NavIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>;
}
function PickupIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function DropIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>;
}
