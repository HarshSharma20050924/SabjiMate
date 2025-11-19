import React, { useState } from 'react';
import { Language } from '@common/types';
import { translations } from '@common/constants';
import StarRating from '@common/components/StarRating';
import * as api from '@common/api';

interface BatchRatingModalProps {
  show: boolean;
  language: Language;
  saleId: number;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const BatchRatingModal: React.FC<BatchRatingModalProps> = ({ show, language, saleId, onClose, onSubmitSuccess }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const t = translations[language];

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select at least one star.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await api.submitBatchReview({ saleId, rating, comment });
      onSubmitSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 animate-zoom-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 className="text-2xl font-bold text-gray-800">{t.rateYourDeliveryHi}</h2>
        <p className="text-gray-600 mt-1">{t.rateYourDelivery}</p>
        <p className="text-sm text-gray-500 mt-4 mb-6">{t.deliveryFeedback}</p>
        
        <div className="flex justify-center my-6">
          <StarRating rating={rating} onRatingChange={setRating} size="lg" />
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Add an optional comment..."
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting || rating === 0} 
          className="w-full mt-6 bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-green-700 disabled:bg-gray-400"
        >
          {isSubmitting ? t.loading : t.submit}
        </button>
      </div>
    </div>
  );
};

export default BatchRatingModal;