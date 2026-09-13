import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function PathogenResistanceChart({
  startDate,
  endDate,
  county = null,
  pathogenCode = null,
  data: propData = null,
  onDrillDown = null,
  limit = 10,
}) {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasFilter = startDate || endDate || county || pathogenCode;

  useEffect(() => {
    if (propData) {
      setData(propData);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (county) params.append('county', county);
        if (pathogenCode) params.append('pathogen_code', pathogenCode);
        params.append('limit', limit);
        const qs = params.toString();
        const result = await api.getByPathogen(limit, qs);
        setData(result || []);
      } catch (err) {
        console.error('Failed to load pathogen resistance data:', err);
        setError('Could not load pathogen resistance data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, county, pathogenCode, limit, propData]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.resistance - a.resistance);
  }, [data]);

  const handleClick = (pathogen) => {
    if (onDrillDown) {
      onDrillDown(pathogen);
    } else {
      navigate(`/pathogen-explorer?pathogen=${pathogen}`);
    }
  };

  const getBarColor = (resistance) => {
    if (resistance > 60) return '#b91c1c';
    if (resistance > 40) return '#dc2626';
    if (resistance > 20) return '#f97316';
    return 'var(--status-success)';
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5 flex items-center justify-center h-72">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-teal)] mx-auto"></div>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">Loading resistance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5 flex items-center justify-center h-72">
        <p className="text-[var(--status-critical)] text-center">{error}</p>
      </div>
    );
  }

  if (!sortedData || sortedData.length === 0) {
    return (
      <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5 flex items-center justify-center h-72">
        <p className="text-[var(--text-muted)] text-center">No resistance data available for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-semibold text-[var(--text-primary)]">Resistance by Pathogen</h3>
        <span className="text-xs text-[var(--text-muted)]">Click bar to explore</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ left: 40, right: 20 }}
          onClick={(e) => {
            if (e && e.activePayload) {
              const name = e.activePayload[0]?.payload?.name;
              if (name) handleClick(name);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} unit="%" />
          <YAxis type="category" dataKey="name" width={80} />
          <Tooltip
            formatter={(value) => `${value}%`}
            contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}
          />
          <Bar
            dataKey="resistance"
            name="Resistance (%)"
            cursor="pointer"
            shape={(props) => {
              const { x, y, width, height, payload } = props;
              const color = getBarColor(payload.resistance);
              return <rect x={x} y={y} width={width} height={height} fill={color} rx={4} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}