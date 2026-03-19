import { useState, useMemo } from 'react';
import { getSunPosition, type SunPosition } from '../lib/constraints';

export function useEphemeris() {
  const [epoch, setEpoch] = useState<Date>(() => new Date());

  const sunPosition: SunPosition = useMemo(() => {
    return getSunPosition(epoch);
  }, [epoch.getTime()]);

  const antiSunPosition = useMemo(() => ({
    ra: (sunPosition.ra + 180) % 360,
    dec: -sunPosition.dec,
  }), [sunPosition]);

  return {
    epoch,
    setEpoch,
    sunPosition,
    antiSunPosition,
  };
}
