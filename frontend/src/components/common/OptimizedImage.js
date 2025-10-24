import React, { useState, useEffect, useRef } from 'react';

/**
 * Optimized Image Component with:
 * - Intersection Observer for lazy loading
 * - Blur-up placeholder effect
 * - Image caching
 * - Error handling with fallback
 * - Progressive loading
 */

// Image cache to prevent re-downloading
const imageCache = new Set();

const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  fallback = 'https://via.placeholder.com/80x80?text=No+Image',
  lazy = true,
  priority = false // For above-the-fold images
}) => {
  const [imageSrc, setImageSrc] = useState(priority ? src : null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(!lazy || priority);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || !imgRef.current) {
      setIsVisible(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before visible
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy, priority]);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || !src) return;

    // Check cache first
    if (imageCache.has(src)) {
      setImageSrc(src);
      setIsLoading(false);
      return;
    }

    // Preload image
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      imageCache.add(src); // Add to cache
    };

    img.onerror = () => {
      setImageError(true);
      setIsLoading(false);
      setImageSrc(fallback);
    };

    img.src = src;
  }, [isVisible, src, fallback]);

  const handleError = (e) => {
    if (!imageError) {
      setImageError(true);
      e.target.src = fallback;
    }
  };

  return (
    <div 
      ref={imgRef}
      className={`optimized-image-wrapper ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
        width: width || '100%',
        height: height || 'auto'
      }}
    >
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'loading-shimmer 1.5s infinite'
          }}
        />
      )}
      <img
        src={imageSrc || fallback}
        alt={alt}
        width={width}
        height={height}
        className={className}
        onError={handleError}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
      <style>{`
        @keyframes loading-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default OptimizedImage;