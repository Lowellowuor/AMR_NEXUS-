// src/components/predictions/SHAPExplanation.jsx
import Card from '../ui/Card';

export default function SHAPExplanation({ shapTopFeature, shapValue, probability }) {
  if (!shapTopFeature) return null;

  const impactColor = shapValue > 0 ? 'text-[var(--status-critical)]' : 'text-[var(--status-success)]';
  const impactText = shapValue > 0 ? 'increases resistance risk' : 'decreases resistance risk';

  return (
    <Card className="mt-4">
      <h4 className="text-md font-semibold mb-2">ðŸ" SHAP Explanation</h4>
      <p className="text-sm text-[var(--text-secondary)]">
        The most influential factor for this prediction is:
      </p>
      <div className="mt-2 p-3 bg-[var(--bg-tertiary)] rounded-lg">
        <span className="font-mono font-bold">{shapTopFeature.replace(/_/g, ' ')}</span>
        <span className={`ml-2 ${impactColor}`}>
          ({shapValue > 0 ? '+' : ''}{shapValue.toFixed(3)})
        </span>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          This feature {impactText} by {Math.abs(shapValue).toFixed(3)} units.
        </p>
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-2">
        SHAP values show how each feature pushes the prediction from the base probability (â‰ˆ{((1-probability)*100).toFixed(1)}%) to the final {((probability)*100).toFixed(1)}%.
      </p>
    </Card>
  );
}