import { useQuery } from '@tanstack/react-query';
import RegionDetailDrawer, { Metric, MetricGroup } from '../geo/RegionDetailDrawer';
import api from '../../api/client';
import { formatNumber, formatPercent } from '../../lib/format';

const SECTOR_LABEL = {
  human: 'Human',
  animal: 'Animal',
  environment: 'Environment',
};

export default function SiteDrawer({ site, onClose, canManage, onDeactivate }) {
  const isolates = useQuery({
    queryKey: ['sampling-site-isolates', site?.id],
    queryFn: () => api.getSamplingSiteIsolates(site.id, 'limit=100'),
    enabled: !!site?.id,
  });

  if (!site) return null;

  const coords =
    site.latitude != null && site.longitude != null
      ? `${Number(site.latitude).toFixed(4)}, ${Number(site.longitude).toFixed(4)}`
      : null;

  return (
    <RegionDetailDrawer
      open={!!site}
      onClose={onClose}
      title={site.name}
      subtitle={[site.site_type, site.sub_county, site.county]
        .filter(Boolean)
        .join(' · ')}
    >
      <MetricGroup title="Details">
        <Metric label="Type" value={site.site_type} />
        <Metric label="Sector" value={SECTOR_LABEL[site.sector] || site.sector} />
        <Metric label="County" value={site.county} />
        {site.sub_county && <Metric label="Sub-county" value={site.sub_county} />}
        {coords && <Metric label="Coordinates" value={coords} />}
        <Metric label="Status" value={site.is_active ? 'Active' : 'Inactive'} />
      </MetricGroup>

      {(site.owner_name || site.owner_contact) && (
        <MetricGroup title="Owner">
          {site.owner_name && <Metric label="Name" value={site.owner_name} />}
          {site.owner_contact && <Metric label="Contact" value={site.owner_contact} />}
        </MetricGroup>
      )}

      {site.notes && (
        <MetricGroup title="Notes">
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
            {site.notes}
          </p>
        </MetricGroup>
      )}

      <MetricGroup title={`Linked isolates (${isolates.data?.length ?? 0})`}>
        {isolates.isLoading ? (
          <p className="text-xs text-[var(--text-muted)]">Loading…</p>
        ) : !isolates.data?.length ? (
          <p className="text-xs text-[var(--text-muted)]">
            No isolates have been linked to this site yet.
          </p>
        ) : (
          <ul className="space-y-2 mt-2">
            {isolates.data.slice(0, 20).map((iso) => (
              <li
                key={iso.record_id}
                className="text-xs border-b border-[var(--border-primary)]/40 last:border-b-0 pb-2 last:pb-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text-primary)]">
                    {iso.pathogen_code || 'Unknown'}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {iso.sample_collection_date
                      ? String(iso.sample_collection_date).slice(0, 10)
                      : '—'}
                  </span>
                </div>
                <div className="text-[var(--text-muted)] mt-0.5">
                  {iso.antibiotic_class || '—'}
                  {iso.mdr_probability != null
                    ? ` · MDR ${formatPercent(iso.mdr_probability)}`
                    : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </MetricGroup>

      {canManage && site.is_active && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => onDeactivate?.(site)}
            className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60 text-[var(--status-warning)]"
          >
            Deactivate site
          </button>
        </div>
      )}
    </RegionDetailDrawer>
  );
}