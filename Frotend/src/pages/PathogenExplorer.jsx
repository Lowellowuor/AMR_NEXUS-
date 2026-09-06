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
      primary: 'bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-500',
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
      borderColor: '#d1d5db',
      boxShadow: 'none',
      '&:hover': { borderColor: '#9ca3af' },
      backgroundColor: '#ffffff',
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '12px',
      marginTop: '4px',
      zIndex: 9999,
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    singleValue: (base) => ({ ...base, color: '#1f2937' }),
    input: (base) => ({ ...base, color: '#1f2937' }),
    placeholder: (base) => ({ ...base, color: '#9ca3af' }),
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ChartBarIcon className="h-6 w-6 text-gray-800" />
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

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-white/50 space-y-4 relative" style={{ overflow: 'visible' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
              <ChartBarIcon className="h-4 w-4 text-gray-400" />
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
            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
              <MapPinIcon className="h-4 w-4 text-gray-400" />
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
            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-gray-500"
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
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <XMarkIcon className="h-4 w-4" />
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {!selectedPathogen && (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Select a pathogen to explore resistance patterns.</p>
        </div>
      )}

      {selectedPathogen && loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800" />
        </div>
      )}

      {selectedPathogen && !loading && (
        <div className="space-y-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-gray-800" />
              Resistance by Antibiotic Class – <span className="text-gray-800 font-bold">{selectedPathogen.toUpperCase()}</span>
            </h2>
            {resistanceData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No resistance data available for this pathogen.</p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={resistanceData} margin={{ top: 10, right: 30, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="antibiotic_class" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#6b7280' }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="resistance" fill="#6b7280" name="MDR (%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {trendData.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-gray-800" />
                MDR Trend (last 12 months) – <span className="text-gray-800 font-bold">{selectedPathogen.toUpperCase()}</span>
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fill: '#6b7280' }} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#6b7280' }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="rate" stroke="#6b7280" strokeWidth={2} name="MDR Rate (%)" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-gray-800" />
              Geographic Distribution – <span className="text-gray-800 font-bold">{selectedPathogen.toUpperCase()}</span>
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