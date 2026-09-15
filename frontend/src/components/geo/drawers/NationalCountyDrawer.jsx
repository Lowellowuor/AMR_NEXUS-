import RegionDetailDrawer, { Metric, MetricGroup } from '../RegionDetailDrawer';
import { formatNumber, formatPercent } from '../../../lib/format';

function ciHint(low, high) {
  if (low == null || high == null) return null;
  return '95% CI ' + low + '\u2013' + high;
}

export default function NationalCountyDrawer({ region, onClose }) {
  if (!region) return null;
  return (
    <RegionDetailDrawer
      open={!!region}
      onClose={onClose}
      title={region.county || 'County'}
      subtitle={region.sub_county || ''}
    >
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
          tone={region.delta_vs_national > 5 ? 'critical' : region.delta_vs_national < -5 ? 'success' : null}
        />
      </MetricGroup>
      {region.top_pathogens && region.top_pathogens.length > 0 && (
        <MetricGroup title="Top pathogens">
          {region.top_pathogens.slice(0, 5).map((p) => (
            <Metric key={p.code || p.name} label={p.code || p.name} value={formatNumber(p.samples)} hint="isolates" />
          ))}
        </MetricGroup>
      )}
      {region.by_sector && region.by_sector.length > 0 && (
        <MetricGroup title="By sector">
          {region.by_sector.map((s) => (
            <Metric key={s.sector} label={s.sector} value={formatPercent(s.mdr_rate)} hint={'n=' + s.samples} />
          ))}
        </MetricGroup>
      )}
      {region.by_specimen && region.by_specimen.length > 0 && (
        <MetricGroup title="By specimen">
          {region.by_specimen.map((s) => (
            <Metric key={s.specimen_type} label={s.specimen_type} value={formatPercent(s.mdr_rate)} hint={'n=' + s.samples} />
          ))}
        </MetricGroup>
      )}
      {region.latest_sample && (
        <MetricGroup title="Freshness">
          <Metric label="Latest sample" value={region.latest_sample} />
        </MetricGroup>
      )}
    </RegionDetailDrawer>
  );
}
