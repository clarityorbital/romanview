import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { CelestialScene } from './components/scene/CelestialScene';
import { Header } from './components/ui/Header';
import { TargetSearch } from './components/ui/TargetSearch';
import { TargetList } from './components/ui/TargetList';
import { EpochSlider } from './components/ui/EpochSlider';
import { PASlider } from './components/ui/PASlider';
import { ShareButton } from './components/ui/ShareButton';
import { ExportButton } from './components/ui/ExportButton';
import { InstrumentPanel } from './components/ui/InstrumentPanel';
import { ObservabilityTimeline } from './components/ui/ObservabilityTimeline';
import { CoordinateDisplay } from './components/ui/CoordinateDisplay';
import { FocalPlaneView } from './components/ui/FocalPlaneView';
import { useTargets } from './hooks/useTargets';
import { useEphemeris } from './hooks/useEphemeris';
import { useGaiaStars } from './hooks/useGaiaStars';
import { positionAngle } from './lib/coordinates';
import { computeRollRange } from './lib/rollRange';
import { encodeToHash, decodeFromHash } from './lib/urlState';

function App() {
  const { targets, selectedTarget, selectedTargetId, addTarget, removeTarget, selectTarget } = useTargets();
  const { epoch, setEpoch, sunPosition } = useEphemeris();
  const { stars: gaiaStars, status: gaiaStatus } = useGaiaStars(selectedTarget?.ra, selectedTarget?.dec);

  const [showGrid, setShowGrid] = useState(true);
  const [showConstraints, setShowConstraints] = useState(true);
  const [showGalactic, setShowGalactic] = useState(false);

  // --- PA state lifted to App level ---
  const [paOverride, setPAOverride] = useState<number | null>(null);

  // Ref to suppress URL -> state -> URL feedback loop
  const skipNextHashUpdate = useRef(false);
  // Ref to track whether initial hash hydration has run
  const hashHydrated = useRef(false);

  // Compute nominal V3PA from target and Sun geometry
  const nominalV3PA = useMemo(() => {
    if (!selectedTarget) return null;
    return positionAngle(selectedTarget.ra, selectedTarget.dec, sunPosition.ra, sunPosition.dec);
  }, [selectedTarget?.ra, selectedTarget?.dec, sunPosition.ra, sunPosition.dec]);

  // Compute roll range for PA slider bounds
  const rollRange = useMemo(() => {
    if (!selectedTarget) return null;
    return computeRollRange(selectedTarget.ra, selectedTarget.dec, sunPosition.ra, sunPosition.dec);
  }, [selectedTarget?.ra, selectedTarget?.dec, sunPosition.ra, sunPosition.dec]);

  // Effective V3PA: user override or nominal
  const effectiveV3PA = paOverride ?? nominalV3PA;

  // Reset PA override when target or epoch changes (so nominal PA recomputes for new context)
  const prevTargetId = useRef<string | null>(null);
  const prevEpochMs = useRef<number>(epoch.getTime());
  useEffect(() => {
    const targetChanged = selectedTargetId !== prevTargetId.current;
    const epochChanged = epoch.getTime() !== prevEpochMs.current;
    prevTargetId.current = selectedTargetId;
    prevEpochMs.current = epoch.getTime();

    if (targetChanged || epochChanged) {
      // Don't reset on initial hash hydration
      if (hashHydrated.current) {
        setPAOverride(null);
      }
    }
  }, [selectedTargetId, epoch]);

  // --- URL hash hydration on initial load ---
  useEffect(() => {
    if (hashHydrated.current) return;
    hashHydrated.current = true;

    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    const params = decodeFromHash(hash);

    if (params.ra !== undefined && params.dec !== undefined) {
      const name = params.name ?? `${params.ra.toFixed(3)}, ${params.dec.toFixed(3)}`;
      skipNextHashUpdate.current = true;
      addTarget(name, params.ra, params.dec);
    }

    if (params.pa !== undefined) {
      setPAOverride(params.pa);
    }

    if (params.date) {
      const d = new Date(params.date);
      if (!isNaN(d.getTime())) {
        setEpoch(d);
      }
    }
  }, [addTarget, setEpoch]);

  // --- URL hash sync: state -> URL ---
  useEffect(() => {
    if (skipNextHashUpdate.current) {
      skipNextHashUpdate.current = false;
      return;
    }

    if (!selectedTarget) {
      // Clear hash when no target selected
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname);
      }
      return;
    }

    const newHash = encodeToHash({
      ra: selectedTarget.ra,
      dec: selectedTarget.dec,
      name: selectedTarget.name,
      pa: paOverride ?? undefined,
      date: epoch.toISOString().split('T')[0],
    });

    // Use replaceState to avoid triggering hashchange/popstate events
    history.replaceState(null, '', window.location.pathname + newHash);
  }, [selectedTarget?.ra, selectedTarget?.dec, selectedTarget?.name, paOverride, epoch]);

  // --- popstate listener for browser back/forward ---
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (!hash || hash === '#') return;

      const params = decodeFromHash(hash);

      if (params.ra !== undefined && params.dec !== undefined) {
        const name = params.name ?? `${params.ra.toFixed(3)}, ${params.dec.toFixed(3)}`;
        skipNextHashUpdate.current = true;
        addTarget(name, params.ra, params.dec);
      }

      if (params.pa !== undefined) {
        setPAOverride(params.pa);
      }

      if (params.date) {
        const d = new Date(params.date);
        if (!isNaN(d.getTime())) {
          setEpoch(d);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [addTarget, setEpoch]);

  const handleAddTarget = useCallback(
    (name: string, ra: number, dec: number) => {
      addTarget(name, ra, dec);
    },
    [addTarget]
  );

  // Compute share URL
  const shareUrl = useMemo(() => {
    if (!selectedTarget) return window.location.href;
    const hash = encodeToHash({
      ra: selectedTarget.ra,
      dec: selectedTarget.dec,
      name: selectedTarget.name,
      pa: paOverride ?? undefined,
      date: epoch.toISOString().split('T')[0],
    });
    return window.location.origin + window.location.pathname + hash;
  }, [selectedTarget?.ra, selectedTarget?.dec, selectedTarget?.name, paOverride, epoch]);

  // Observable flag: roll range exists when target is within Sun constraints
  const isObservable = rollRange !== null;

  return (
    <AppLayout
      header={
        <Header
          showGrid={showGrid}
          showConstraints={showConstraints}
          showGalactic={showGalactic}
          onToggleGrid={() => setShowGrid((v) => !v)}
          onToggleConstraints={() => setShowConstraints((v) => !v)}
          onToggleGalactic={() => setShowGalactic((v) => !v)}
          shareButton={selectedTarget ? <ShareButton url={shareUrl} /> : undefined}
          exportButton={
            <ExportButton
              targetRa={selectedTarget?.ra ?? 0}
              targetDec={selectedTarget?.dec ?? 0}
              v3pa={effectiveV3PA ?? 0}
              targetName={selectedTarget?.name}
              disabled={!selectedTarget || effectiveV3PA === null}
            />
          }
        />
      }
      viewport={
        <CelestialScene
          sunPosition={sunPosition}
          selectedTarget={selectedTarget}
          v3pa={effectiveV3PA}
          showGrid={showGrid}
          showConstraints={showConstraints}
          showGalactic={showGalactic}
          gaiaStars={gaiaStars}
        />
      }
      focalPlaneView={
        selectedTarget && effectiveV3PA !== null ? (
          <FocalPlaneView
            targetRa={selectedTarget.ra}
            targetDec={selectedTarget.dec}
            v3pa={effectiveV3PA}
            gaiaStars={gaiaStars}
            gaiaStatus={gaiaStatus}
          />
        ) : undefined
      }
      coordinateDisplay={
        <CoordinateDisplay
          sunPosition={sunPosition}
          epoch={epoch}
          selectedRa={selectedTarget?.ra}
          selectedDec={selectedTarget?.dec}
        />
      }
      sidebar={
        <>
          <TargetSearch onAddTarget={handleAddTarget} />
          <div className="h-px bg-white/[0.04]" />
          <TargetList
            targets={targets}
            selectedTargetId={selectedTargetId}
            epoch={epoch}
            onSelect={selectTarget}
            onRemove={removeTarget}
          />
          <div className="h-px bg-white/[0.04]" />
          <EpochSlider epoch={epoch} onChange={setEpoch} />
          <div className="h-px bg-white/[0.04]" />
          {selectedTarget && (
            <>
              <PASlider
                nominalPA={rollRange?.nominal ?? nominalV3PA ?? 0}
                minPA={rollRange?.min ?? (nominalV3PA ?? 0) - 15}
                maxPA={rollRange?.max ?? (nominalV3PA ?? 0) + 15}
                currentPA={effectiveV3PA ?? nominalV3PA ?? 0}
                onPAChange={(pa) => setPAOverride(pa)}
                observable={isObservable}
              />
              <div className="h-px bg-white/[0.04]" />
            </>
          )}
          <InstrumentPanel />
        </>
      }
      bottomBar={
        <ObservabilityTimeline
          targets={targets}
          epoch={epoch}
          onEpochChange={setEpoch}
          onSelectTarget={selectTarget}
        />
      }
    />
  );
}

export default App;
