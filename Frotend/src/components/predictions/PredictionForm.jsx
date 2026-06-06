import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { pathogens, counties } from '../../utils/constants';

const schema = z.object({
  sector: z.enum(['HUMAN', 'ANIMAL', 'ENVIRONMENT']),
  sub_sector: z.string().min(1),
  pathogen_code: z.string().min(1),
  specimen_type: z.string().min(1),
  county: z.string().min(1),
  antibiotic_class: z.string().min(1),
  test_method: z.string().min(1),
  sample_month: z.number().min(1).max(12),
  prior_antibiotic_exposure: z.boolean().optional(),
  age_group: z.string().optional(),
  gender: z.string().optional(),
  hospitalised: z.boolean().optional(),
  facility: z.string().optional(),
});

export default function PredictionForm({ onSubmit, isLoading }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      sector: 'ANIMAL',
      sub_sector: 'Poultry-Broiler',
      pathogen_code: 'eco',
      specimen_type: 'Cloacal swab',
      county: 'Nairobi',
      antibiotic_class: 'Fluoroquinolone',
      test_method: 'Disk diffusion',
      sample_month: new Date().getMonth() + 1,
      prior_antibiotic_exposure: false,
      hospitalised: false,
    },
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">New AMR Prediction</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sector */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Sector *</label>
            <select {...register('sector')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border">
              <option value="HUMAN">Human</option>
              <option value="ANIMAL">Animal</option>
              <option value="ENVIRONMENT">Environment</option>
            </select>
          </div>

          {/* Sub-sector */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Sub‑sector *</label>
            <input {...register('sub_sector')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" placeholder="e.g., Poultry-Broiler" />
            {errors.sub_sector && <p className="text-red-500 text-xs mt-1">{errors.sub_sector.message}</p>}
          </div>

          {/* Pathogen */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Pathogen *</label>
            <select {...register('pathogen_code')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border">
              {Object.entries(pathogens).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          {/* Specimen Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Specimen Type *</label>
            <input {...register('specimen_type')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
          </div>

          {/* County */}
          <div>
            <label className="block text-sm font-medium text-gray-700">County *</label>
            <select {...register('county')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border">
              {counties.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Antibiotic Class */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Antibiotic Class *</label>
            <select {...register('antibiotic_class')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border">
              <option>Fluoroquinolone</option>
              <option>Penicillin</option>
              <option>Aminoglycoside</option>
              <option>Carbapenem</option>
              <option>Tetracycline</option>
              <option>Macrolide</option>
              <option>Cephalosporin</option>
            </select>
          </div>

          {/* Test Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Test Method *</label>
            <input {...register('test_method')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
          </div>

          {/* Sample Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Sample Month *</label>
            <input type="number" {...register('sample_month', { valueAsNumber: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" min="1" max="12" />
          </div>
        </div>

        {/* Advanced toggle */}
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-primary-600 hover:text-primary-700">
          {showAdvanced ? '− Hide advanced' : '+ Show advanced'}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('prior_antibiotic_exposure')} className="rounded border-gray-300" />
              <span className="text-sm">Prior antibiotic exposure (30d)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('hospitalised')} className="rounded border-gray-300" />
              <span className="text-sm">Hospitalised</span>
            </label>
            <div>
              <label className="block text-sm">Age group</label>
              <input {...register('age_group')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm">Gender</label>
              <select {...register('gender')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border">
                <option value="">Unknown</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm">Facility</label>
              <input {...register('facility')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border" />
            </div>
          </div>
        )}

        {/* Submit Button – now always visible */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analysing...
              </>
            ) : (
              'Predict MDR'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}