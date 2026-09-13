import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
const COLORS = ['var(--accent-blue)', 'var(--status-success)', 'var(--status-warning)'];

export default function SectorPieChart({ data }) {
  return (
    <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5">
      <h3 className="text-md font-semibold mb-2 text-[var(--text-primary)]">MDR by Sector</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`}>
            {data.map((entry, idx) => <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}