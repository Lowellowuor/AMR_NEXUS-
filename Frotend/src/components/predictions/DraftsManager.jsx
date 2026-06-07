import { useOfflineDrafts } from '../../hooks/useOfflineDrafts';

export default function DraftsManager({ onLoadDraft, onSubmitDraft }) {
  const { drafts, removeDraft, syncDraft } = useOfflineDrafts();
  if (drafts.length === 0) return null;
  return (
    <div className="mb-4 p-3 bg-yellow-50 rounded-xl">
      <p className="text-sm font-medium mb-2">📝 You have {drafts.length} offline draft(s)</p>
      <div className="space-y-2">
        {drafts.map(d => (
          <div key={d.id} className="flex justify-between items-center text-sm bg-white p-2 rounded">
            <span>Saved {new Date(d.timestamp).toLocaleString()}</span>
            <div className="flex gap-2">
              <button onClick={() => onLoadDraft(d.formData)} className="text-primary-600">Load</button>
              <button onClick={() => syncDraft(d.id, onSubmitDraft)} className="text-green-600">Sync</button>
              <button onClick={() => removeDraft(d.id)} className="text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}