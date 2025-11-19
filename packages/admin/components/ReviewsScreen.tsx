import React, { useState, useEffect, useCallback } from 'react';
import { BatchReview } from '@common/types';
import { getBatchReviews } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';
import StarRating from '@common/components/StarRating';

const RefreshIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
);

const ReviewsScreen: React.FC = () => {
    const [reviews, setReviews] = useState<BatchReview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReviews = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getBatchReviews();
            setReviews(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch reviews.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Customer Reviews</h2>
                <button onClick={fetchReviews} disabled={isLoading} className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 p-2 rounded-full hover:bg-gray-200">
                    <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {isLoading ? (
                <LoadingSpinner />
            ) : error ? (
                <p className="text-red-500 text-center">{error}</p>
            ) : reviews.length === 0 ? (
                <p className="text-gray-500 text-center p-8 bg-white rounded-lg">No reviews have been submitted yet.</p>
            ) : (
                <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review.id} className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-400">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-gray-800">{review.user?.name || 'Unknown User'}</p>
                                    <p className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleString()}</p>
                                </div>
                                <StarRating rating={review.rating} size="md" />
                            </div>
                            {review.comment && (
                                <p className="mt-3 text-gray-700 bg-gray-50 p-3 rounded-md italic">"{review.comment}"</p>
                            )}
                             {review.sale?.items && (
                                <div className="mt-3 border-t pt-2">
                                    <p className="text-xs font-semibold text-gray-500">Items in this order:</p>
                                    <p className="text-sm text-gray-600">
                                        {review.sale.items.map(item => `${item.vegetableName} (${item.quantity})`).join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>  
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewsScreen;