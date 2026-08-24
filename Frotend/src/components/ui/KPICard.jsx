import { useEffect, useState } from 'react';

export function KPICard({
  label,
  value = 0,
  icon: Icon,
  change,
  changeType = 'up',
  sparkline,
  colorClass = 'teal',
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  const changeColor = changeType === 'up' ? 'text-[var(--accent-cyan)]' : 'text-[var(--accent-red)]';
  const changeBg = changeType === 'up' ? 'bg-[var(--accent-cyan)]/10' : 'bg-[var(--accent-red)]/10';

  const colorMap = {
    teal: {
      iconBg: 'bg-teal-50 dark:bg-teal-900/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
    blue: {
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    red: {
      iconBg: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-500 dark:text-red-400',
    },
    amber: {
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  };

  const selectedColor = colorMap[colorClass] || colorMap.teal;

  return (
    <div className="card p-5 transition-all duration-200 hover:shadow-md cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <span className="section-label">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${selectedColor.iconBg} flex items-center justify-center`}>
          {Icon && <Icon className={`w-4 h-4 ${selectedColor.iconColor}`} />}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="data-number">{displayValue.toLocaleString()}</span>
        {change !== undefined && change !== null && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${changeColor} ${changeBg}`}>
            {changeType === 'up' ? '↑' : '↓'} {change}%
          </span>
        )}
      </div>

      {sparkline && sparkline.length > 0 && (
        <div className="flex items-end gap-0.5 h-6 mt-3">
          {sparkline.map((val, idx) => {
            const max = Math.max(...sparkline);
            return (
              <div
                key={idx}
                className="flex-1 rounded-sm bg-teal-500/60 dark:bg-teal-400/60"
                style={{ height: `${(val / max) * 100}%`, minHeight: 3 }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}