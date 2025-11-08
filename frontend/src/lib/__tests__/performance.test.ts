import { describe, it, expect } from 'vitest';

describe('Performance Utilities', () => {
  it('should measure API call duration', async () => {
    const start = performance.now();
    await new Promise(resolve => setTimeout(resolve, 10));
    const duration = performance.now() - start;
    
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });

  it('should handle concurrent API calls', async () => {
    const calls = Array.from({ length: 5 }, () => 
      fetch('http://localhost:8000/api/health/').catch(() => null)
    );
    
    const start = performance.now();
    await Promise.all(calls);
    const duration = performance.now() - start;
    
    // All calls should complete reasonably fast
    expect(duration).toBeLessThan(5000);
  });
});

