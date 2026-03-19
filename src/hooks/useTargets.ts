import { useState, useCallback, useEffect } from 'react';

export interface Target {
  id: string;
  name: string;
  ra: number;  // degrees
  dec: number; // degrees
  addedAt: number;
}

const STORAGE_KEY = 'roman-view-targets';

function loadTargets(): Target[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTargets(targets: Target[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
}

export function useTargets() {
  const [targets, setTargets] = useState<Target[]>(loadTargets);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  useEffect(() => {
    saveTargets(targets);
  }, [targets]);

  const addTarget = useCallback((name: string, ra: number, dec: number) => {
    const id = `${name}-${Date.now()}`;
    setTargets((prev) => [...prev, { id, name, ra, dec, addedAt: Date.now() }]);
    setSelectedTargetId(id);
    return id;
  }, []);

  const removeTarget = useCallback((id: string) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    setSelectedTargetId((prev) => (prev === id ? null : prev));
  }, []);

  const selectTarget = useCallback((id: string | null) => {
    setSelectedTargetId(id);
  }, []);

  const selectedTarget = targets.find((t) => t.id === selectedTargetId) || null;

  return {
    targets,
    selectedTarget,
    selectedTargetId,
    addTarget,
    removeTarget,
    selectTarget,
  };
}
