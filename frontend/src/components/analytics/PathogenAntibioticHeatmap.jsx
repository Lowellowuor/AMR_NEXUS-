import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../api/client';

export default function PathogenAntibioticHeatmap({ startDate, endDate, county }) {
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatrix = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (county) params.append('county', county);

        const data = await api.getPathogenAntibioticMatrix(params.toString());
        setMatrixData(data);
      } catch (err) {
        console.error('Failed to load pathogen-antibiotic matrix:', err);
        setError('Failed to load matrix');
      } finally {
        setLoading(false);
      }
    };
    fetchMatrix();
  }, [startDate, endDate, county]);

  const getCellColor = (value) => {
    if (value >= 50) return 'bg-[var(--status-critical)] text-white';
    if (value >= 25) return 'bg-[var(--status-warning-bg)]0 text-white';
    if (value > 0) return 'bg-[var(--status-success-bg)]0 text-white';
    return 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-teal)]" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-[var(--status-critical)] py-10">{error}</div>;
  }

  if (!matrixData || matrixData.pathogens?.length === 0) {
    return <div className="text-center py-10 text-[var(--text-muted)]">No resistance data available</div>;
  }

  return (
    <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5 overflow-x-auto">
      <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3">
        Pathogen vs Antibiotic Class Resistance (%)
      </h3>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-primary)]">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Pathogen
            </th>
            {matrixData.antibiotics.map(antibiotic => (
              <th key={antibiotic} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {antibiotic}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-primary)]">
          {matrixData.pathogens.map((pathogen, rowIndex) => (
            <tr key={pathogen} className="hover:bg-[var(--bg-tertiary)] transition-colors">
              <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{pathogen}</td>
              {matrixData.matrix[rowIndex].map((value, colIndex) => (
                <td
                  key={`${pathogen}-${matrixData.antibiotics[colIndex]}`}
                  className={`px-3 py-2 text-center font-semibold rounded-md ${getCellColor(value)}`}
                >
                  {value}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}