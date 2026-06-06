// src/pages/Predict.jsx
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import PredictionForm from '../components/predictions/PredictionForm';
import ResultCard from '../components/predictions/ResultCard';
import api from '../api/client';  

export default function Predict() {
  const [currentResult, setCurrentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    try {
      
      const result = await api.submitPrediction(formData);
      setCurrentResult(result);
      toast.success('Prediction completed successfully!');
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error(error.message || 'Failed to get prediction. Is the backend running?');
      setCurrentResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Toaster position="top-right" />
      <div className="lg:col-span-2">
        <PredictionForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
      <div>
        <ResultCard result={currentResult} />
      </div>
    </div>
  );
}