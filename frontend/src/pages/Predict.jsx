import { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Copy, Download, RefreshCw } from 'lucide-react';

import PredictionForm from '../components/predictions/PredictionForm';
import ResultCard from '../components/predictions/ResultCard';
import StewardshipTip from '../components/predictions/StewardshipTip';
import DuplicateWarning from '../components/predictions/DuplicateWarning';
import HistorySidebar from '../components/predictions/HistorySidebar';
import DraftsManager from '../components/predictions/DraftsManager';
import TemplateSelector from '../components/predictions/TemplateSelector';
import BatchPredictUploader from '../components/predictions/BatchPredictUploader';
import ModelInfoStrip from '../components/predictions/ModelInfoStrip';
import PredictModeToggle from '../components/predictions/PredictModeToggle';
import SimilarCasesPanel from '../components/predictions/SimilarCasesPanel';

import api from '../api/client';
import { isDuplicate } from '../utils/duplicateDetection';
import { useOfflineDrafts } from '../hooks/useOfflineDrafts';
import { usePageTitle } from '../hooks/usePageTitle';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';

export default function Predict() {
  usePageTitle('Predict');
  const [mode, setMode] = useState('single');
  const [currentResult, setCurrentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [currentFormData, setCurrentFormData] = useState(null);
  const formRef = useRef(null);
  const resultRef = useRef(null);
  const { addDraft } = useOfflineDrafts();

  const hasFormContent = !!(
    currentFormData &&
    (currentFormData.pathogen_code ||
      currentFormData.county ||
      currentFormData.antibiotic_class ||
      currentFormData.sub_sector ||
      currentFormData.specimen_type ||
      currentFormData.isolate_id)
  );
  useUnsavedWarning(hasFormContent && !currentResult);

  const refreshRecent = () =>
    api.getPredictions(20, 0).then((data) => {
      const list = Array.isArray(data) ? data : data?.records ?? [];
      setRecentPredictions(list);
    });

  useEffect(() => {
    refreshRecent();
  }, []);

  useEffect(() => {
    if (currentResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentResult]);

  const handleSubmit = async (formData) => {
    const dup = isDuplicate(formData, recentPredictions);
    if (dup && !window.confirm('Possible duplicate record. Continue anyway?')) return;
    setDuplicateWarning(dup);

    setIsLoading(true);
    try {
      const result = await api.submitPrediction(formData);
      setCurrentResult(result);
      toast.success('Prediction completed');
      refreshRecent();
    } catch (error) {
      toast.error(error.message || 'Prediction failed');
      if (!navigator.onLine) {
        await addDraft({ formData, timestamp: new Date() });
        toast(
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-[var(--accent-blue)]" />
            <span>Saved as offline draft</span>
          </div>,
          { duration: 4000 },
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDraft = (data) => {
    formRef.current?.setValues(data);
    setCurrentFormData(data);
    setMode('single');
    toast.success('Draft loaded');
  };

  const handleLoadTemplate = (data) => {
    formRef.current?.setValues(data);
    setCurrentFormData(data);
    setMode('single');
    toast.success('Template loaded');
  };

  const handleHistorySelect = (prediction) => {
    toast(
      <div className="flex items-center gap-2">
        <Copy className="h-4 w-4 text-[var(--accent-teal)]" />
        <span>
          Loaded prediction from {new Date(prediction.timestamp).toLocaleDateString()}
        </span>
      </div>,
      { duration: 3000 },
    );
  };

  const handleStartOver = () => {
    setCurrentResult(null);
    setDuplicateWarning(null);
    formRef.current?.setValues({
      sector: '',
      sub_sector: '',
      pathogen_code: '',
      specimen_type: '',
      county: '',
      antibiotic_class: '',
      test_method: '',
      sample_month: new Date().getMonth() + 1,
      isolate_id: '',
      prior_antibiotic_exposure: false,
      hospitalised: false,
      facility: '',
    });
  };

  return (
    <div className="space-y-5">
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg shadow-lg border border-[var(--border-primary)]',
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Predict</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Estimate multidrug resistance from isolate characteristics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentResult && (
            <button
              onClick={handleStartOver}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition"
            >
              <RefreshCw className="w-4 h-4" />
              Start over
            </button>
          )}
          <PredictModeToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      <ModelInfoStrip />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {mode === 'single' && (
            <>
              <TemplateSelector
                onLoadTemplate={handleLoadTemplate}
                currentFormData={currentFormData}
              />
              <DraftsManager
                onLoadDraft={handleLoadDraft}
                onSubmitDraft={handleSubmit}
              />
              <PredictionForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                ref={formRef}
                onFormChange={setCurrentFormData}
              />
              {duplicateWarning && <DuplicateWarning duplicate={duplicateWarning} />}
            </>
          )}

          {mode === 'batch' && (
            <BatchPredictUploader
              onBatchComplete={(outcomes) => {
                const successCount = outcomes.filter((o) => o.success).length;
                toast.success(
                  `${successCount} of ${outcomes.length} predictions submitted`,
                );
                refreshRecent();
              }}
            />
          )}

          <div ref={resultRef}>
            {currentResult && <ResultCard result={currentResult} />}
            {currentResult && <StewardshipTip result={currentResult} antibioticClass={currentFormData?.antibiotic_class} />}
            {currentResult && (
              <SimilarCasesPanel
                pathogen={currentFormData?.pathogen_code}
                county={currentFormData?.county}
                excludeRecordId={currentResult.record_id}
                onSelect={handleHistorySelect}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <HistorySidebar onSelect={handleHistorySelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
