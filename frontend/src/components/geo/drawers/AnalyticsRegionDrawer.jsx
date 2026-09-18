import RegionDetailDrawer, { Metric, MetricGroup } from '../RegionDetailDrawer';
import { formatNumber, formatPercent } from '../../../lib/format';

function ciHint(low, high) {
  if (low == null || high == null) return null;
  return '95% CI ' + low + '\u2013' + high;
}

export default function AnalyticsRegionDrawer({ region, onClose }) {
  if (!region) return null;
  return (
    <RegionDetailDrawer
      open={!!region}
      onClose={onClose}
      title={region.county || region.sub_county || 'Region'}
      subtitle={region.sub_county || ''}
    >
      {region.fallback_note && (
        <div className="rounded-[var(--radius-card)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs text-[var(--status-warning)]">
          {region.fallback_note}
        </div>
      )}
      <MetricGroup title="Filter context">
        <Metric label="Pathogen" value={region.filter_pathogen || 'Any'} />
        <Metric label="Sector" value={region.filter_sector || 'Any'} />
        <Metric label="Period" value={region.filter_period || null} />
      </MetricGroup>
      <MetricGroup title="Burden">
        <Metric label="Isolates" value={region.samples != null ? formatNumber(region.samples) : null} />
        <Metric
          label="MDR rate"
          value={region.mdr_rate != null ? formatPercent(region.mdr_rate) : null}
          hint={ciHint(region.ci_low, region.ci_high)}
        />
        <Metric
          label="vs national"
          value={region.delta_vs_national != null
            ? (region.delta_vs_national > 0 ? '+' : '') + region.delta_vs_national + ' pts'
            : null}
        />
      </MetricGroup>
      {region.top_pathogens && region.top_pathogens.length > 0 && (
        <MetricGroup title="Top pathogens in filter">
          {region.top_pathogens.slice(0, 5).map((p) => (
            <Metric key={p.code || p.name} label={p.code || p.name} value={formatNumber(p.samples)} hint="isolates" />
          ))}
        </MetricGroup>
      )}
    </RegionDetailDrawer>
  );
}
