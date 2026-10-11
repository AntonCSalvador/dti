"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

export function ItemImage({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return src && failedSource !== src ? (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
      onError={() => setFailedSource(src)}
    />
  ) : (
    <div
      className={`image-fallback ${className}`}
      role="img"
      aria-label={`${alt}: image unavailable`}
    >
      <ImageOff size={24} />
      <span>Image unavailable</span>
    </div>
  );
}
