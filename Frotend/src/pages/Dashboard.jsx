import Card from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { ChartBarIcon, ClockIcon, BellIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome to AMR-Nexus</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/predict">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <ChartBarIcon className="h-8 w-8 text-primary-600" />
            <h3 className="text-lg font-semibold mt-2">New Prediction</h3>
            <p className="text-gray-500 text-sm">Enter isolate data to predict MDR status</p>
          </Card>
        </Link>
        <Link to="/history">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <ClockIcon className="h-8 w-8 text-primary-600" />
            <h3 className="text-lg font-semibold mt-2">History</h3>
            <p className="text-gray-500 text-sm">View past predictions</p>
          </Card>
        </Link>
        <Link to="/alerts">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <BellIcon className="h-8 w-8 text-primary-600" />
            <h3 className="text-lg font-semibold mt-2">Alerts</h3>
            <p className="text-gray-500 text-sm">Review anomaly alerts</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}