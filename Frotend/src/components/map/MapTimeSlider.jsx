import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';

export default function MapTimeSlider({ onTimeChange }) {
  const [monthIndex, setMonthIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  const { data: trendData, isLoading } = useQuery({
    queryKey: ['map-time-months'],
    queryFn: () => api.getMDRTrend(24),
  });

  const months = (trendData || [])
    .map(item => {
      const [year, monthNum] = item.month.split('-');
      return new Date(Number(year), Number(monthNum) - 1, 1)
        .toLocaleString('en-US', { month: 'short', year: 'numeric' });
    })
    .filter((label, idx, arr) => arr.indexOf(label) === idx);

  const totalMonths = months.length;

  useEffect(() => {
    if (totalMonths > 0 && monthIndex >= totalMonths) {
      setMonthIndex(totalMonths - 1);
      onTimeChange?.(totalMonths - 1);
    }
  }, [totalMonths, monthIndex, onTimeChange]);

  useEffect(() => {
    if (playing && totalMonths > 1) {
      intervalRef.current = setInterval(() => {
        setMonthIndex(prev => {
          const next = (prev + 1) % totalMonths;
          onTimeChange?.(next);
          return next;
        });
      }, 800);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [playing, totalMonths, onTimeChange]);

  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setMonthIndex(value);
    onTimeChange?.(value);
  };

  const handleSkipBack = () => {
    if (totalMonths === 0) return;
    setMonthIndex(0);
    onTimeChange?.(0);
    setPlaying(false);
  };

  const handleSkipForward = () => {
    if (totalMonths === 0) return;
    setMonthIndex(totalMonths - 1);
    onTimeChange?.(totalMonths - 1);
    setPlaying(false);
  };

  return (
    <div className="card p-3 flex items-center gap-3">
      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />

      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-cyan)]" />
      ) : totalMonths === 0 ? (
        <span className="text-xs text-[var(--text-muted)]">No time data available</span>
      ) : (
        <>
          <button
            onClick={handleSkipBack}
            className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
            aria-label="Skip to start"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setPlaying(prev => !prev)}
            className={`p-1.5 rounded-md transition-colors ${
              playing
                ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}
            aria-label={playing ? 'Pause animation' : 'Play animation'}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleSkipForward}
            className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
            aria-label="Skip to end"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min={0}
            max={totalMonths - 1}
            value={monthIndex}
            onChange={handleSliderChange}
            className="flex-1 h-1.5 rounded-full appearance-none bg-[var(--bg-tertiary)] cursor-pointer accent-teal-600"
          />

          <span className="text-[11px] font-medium text-[var(--text-secondary)] min-w-[75px] text-right tabular-nums">
            {months[monthIndex]}
          </span>
        </>
      )}
    </div>
  );
}