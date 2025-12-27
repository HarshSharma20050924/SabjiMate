import { useState, useEffect } from 'react';
import { getAdminAnalyticsSummary } from '@common/api';
import { AdminAnalyticsSummary } from '@common/types';

export const useAdminAnalytics = () => {
    const [summary, setSummary] = useState<AdminAnalyticsSummary | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d'>('30d');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - (timeRange === '7d' ? 6 : 29));
            try {
                const data = await getAdminAnalyticsSummary(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
                setSummary(data);
            } catch (err) {
                setError('Failed to load analytics data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [timeRange]);

    return { summary, error, isLoading, timeRange, setTimeRange };
};
