import { DocumentArrowDownIcon, DocumentArrowUpIcon, TableCellsIcon } from '@heroicons/react/24/outline';

export default function ExportButtons({ onExcel, onPDF, onCSV }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={onExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-medium transition-all">
        <TableCellsIcon className="h-4 w-4" /> Excel
      </button>
      <button onClick={onPDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium transition-all">
        <DocumentArrowUpIcon className="h-4 w-4" /> PDF
      </button>
      <button onClick={onCSV} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-all">
        <DocumentArrowDownIcon className="h-4 w-4" /> CSV
      </button>
    </div>
  );
}