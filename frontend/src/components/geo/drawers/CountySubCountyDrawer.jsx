import RegionDetailDrawer, { Metric, MetricGroup } from '../RegionDetailDrawer';
import { formatNumber, formatPercent } from '../../../lib/format';

function ciHint(low, high) {
  if (low == null || high == null) return null;
  return '95% CI ' + low + '\u2013' + high;
}

export default function CountySubCountyDrawer({ region, onClose }) {
  if (!region) return null;
  return (
    <RegionDetailDrawer
      open={!!region}
      onClose={onClose}
      title={region.sub_county || region.county || 'Sub-county'}
      subtitle={region.county || ''}
    >
      <MetricGroup title="Burden">
        <Metric label="Isolates" value={region.samples != null ? formatNumber(region.samples) : null} />
        <Metric
          label="MDR rate"
          value={region.mdr_rate != null ? formatPercent(region.mdr_rate) : null}
          hint={ciHint(region.ci_low, region.ci_high)}
        />
        <Metric
          label="vs county avg"
          value={region.delta_vs_county != null
            ? (region.delta_vs_county > 0 ? '+' : '') + region.delta_vs_county + ' pts'
            : null}
          tone={region.delta_vs_county > 5 ? 'critical' : region.delta_vs_county < -5 ? 'success' : null}
        />
        <Metric label="Facilities reporting" value={region.facilities_count != null ? formatNumber(region.facilities_count) : null} />
      </MetricGroup>
      {region.top_pathogens && region.top_pathogens.length > 0 && (
        <MetricGroup title="Top pathogens">
          {region.top_pathogens.slice(0, 5).map((p) => (
            <Metric key={p.code || p.name} label={p.code || p.name} value={formatNumber(p.samples)} hint="isolates" />
          ))}
        </MetricGroup>
      )}
      {region.recent && region.recent.length > 0 && (
        <MetricGroup title="Recent isolates">
          {region.recent.slice(0, 5).map((r, i) => (
            <div key={i} className="text-xs text-[var(--text-secondary)] flex justify-between gap-2">
              <span className="truncate">{r.specimen_type || '\u2014'}</span>
              <span className="text-[var(--text-muted)]">{r.sector || ''}</span>
              <span className="tabular-nums text-[var(--text-muted)]">{(r.timestamp || '').slice(0, 10)}</span>
            </div>
          ))}
        </MetricGroup>
      )}
    </RegionDetailDrawer>
  );
}
