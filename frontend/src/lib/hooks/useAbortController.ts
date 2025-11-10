import { useEffect, useRef } from 'react';

/**
 * Custom hook to manage AbortController for cancelling API requests
 * Automatically aborts requests when component unmounts
 * 
 * @returns AbortSignal to pass to API calls
 * 
 * @example
 * const signal = useAbortController();
 * 
 * useEffect(() => {
 *   const fetchData = async () => {
 *     const data = await serviceAPI.list({}, signal);
 *     setServices(data);
 *   };
 *   fetchData();
 * }, [signal]);
 */
export function useAbortController(): AbortSignal {
  const abortControllerRef = useRef<AbortController>(new AbortController());

  useEffect(() => {
    // Cleanup: abort all pending requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return abortControllerRef.current.signal;
}
