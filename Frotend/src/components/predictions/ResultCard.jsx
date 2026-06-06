import Card from '../ui/Card';
import Alert from '../ui/Alert';

export default function ResultCard({ result }) {
  if (!result) return null;

  const { mdr_flag, mdr_probability, anomaly_detected, anomaly_score, shap_top_feature, shap_value } = result;

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-3">Prediction Outcome</h3>
      
      <div className={`p-4 rounded-lg mb-4 ${mdr_flag ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex justify-between items-center">
          <span className="font-medium">MDR Status</span>
          <span className={`text-xl font-bold ${mdr_flag ? 'text-red-600' : 'text-green-600'}`}>
            {mdr_flag ? 'RESISTANT' : 'SUSCEPTIBLE'}
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full ${mdr_flag ? 'bg-red-600' : 'bg-green-600'}`} style={{ width: `${mdr_probability * 100}%` }}></div>
        </div>
        <p className="text-sm text-gray-600 mt-1">Confidence: {(mdr_probability * 100).toFixed(1)}%</p>
      </div>

      {anomaly_detected && (
        <Alert type="warning" className="mb-4">
          <strong>Anomaly Detected</strong> – Unusual resistance pattern (score {anomaly_score.toFixed(3)}).
        </Alert>
      )}

      <div className="border-t pt-3">
        <h4 className="text-sm font-medium text-gray-500">Top influencing factor</h4>
        <div className="flex justify-between items-baseline mt-1">
          <span className="text-primary-600 font-medium">{shap_top_feature.replace(/_/g, ' ')}</span>
          <span className={`text-sm ${shap_value > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {shap_value > 0 ? '+' : ''}{shap_value.toFixed(3)} impact
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
          <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${Math.abs(shap_value) * 20}%` }}></div>
        </div>
      </div>
    </Card>
  );
}