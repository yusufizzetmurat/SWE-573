import { useState, useCallback, useRef, useEffect } from 'react';

export interface ApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseApiCallReturn<T, Args extends any[]> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for managing API call state with automatic request cancellation
 * 
 * @param apiFunction - The API function to call
 * @param options - Configuration options
 * @returns Object containing data, loading, error states and execute function
 * 
 * @example
 * const { data, loading, error, execute } = useApiCall(serviceAPI.list);
 * 
 * useEffect(() => {
 *   execute({});
 * }, [execute]);
 */
export function useApiCall<T, Args extends any[] = []>(
  apiFunction: (...args: [...Args, AbortSignal?]) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    initialData?: T | null;
  } = {}
): UseApiCallReturn<T, Args> {
  const [state, setState] = useState<ApiCallState<T>>({
    data: options.initialData ?? null,
    loading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        // Call the API function with args and signal
        const result = await apiFunction(...args, signal);

        // Only update state if component is still mounted and request wasn't aborted
        if (isMountedRef.current && !signal.aborted) {
          setState({
            data: result,
            loading: false,
            error: null,
          });

          if (options.onSuccess) {
            options.onSuccess(result);
          }

          return result;
        }

        return null;
      } catch (error: any) {
        // Handle aborted requests - set loading to false but don't set error
        if (error.name === 'AbortError' || error.name === 'CanceledError') {
          if (isMountedRef.current) {
            setState((prev) => ({
              ...prev,
              loading: false,
            }));
          }
          return null;
        }

        // Only update state if component is still mounted
        if (isMountedRef.current) {
          const errorMessage = error.response?.data?.detail || error.message || 'An error occurred';
          
          setState({
            data: null,
            loading: false,
            error: errorMessage,
          });

          if (options.onError) {
            options.onError(error);
          }
        }

        return null;
      }
    },
    [apiFunction, options]
  );

  const reset = useCallback(() => {
    setState({
      data: options.initialData ?? null,
      loading: false,
      error: null,
    });
  }, [options.initialData]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute,
    reset,
  };
}
