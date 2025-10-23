import React from 'react';

const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  fallback = 'https://via.placeholder.com/80x80?text=No+Image',
  lazy = false
}) => {
  const handleError = (e) => {
    if (fallback) {
      e.target.src = fallback;
    }
  };

  return (
    <img
      src={src || fallback}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      loading={lazy ? "lazy" : "eager"}
      decoding="async"
    />
  );
};

export default OptimizedImage;