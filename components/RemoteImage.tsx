
import React, { useEffect, useState } from 'react';
import { getImageUrl } from '../domain/imageStore';

interface Props {
  imageUrl?: string;
  imageId?: string;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Hook to resolve an image URL from either a direct URL or an IndexedDB imageId.
 */
export const useRemoteImage = (imageUrl?: string, imageId?: string) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(imageUrl || null);
  const [loading, setLoading] = useState(!!imageId && !imageUrl);

  useEffect(() => {
    if (imageUrl) {
      setResolvedUrl(imageUrl);
      setLoading(false);
      return;
    }

    if (imageId) {
      setLoading(true);
      getImageUrl(imageId).then(url => {
        setResolvedUrl(url);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setResolvedUrl(null);
      setLoading(false);
    }
  }, [imageUrl, imageId]);

  return { resolvedUrl, loading };
};

/**
 * Renders an image from either a direct URL or an IndexedDB imageId.
 * Handles the async loading of IndexedDB images.
 */
export const RemoteImage: React.FC<Props> = ({ imageUrl, imageId, alt, style, className, fallback }) => {
  const { resolvedUrl, loading } = useRemoteImage(imageUrl, imageId);

  if (loading) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' }} className={className}>
        <div className="animate-pulse w-full h-full bg-gray-200" />
      </div>
    );
  }

  if (!resolvedUrl) {
    return <>{fallback}</>;
  }

  return (
    <img 
      src={resolvedUrl} 
      alt={alt} 
      style={style} 
      className={className} 
      referrerPolicy="no-referrer"
    />
  );
};
