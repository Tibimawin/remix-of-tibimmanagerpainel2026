import { useState, useEffect, useCallback } from 'react';

const ZOOM_KEY = 'panel-zoom-level';
const MIN_ZOOM = 50;
const MAX_ZOOM = 150;
const ZOOM_STEP = 10;
const DEFAULT_ZOOM = 100;

export const useZoom = () => {
  const [zoom, setZoom] = useState<number>(() => {
    const saved = localStorage.getItem(ZOOM_KEY);
    return saved ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parseInt(saved, 10))) : DEFAULT_ZOOM;
  });

  // Aplicar zoom no documento
  useEffect(() => {
    document.documentElement.style.setProperty('--app-zoom', `${zoom / 100}`);
    localStorage.setItem(ZOOM_KEY, zoom.toString());
  }, [zoom]);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  const setZoomLevel = useCallback((level: number) => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level)));
  }, []);

  return {
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoomLevel,
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > MIN_ZOOM,
    isDefaultZoom: zoom === DEFAULT_ZOOM,
  };
};
