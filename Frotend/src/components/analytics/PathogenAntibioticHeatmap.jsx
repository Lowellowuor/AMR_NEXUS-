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
    if (value >= 50) return 'bg-red-500 text-white';
    if (value >= 25) return 'bg-amber-500 text-white';
    if (value > 0) return 'bg-emerald-500 text-white';
    return 'bg-slate-100 text-slate-400';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }

  if (!matrixData || matrixData.pathogens?.length === 0) {
    return <div className="text-center py-10 text-slate-400">No resistance data available</div>;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5 overflow-x-auto">
      <h3 className="text-md font-semibold text-slate-800 mb-3">
        Pathogen vs Antibiotic Class Resistance (%)
      </h3>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pathogen
            </th>
            {matrixData.antibiotics.map(antibiotic => (
              <th key={antibiotic} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                {antibiotic}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {matrixData.pathogens.map((pathogen, rowIndex) => (
            <tr key={pathogen} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 font-medium text-slate-800">{pathogen}</td>
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