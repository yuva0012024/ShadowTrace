import { useState, useCallback } from 'react';
import { analyzeSingleIP, analyzeMultipleIPs } from '../services/api';

export function useIPAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const runSingleAnalysis = useCallback(async (ip) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await analyzeSingleIP(ip);
      setData(response);
      return response;
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.message ||
        'Unable to retrieve IP information. Please try again.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const runMultipleAnalysis = useCallback(async (ips) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await analyzeMultipleIPs(ips);
      setData(response);
      return response;
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.message ||
        'Unable to complete batch analysis. Please try again.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    runSingleAnalysis,
    runMultipleAnalysis,
    resetAnalysis
  };
}
