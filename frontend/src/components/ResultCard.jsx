export default function ResultCard({ result }) {
  if (!result) return null;

  const { mdr_flag, mdr_probability, anomaly_detected, anomaly_score, shap_top_feature, shap_value } = result;

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Prediction Result</h3>
      
      {/* MDR Flag */}
      <div className={`p-4 rounded-lg ${mdr_flag ? 'bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)]' : 'bg-[var(--status-success-bg)] border border-green-200'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Multi'Drug Resistance (MDR)</span>
          <span className={`text-xl font-bold ${mdr_flag ? 'text-[var(--status-critical)]' : 'text-[var(--status-success)]'}`}>
            {mdr_flag ? 'POSITIVE' : 'NEGATIVE'}
          </span>
        </div>
        <div className="mt-2 w-full bg-[var(--border-primary)] rounded-full h-2">
          <div className={`h-2 rounded-full ${mdr_flag ? 'bg-[var(--status-critical)]' : 'bg-green-600'}`} style={{ width: `${mdr_probability * 100}%` }}></div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Confidence: {(mdr_probability * 100).toFixed(1)}%</p>
      </div>

      {/* Anomaly Alert */}
      {anomaly_detected && (
        <div className="p-4 rounded-lg bg-[var(--status-warning-bg)] border border-yellow-200">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-[var(--status-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium text-yellow-800">Anomaly Detected</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">Unusual resistance pattern (score: {anomaly_score.toFixed(3)}). Consider stewardship alert.</p>
        </div>
      )}

      {/* SHAP Explanation */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-[var(--text-secondary)]">Key Influencing Factor</h4>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-lg font-semibold text-[var(--accent-teal)]">{shap_top_feature.replace(/_/g, ' ')}</span>
          <span className={`text-sm ${shap_value > 0 ? 'text-[var(--status-critical)]' : 'text-[var(--status-success)]'}`}>
            {shap_value > 0 ? '+' : ''}{shap_value.toFixed(3)} impact
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          This feature had the strongest influence on the prediction.
        </p>
      </div>
    </div>
  );
}