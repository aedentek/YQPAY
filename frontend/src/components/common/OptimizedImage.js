import React, { useState, useEffect } from 'react';

const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  placeholder = 'https://via.placeholder.com/80x80?text=Loading...',
  fallback = 'https://via.placeholder.com/80x80?text=No+Image',
  lazy = false // Changed default to false for faster loading
}) => {
  const [imageSrc, setImageSrc] = useState(src); // Load actual image immediately
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Update image source when src prop changes
    if (src) {
      setImageSrc(src);
      // Preload image for faster display
      const img = new Image();
      img.src = src;
      img.onload = () => setLoaded(true);
      img.onerror = () => {
        setError(true);
        setImageSrc(fallback);
      };
    }
  }, [src, fallback]);

  const handleLoad = () => {
    setLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setImageSrc(fallback);
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={`${className} ${loaded ? 'image-loaded' : 'image-loading'} ${error ? 'image-error' : ''}`}
      onLoad={handleLoad}
      onError={handleError}
      loading="eager" // Load images immediately, not lazy
      decoding="async" // Decode images asynchronously for faster rendering
      style={{
        transition: 'opacity 0.2s ease',
        opacity: loaded ? 1 : 0.8
      }}
    />
  );
};

export default OptimizedImage;