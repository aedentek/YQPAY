import { useEffect } from 'react';

// Performance monitoring hook for Web Vitals
export const usePerformanceMonitoring = (pageName) => {
  useEffect(() => {
    // Measure page load performance
    const measurePerformance = () => {
      // Largest Contentful Paint (LCP)
      const observeLCP = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`📊 LCP for ${pageName}:`, lastEntry.startTime);
      });
      
      try {
        observeLCP.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported in some browsers
      }

      // First Input Delay (FID)
      const observeFID = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log(`📊 FID for ${pageName}:`, entry.processingStart - entry.startTime);
        });
      });
      
      try {
        observeFID.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // FID not supported in some browsers
      }

      // Cumulative Layout Shift (CLS) prevention
      const observeCLS = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        if (clsValue > 0) {
          console.log(`📊 CLS for ${pageName}:`, clsValue);
        }
      });
      
      try {
        observeCLS.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // CLS not supported in some browsers
      }

      // Memory usage monitoring
      if (performance.memory) {
        console.log(`📊 Memory usage for ${pageName}:`, {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        });
      }
    };

    // Delay measurement to ensure page is fully loaded
    const timer = setTimeout(measurePerformance, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [pageName]);
};

// Layout shift prevention utilities
export const preventLayoutShift = {
  // Reserve space for images to prevent layout shift
  imageContainer: {
    aspectRatio: '16/9', // or specific ratio
    backgroundColor: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  // Reserve space for skeleton loading
  skeletonContainer: {
    minHeight: '200px', // Reserve minimum height
    backgroundColor: '#f8f9fa'
  }
};

export default usePerformanceMonitoring;