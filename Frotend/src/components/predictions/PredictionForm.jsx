import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import Select from 'react-select';
import { QrCodeIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import { pathogens, counties } from '../../utils/constants';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useOfflineDrafts } from '../../hooks/useOfflineDrafts';

const schema = z.object({
  sector: z.enum(['HUMAN', 'ANIMAL', 'ENVIRONMENT']),
  sub_sector: z.string().min(1),
  pathogen_code: z.string().min(1),
  specimen_type: z.string().min(1),
  county: z.string().min(1),
  antibiotic_class: z.string().min(1),
  test_method: z.string().min(1),
  sample_month: z.number().min(1).max(12),
  isolate_id: z.string().optional(),
  prior_antibiotic_exposure: z.boolean().optional(),
  age_group: z.string().optional(),
  gender: z.string().optional(),
  hospitalised: z.boolean().optional(),
  facility: z.string().optional(),
});

// Options for react-select
const sectorOptions = ['HUMAN', 'ANIMAL', 'ENVIRONMENT'].map(v => ({ value: v, label: v }));
const pathogenOptions = Object.entries(pathogens).map(([code, name]) => ({ value: code, label: `${name} (${code})` }));
const countyOptions = counties.map(c => ({ value: c, label: c }));
const antibioticOptions = ['Fluoroquinolone', 'Penicillin', 'Aminoglycoside', 'Carbapenem', 'Tetracycline', 'Macrolide', 'Cephalosporin'].map(v => ({ value: v, label: v }));
const testMethodOptions = ['Disk diffusion', 'MIC', 'Etest', 'Broth microdilution'].map(v => ({ value: v, label: v }));
const genderOptions = ['', 'M', 'F'].map(v => ({ value: v, label: v || 'Unknown' }));

const PredictionForm = forwardRef(({ onSubmit, isLoading, onFormChange }, ref) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm({
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
      isolate_id: '',
      prior_antibiotic_exposure: false,
      hospitalised: false,
      facility: '',
    },
  });

  const { isListening, transcript, startListening } = useSpeechRecognition();
  const { code, startScan } = useBarcodeScanner();
  const { addDraft } = useOfflineDrafts();

  const watchedValues = useWatch({ control });
  useEffect(() => {
    if (onFormChange) onFormChange(watchedValues);
  }, [watchedValues, onFormChange]);

  useImperativeHandle(ref, () => ({
    setValues: (data) => {
      Object.keys(data).forEach(key => setValue(key, data[key]));
    }
  }));

  useEffect(() => {
    if (transcript) setValue('facility', transcript);
  }, [transcript, setValue]);

  useEffect(() => {
    if (code) setValue('isolate_id', code);
  }, [code, setValue]);

  useEffect(() => {
    const interval = setInterval(() => {
      const formData = watch();
      if (Object.keys(formData).length) {
        addDraft({ formData, timestamp: new Date() });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [watch, addDraft]);

  // Helper to render react-select with label
  const renderSelect = (name, options, placeholder, isClearable = true) => (
    <Select
      options={options}
      value={options.find(o => o.value === watch(name)) || null}
      onChange={(opt) => setValue(name, opt?.value || '')}
      placeholder={placeholder}
      isClearable={isClearable}
      styles={{
        control: (base) => ({
          ...base,
          borderRadius: '9999px',
          borderColor: '#d1d5db',
          boxShadow: 'none',
          '&:hover': { borderColor: '#9ca3af' },
          minHeight: '38px',
        }),
        menu: (base) => ({ ...base, borderRadius: '12px', zIndex: 20 }),
        menuPortal: (base) => ({ ...base, zIndex: 20 }),
      }}
      menuPortalTarget={document.body}
    />
  );

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">New AMR Prediction</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Scrollable fields container */}
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sector */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Sector *</label>
              {renderSelect('sector', sectorOptions, 'Select sector')}
            </div>
            {/* Sub-sector */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Sub-sector *</label>
              <input {...register('sub_sector')} className="mt-1 block w-full rounded-full border-gray-200 bg-gray-50/50 px-4 py-2 text-sm" placeholder="e.g., Poultry-Broiler" />
              {errors.sub_sector && <p className="text-red-500 text-xs mt-1">{errors.sub_sector.message}</p>}
            </div>
            {/* Pathogen */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Pathogen *</label>
              {renderSelect('pathogen_code', pathogenOptions, 'Search pathogen...')}
            </div>
            {/* Specimen Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Specimen Type *</label>
              <input {...register('specimen_type')} className="mt-1 block w-full rounded-full border-gray-200 bg-gray-50/50 px-4 py-2 text-sm" />
            </div>
            {/* County */}
            <div>
              <label className="block text-sm font-medium text-gray-700">County *</label>
              {renderSelect('county', countyOptions, 'Search county...')}
            </div>
            {/* Antibiotic Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Antibiotic Class *</label>
              {renderSelect('antibiotic_class', antibioticOptions, 'Select antibiotic')}
            </div>
            {/* Test Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Method *</label>
              {renderSelect('test_method', testMethodOptions, 'Select method')}
            </div>
            {/* Sample Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Sample Month *</label>
              <input type="number" {...register('sample_month', { valueAsNumber: true })} className="mt-1 block w-full rounded-full border-gray-200 bg-gray-50/50 px-4 py-2 text-sm" min="1" max="12" />
            </div>
            {/* Isolate ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Isolate ID</label>
              <div className="flex gap-2">
                <input {...register('isolate_id')} className="mt-1 block w-full rounded-full border-gray-200 bg-gray-50/50 px-4 py-2 text-sm" placeholder="Scan or enter ID" />
                <button type="button" onClick={startScan} className="mt-1 inline-flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors">
                  <QrCodeIcon className="h-4 w-4" /> Scan
                </button>
              </div>
            </div>
          </div>

          {/* Advanced toggle */}
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-primary-600 hover:text-primary-700">
            {showAdvanced ? '− Hide advanced' : '+ Show advanced'}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2"><input type="checkbox" {...register('prior_antibiotic_exposure')} className="rounded border-gray-300" /><span className="text-sm">Prior antibiotic exposure (30d)</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" {...register('hospitalised')} className="rounded border-gray-300" /><span className="text-sm">Hospitalised</span></label>
              <div><label className="block text-sm">Age group</label><input {...register('age_group')} className="mt-1 block w-full rounded-full border-gray-200 bg-gray-50/50 px-4 py-2 text-sm" /></div>
              <div>
                <label className="block text-sm">Gender</label>
                {renderSelect('gender', genderOptions, 'Select gender', true)}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm">Facility</label>
                <div className="flex gap-2">
                  <input {...register('facility')} className="mt-1 block w-full rounded-full border-gray-200 bg-gray-50/50 px-4 py-2 text-sm" placeholder="Enter facility name" />
                  <button type="button" onClick={startListening} disabled={isListening} className="mt-1 inline-flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors disabled:opacity-50">
                    <MicrophoneIcon className={`h-4 w-4 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
                    {isListening ? 'Listening...' : 'Speak'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit button – always visible, outside scrollable area */}
        <div className="pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analysing...
              </span>
            ) : (
              'Predict MDR'
            )}
          </button>
        </div>
      </form>
    </div>
  );
});

PredictionForm.displayName = 'PredictionForm';
export default PredictionForm;