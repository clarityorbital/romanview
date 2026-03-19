import { useState, useCallback } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { CelestialScene } from './components/scene/CelestialScene';
import { Header } from './components/ui/Header';
import { TargetSearch } from './components/ui/TargetSearch';
import { TargetList } from './components/ui/TargetList';
import { EpochSlider } from './components/ui/EpochSlider';
import { InstrumentPanel } from './components/ui/InstrumentPanel';
import { ObservabilityTimeline } from './components/ui/ObservabilityTimeline';
import { CoordinateDisplay } from './components/ui/CoordinateDisplay';
import { useTargets } from './hooks/useTargets';
import { useEphemeris } from './hooks/useEphemeris';

function App() {
  const { targets, selectedTarget, selectedTargetId, addTarget, removeTarget, selectTarget } = useTargets();
  const { epoch, setEpoch, sunPosition } = useEphemeris();

  const [showGrid, setShowGrid] = useState(true);
  const [showConstraints, setShowConstraints] = useState(true);
  const [showGalactic, setShowGalactic] = useState(false);

  const handleAddTarget = useCallback(
    (name: string, ra: number, dec: number) => {
      addTarget(name, ra, dec);
    },
    [addTarget]
  );

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
        />
      }
      viewport={
        <CelestialScene
          sunPosition={sunPosition}
          selectedTarget={selectedTarget}
          showGrid={showGrid}
          showConstraints={showConstraints}
          showGalactic={showGalactic}
        />
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
          <div className="border-t border-roman-border" />
          <TargetList
            targets={targets}
            selectedTargetId={selectedTargetId}
            epoch={epoch}
            onSelect={selectTarget}
            onRemove={removeTarget}
          />
          <div className="border-t border-roman-border" />
          <EpochSlider epoch={epoch} onChange={setEpoch} />
          <div className="border-t border-roman-border" />
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
