// localStorage-based map storage

import type { MapData } from './editor';

const STORAGE_KEY = 'parking-simulator-maps';

export function getSavedMaps(): Record<string, MapData> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load maps from localStorage:', e);
  }
  return {};
}

export function saveMap(name: string, data: MapData): void {
  try {
    const maps = getSavedMaps();
    maps[name] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  } catch (e) {
    console.error('Failed to save map to localStorage:', e);
  }
}

export function deleteMap(name: string): void {
  try {
    const maps = getSavedMaps();
    delete maps[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  } catch (e) {
    console.error('Failed to delete map from localStorage:', e);
  }
}

export function getMapNames(): string[] {
  return Object.keys(getSavedMaps());
}

export function loadMap(name: string): MapData | null {
  const maps = getSavedMaps();
  return maps[name] || null;
}
