import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function AcknowledgeAlertsButton({ alerts, onAcknowledgeAll }) {
  const unacknowledged = alerts.filter(a => !a.acknowledged);
  if (unacknowledged.length === 0) return null;

  const handleAcknowledgeAll = () => {
    if (window.confirm(`Acknowledge ${unacknowledged.length} alert(s)?`)) {
      onAcknowledgeAll(unacknowledged.map(a => a.id));
      toast.success(`${unacknowledged.length} alert(s) acknowledged`);
    }
  };

  return (
    <button onClick={handleAcknowledgeAll} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition">
      <CheckCircleIcon className="h-4 w-4" /> Acknowledge All
    </button>
  );
}
