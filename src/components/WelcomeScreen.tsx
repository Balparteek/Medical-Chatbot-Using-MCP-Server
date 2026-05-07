import { Stethoscope, Heart, Brain, Pill, MapPin, Navigation, Building2 } from 'lucide-react';
import type { LocationData } from '../lib/types';
import type { LocationStatus } from '../hooks/useLocation';

const suggestions = [
  { icon: Heart,       text: 'What are the symptoms of a heart attack?',    color: 'text-rose-500'   },
  { icon: Brain,       text: 'How to manage stress and anxiety?',            color: 'text-amber-500'  },
  { icon: Pill,        text: 'What are common side effects of ibuprofen?',   color: 'text-teal-500'   },
  { icon: Stethoscope, text: 'When should I see a doctor for a headache?',   color: 'text-sky-500'    },
];

interface Props {
  onSuggestionClick: (text: string) => void;
  location: LocationData | null;
  locationStatus: LocationStatus;
  onRequestLocation: () => void;
}

export default function WelcomeScreen({
  onSuggestionClick,
  location,
  locationStatus,
  onRequestLocation,
}: Props) {
  function handleNearbyHospitals() {
    if (location?.displayName) {
      onSuggestionClick(
        `Find nearby hospitals and emergency services near ${location.displayName}. Also provide relevant emergency helpline numbers for ${location.country || location.displayName}.`
      );
    }
  }

  function handleHelplines() {
    if (location?.displayName) {
      onSuggestionClick(
        `What are the medical emergency helpline numbers in ${location.state ? location.state + ', ' : ''}${location.country || location.displayName}? Include ambulance, poison control, mental health crisis lines, and any other relevant numbers.`
      );
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-10 text-center">
        {/* Icon + heading */}
        <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
          <Stethoscope size={32} className="text-teal-600" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">How can I help you today?</h2>
        <p className="text-slate-500 text-sm mb-8">
          Ask me about symptoms, medications, general wellness, or any health-related questions.
        </p>

        {/* Location-aware emergency panel */}
        {locationStatus === 'granted' && location ? (
          <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-left">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={14} className="text-rose-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">
                Location-aware emergency tools
              </span>
            </div>
            <p className="text-xs text-rose-600 mb-3">
              Your location: <span className="font-semibold">{location.displayName}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleNearbyHospitals}
                className="flex items-center gap-2 rounded-xl bg-white border border-rose-200 px-3 py-2.5 text-left hover:border-rose-400 hover:shadow-sm transition-all group"
              >
                <Building2 size={15} className="text-rose-500 flex-shrink-0" />
                <span className="text-xs text-slate-700 group-hover:text-slate-900 font-medium">
                  Nearby hospitals
                </span>
              </button>
              <button
                onClick={handleHelplines}
                className="flex items-center gap-2 rounded-xl bg-white border border-rose-200 px-3 py-2.5 text-left hover:border-rose-400 hover:shadow-sm transition-all group"
              >
                <span className="text-rose-500 text-base leading-none flex-shrink-0">📞</span>
                <span className="text-xs text-slate-700 group-hover:text-slate-900 font-medium">
                  Emergency helplines
                </span>
              </button>
            </div>
          </div>
        ) : locationStatus === 'idle' || locationStatus === 'denied' ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                <Navigation size={16} className="text-teal-500" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">
                  {locationStatus === 'denied' ? 'Location access denied' : 'Enable location access'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Get nearby hospitals & local emergency helplines
                </p>
              </div>
              <button
                onClick={onRequestLocation}
                className="flex-shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors"
              >
                {locationStatus === 'denied' ? 'Retry' : 'Allow'}
              </button>
            </div>
          </div>
        ) : locationStatus === 'requesting' ? (
          <div className="mb-6 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-700 flex items-center gap-2">
            <span className="animate-spin text-base">⌛</span>
            Detecting your location…
          </div>
        ) : null}

        {/* Suggestion cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map(({ icon: Icon, text, color }) => (
            <button
              key={text}
              onClick={() => onSuggestionClick(text)}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-teal-300 hover:shadow-md transition-all group"
            >
              <Icon size={18} className={`${color} mt-0.5 flex-shrink-0`} />
              <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                {text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
