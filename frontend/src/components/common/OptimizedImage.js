import React, { useState, useRef, useEffect } from 'react';

const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  placeholder = 'https://via.placeholder.com/80x80?text=Loading...',
  fallback = 'https://via.placeholder.com/80x80?text=No+Image',
  lazy = true 
}) => {
  const [imageSrc, setImageSrc] = useState(lazy ? placeholder : src);
  const [imageRef, setImageRef] = useState();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let observer;
    
    if (lazy && imageRef && imageSrc === placeholder) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.unobserve(imageRef);
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(imageRef);
    }
    
    return () => {
      if (observer && observer.unobserve) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, imageSrc, placeholder, src, lazy]);

  const handleLoad = () => {
    setLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setImageSrc(fallback);
  };

  // Convert to WebP if supported and not already WebP
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc || originalSrc.includes('placeholder') || originalSrc.includes('.webp')) {
      return originalSrc;
    }
    
    // Check if browser supports WebP
    const canvas = document.createElement('canvas');
    const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    if (supportsWebP && originalSrc.includes('unsplash.com')) {
      // Add WebP format parameter for Unsplash images
      return originalSrc.includes('?') 
        ? `${originalSrc}&fm=webp&q=80`
        : `${originalSrc}?fm=webp&q=80`;
    }
    
    return originalSrc;
  };

  return (
    <img
      ref={setImageRef}
      src={getOptimizedSrc(imageSrc)}
      alt={alt}
      width={width}
      height={height}
      className={`${className} ${loaded ? 'image-loaded' : 'image-loading'} ${error ? 'image-error' : ''}`}
      onLoad={handleLoad}
      onError={handleError}
      loading={lazy ? 'lazy' : 'eager'}
      style={{
        transition: 'opacity 0.3s ease',
        opacity: loaded ? 1 : 0.7
      }}
    />
  );
};

export default OptimizedImage;