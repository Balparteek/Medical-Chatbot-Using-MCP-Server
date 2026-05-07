import { Wifi, WifiOff, Loader2, MapPin, MapPinOff, Navigation } from 'lucide-react';
import type { LocationStatus } from '../hooks/useLocation';
import type { LocationData } from '../lib/types';

interface Props {
  status: 'online' | 'offline' | 'checking';
  locationStatus: LocationStatus;
  location: LocationData | null;
  onRequestLocation: () => void;
}

export default function StatusBar({ status, locationStatus, location, onRequestLocation }: Props) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Backend status */}
      <div className="flex items-center gap-1.5">
        {status === 'checking' && (
          <><Loader2 size={12} className="text-slate-400 animate-spin" /><span className="text-slate-400">Connecting...</span></>
        )}
        {status === 'online' && (
          <><Wifi size={12} className="text-emerald-500" /><span className="text-emerald-600 font-medium">Backend connected</span></>
        )}
        {status === 'offline' && (
          <><WifiOff size={12} className="text-amber-500" /><span className="text-amber-600">Backend offline</span></>
        )}
      </div>

      <span className="text-slate-300">|</span>

      {/* Location status */}
      {locationStatus === 'idle' && (
        <button
          onClick={onRequestLocation}
          className="flex items-center gap-1.5 text-slate-400 hover:text-teal-600 transition-colors group"
          title="Enable location for nearby hospitals & helplines"
        >
          <Navigation size={12} className="group-hover:text-teal-500" />
          <span>Enable location</span>
        </button>
      )}

      {locationStatus === 'requesting' && (
        <div className="flex items-center gap-1.5 text-slate-400">
          <Loader2 size={12} className="animate-spin" />
          <span>Getting location...</span>
        </div>
      )}

      {locationStatus === 'granted' && location && (
        <div
          className="flex items-center gap-1.5 text-teal-600 cursor-pointer hover:text-teal-700 transition-colors"
          title={`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
          onClick={onRequestLocation}
        >
          <MapPin size={12} className="flex-shrink-0" />
          <span className="max-w-[180px] truncate font-medium">{location.displayName}</span>
        </div>
      )}

      {(locationStatus === 'denied' || locationStatus === 'error') && (
        <button
          onClick={onRequestLocation}
          className="flex items-center gap-1.5 text-amber-500 hover:text-amber-600 transition-colors"
          title="Location unavailable — click to retry"
        >
          <MapPinOff size={12} />
          <span>Location unavailable</span>
        </button>
      )}
    </div>
  );
}
