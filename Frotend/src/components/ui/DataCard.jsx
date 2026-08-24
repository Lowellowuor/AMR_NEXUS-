import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export function DataCard({
  children,
  className = '',
  title,
  action,
  subtitle,
  headerClassName = '',
  bodyClassName = '',
  noPadding = false,
  collapsible = false,
  defaultCollapsed = false,
  ...props
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div
      className={`card ${collapsible ? 'cursor-pointer select-none' : ''} ${className}`}
      onClick={collapsible ? () => setCollapsed(prev => !prev) : undefined}
      role={collapsible ? 'button' : undefined}
      tabIndex={collapsible ? 0 : undefined}
      onKeyDown={(e) => {
        if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setCollapsed(prev => !prev);
        }
      }}
      {...props}
    >
      {(title || action || subtitle) && (
        <div className={`flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)] ${headerClassName}`}>
          <div className="flex items-center gap-3">
            {collapsible && (
              <ChevronRight
                className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${collapsed ? '' : 'rotate-90'}`}
              />
            )}
            <div>
              {title && <span className="section-label">{title}</span>}
              {subtitle && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {action && (
            <div onClick={(e) => e.stopPropagation()}>
              {action}
            </div>
          )}
        </div>
      )}

      {(!collapsible || !collapsed) && (
        <div className={`${noPadding ? '' : 'p-5'} ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}