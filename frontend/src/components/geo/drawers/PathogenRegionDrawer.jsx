import RegionDetailDrawer, { Metric, MetricGroup } from '../RegionDetailDrawer';
import { formatNumber, formatPercent } from '../../../lib/format';

function ciHint(low, high) {
  if (low == null || high == null) return null;
  return '95% CI ' + low + '\u2013' + high;
}

export default function PathogenRegionDrawer({ region, onClose }) {
  if (!region) return null;
  return (
    <RegionDetailDrawer
      open={!!region}
      onClose={onClose}
      title={region.county || 'County'}
      subtitle={region.sub_county || ''}
    >
      <MetricGroup title="Burden for this pathogen">
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
      {region.by_class && region.by_class.length > 0 && (
        <MetricGroup title="Resistance by antibiotic class">
          {region.by_class.map((c) => (
            <div key={c.antibiotic_class} className="space-y-1">
              <Metric
                label={c.antibiotic_class}
                value={formatPercent(c.resistance)}
                hint={'n=' + c.samples}
                tone={c.aware === 'Reserve' && c.resistance > 0 ? 'critical' : null}
              />
              {c.aware && (
                <span className="text-[10px] text-[var(--text-muted)] uppercase">{c.aware}</span>
              )}
            </div>
          ))}
        </MetricGroup>
      )}
      {region.recent && region.recent.length > 0 && (
        <MetricGroup title="Recent isolates">
          {region.recent.slice(0, 5).map((r, i) => (
            <div key={i} className="text-xs text-[var(--text-secondary)] flex justify-between gap-2">
              <span className="truncate">{r.specimen_type || '\u2014'}</span>
              <span className="text-[var(--text-muted)]">{r.sector || ''}</span>
            </div>
          ))}
        </MetricGroup>
      )}
    </RegionDetailDrawer>
  );
}
