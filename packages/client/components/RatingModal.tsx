import React, { useState } from 'react';
import StarRating from '../../common/components/StarRating';
import * as api from '../../common/api';

interface RatingModalProps {
  show: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  vegetableName: string;
  saleItemId: number;
}

const RatingModal: React.FC<RatingModalProps> = ({ show, onClose, onSubmitSuccess, vegetableName, saleItemId }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await api.submitReview({ saleItemId, rating, comment });
      onSubmitSuccess();
      onClose();
    } catch (err) {
      setError('Failed to submit review. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
      setRating(0);
      setComment('');
      setError('');
      onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-zoom-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Rate your {vegetableName}</h2>
          <p className="text-gray-600 mb-4">Let us know how you liked this item.</p>
          
          <div className="flex justify-center mb-4">
            <StarRating rating={rating} onRatingChange={setRating} size="lg" />
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Add an optional comment..."
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-xl">
          <button onClick={handleClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || rating === 0} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400">
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;