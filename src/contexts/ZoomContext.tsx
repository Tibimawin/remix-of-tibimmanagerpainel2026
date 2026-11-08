import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const ZOOM_KEY = 'panel-zoom-level';
const MIN_ZOOM = 50;
const MAX_ZOOM = 150;
const ZOOM_STEP = 10;
const DEFAULT_ZOOM = 100;

interface ZoomContextType {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoomLevel: (level: number) => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  isDefaultZoom: boolean;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

export const ZoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [zoom, setZoom] = useState<number>(() => {
    const saved = localStorage.getItem(ZOOM_KEY);
    return saved ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parseInt(saved, 10))) : DEFAULT_ZOOM;
  });

  // Salvar no localStorage quando mudar
  useEffect(() => {
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

  return (
    <ZoomContext.Provider
      value={{
        zoom,
        zoomIn,
        zoomOut,
        resetZoom,
        setZoomLevel,
        canZoomIn: zoom < MAX_ZOOM,
        canZoomOut: zoom > MIN_ZOOM,
        isDefaultZoom: zoom === DEFAULT_ZOOM,
      }}
    >
      {children}
    </ZoomContext.Provider>
  );
};

export const useZoom = (): ZoomContextType => {
  const context = useContext(ZoomContext);
  if (!context) {
    throw new Error('useZoom must be used within a ZoomProvider');
  }
  return context;
};
