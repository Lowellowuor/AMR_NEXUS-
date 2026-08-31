import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Select from 'react-select';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  MapPinIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  TrophyIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/client';
import CountyChoroplethMap from '../components/map/CountyChoroplethMap';
import { saveAs } from 'file-saver';

export default function PathogenExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPathogen, setSelectedPathogen] = useState(searchParams.get('pathogen') || '');
  const [selectedCounty, setSelectedCounty] = useState(searchParams.get('county') || '');
  const [startDate, setStartDate] = useState(searchParams.get('start') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end') || '');

  const [pathogenOptions, setPathogenOptions] = useState([]);
  const [countyOptions, setCountyOptions] = useState([]);
  const [resistanceData, setResistanceData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = {};
    if (selectedPathogen) params.pathogen = selectedPathogen;
    if (selectedCounty) params.county = selectedCounty;
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;
    setSearchParams(params, { replace: true });
  }, [selectedPathogen, selectedCounty, startDate, endDate, setSearchParams]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [pathogens, options] = await Promise.all([
          api.getByPathogen(100),
          api.getOptions(),
        ]);

        const uniquePathogens = Array.from(new Map(pathogens.map(p => [p.name, p])).values());
        const sortedPathogens = uniquePathogens
          .map(p => ({ value: p.name, label: `${p.name} (${p.resistance}%)` }))
          .sort((a, b) => {
            const aRate = parseFloat(a.label.match(/\(([\d.]+)%/)?.[1] || 0);
            const bRate = parseFloat(b.label.match(/\(([\d.]+)%/)?.[1] || 0);
            return bRate - aRate;
          });
        setPathogenOptions(sortedPathogens);

        const allCountyOptions = (options.counties || []).map(c => ({
          value: c.code,
          label: c.name,
        }));
        setCountyOptions(allCountyOptions);
      } catch (err) {
        console.error('Failed to load options:', err);
      }
    };
    loadOptions();
  }, []);

  useEffect(() => {
    if (!selectedPathogen || selectedPathogen === '') return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (selectedCounty) params.append('county', selectedCounty);

        const [res, trend] = await Promise.all([
          api.getResistanceByPathogenClass(selectedPathogen, params.toString()),
          api.getPathogenTrend(selectedPathogen, 12, params.toString()),
        ]);

        setResistanceData(res);
        setTrendData(trend);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedPathogen, selectedCounty, startDate, endDate]);

  const selectHighestResistance = () => {
    if (pathogenOptions.length > 0) {
      setSelectedPathogen(pathogenOptions[0].value);
    }
  };

  const exportCSV = () => {
    if (!resistanceData.length) return;
    const headers = ['Antibiotic Class', 'Resistance (%)'];
    const rows = resistanceData.map(r => [r.antibiotic_class, r.resistance]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${selectedPathogen}_resistance_${new Date().toISOString().slice(0, 19)}.csv`);
  };

  const ActionButton = ({ onClick, icon, label, disabled, variant = 'primary' }) => {
    const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
      secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
      dark: 'bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-700',
    };
    return (
      <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>
        {icon}
        {label}
      </button>
    );
  };

  const selectStyles = {
    control: (base) => ({
      ...base,
      borderRadius: '9999px',
      borderColor: 'var(--border-primary)',
      boxShadow: 'none',
      '&:hover': { borderColor: 'var(--border-secondary)' },
      backgroundColor: 'var(--bg-secondary)',
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '12px',
      marginTop: '4px',
      zIndex: 9999,
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-primary)',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    singleValue: (base) => ({ ...base, color: 'var(--text-primary)' }),
    input: (base) => ({ ...base, color: 'var(--text-primary)' }),
    placeholder: (base) => ({ ...base, color: 'var(--text-muted)' }),
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ChartBarIcon className="h-6 w-6 text-[var(--accent-cyan)]" />
          Pathogen Explorer
        </h1>
        <div className="flex gap-2">
          <ActionButton
            onClick={selectHighestResistance}
            icon={<TrophyIcon className="h-4 w-4" />}
            label="Highest Resistance"
            variant="dark"
            disabled={pathogenOptions.length === 0}
          />
          <ActionButton
            onClick={exportCSV}
            icon={<ArrowDownTrayIcon className="h-4 w-4" />}
            label="Export CSV"
            disabled={!resistanceData.length}
          />
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-[var(--border-primary)] space-y-4 relative" style={{ overflow: 'visible' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1">
              <ChartBarIcon className="h-4 w-4 text-[var(--text-muted)]" />
              Pathogen
            </label>
            <Select
              options={pathogenOptions}
              value={pathogenOptions.find(o => o.value === selectedPathogen) || null}
              onChange={(option) => setSelectedPathogen(option?.value || '')}
              placeholder="Search pathogen..."
              isClearable
              styles={selectStyles}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuPlacement="auto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1">
              <MapPinIcon className="h-4 w-4 text-[var(--text-muted)]" />
              County
            </label>
            <Select
              options={countyOptions}
              value={countyOptions.find(o => o.value === selectedCounty) || null}
              onChange={(option) => setSelectedCounty(option?.value || '')}
              placeholder="Search county..."
              isClearable
              styles={selectStyles}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuPlacement="auto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1">
              <CalendarIcon className="h-4 w-4 text-[var(--text-muted)]" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-full border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-cyan)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1">
              <CalendarIcon className="h-4 w-4 text-[var(--text-muted)]" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-full border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-cyan)]"
            />
          </div>
        </div>

        {(selectedPathogen || selectedCounty) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSelectedPathogen('');
                setSelectedCounty('');
                setStartDate('');
                setEndDate('');
              }}
              className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <XMarkIcon className="h-4 w-4" />
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {!selectedPathogen && (
        <div className="text-center py-12 bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-[var(--border-primary)]">
          <ChartBarIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">Select a pathogen to explore resistance patterns.</p>
        </div>
      )}

      {selectedPathogen && loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-cyan)]" />
        </div>
      )}

      {selectedPathogen && !loading && (
        <div className="space-y-8">
          <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-[var(--border-primary)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-[var(--accent-cyan)]" />
              Resistance by Antibiotic Class – <span className="text-[var(--accent-cyan)] font-bold">{selectedPathogen.toUpperCase()}</span>
            </h2>
            {resistanceData.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-8">No resistance data available for this pathogen.</p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={resistanceData} margin={{ top: 10, right: 30, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="antibiotic_class" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="resistance" fill="#8884d8" name="MDR (%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {trendData.length > 0 && (
            <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-[var(--border-primary)] p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-[var(--accent-cyan)]" />
                MDR Trend (last 12 months) – <span className="text-[var(--accent-cyan)] font-bold">{selectedPathogen.toUpperCase()}</span>
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)' }} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} name="MDR Rate (%)" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-[var(--border-primary)] p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-[var(--accent-cyan)]" />
              Geographic Distribution – <span className="text-[var(--accent-cyan)] font-bold">{selectedPathogen.toUpperCase()}</span>
            </h2>
            <div className="h-[450px] w-full min-h-0">
              <CountyChoroplethMap
                darkMode={false}
                mode="current"
                onCountyClick={(props) => setSelectedCounty(props.code || props.county)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}