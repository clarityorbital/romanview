import type { ReactNode } from 'react';

interface AppLayoutProps {
  viewport: ReactNode;
  sidebar: ReactNode;
  bottomBar: ReactNode;
  header: ReactNode;
  coordinateDisplay: ReactNode;
  focalPlaneView?: ReactNode;
}

export function AppLayout({ viewport, sidebar, bottomBar, header, coordinateDisplay, focalPlaneView }: AppLayoutProps) {
  return (
    <div className="w-full h-full relative bg-roman-bg overflow-hidden">
      {/* 3D Viewport — full screen */}
      <div className="absolute inset-0">
        {viewport}
      </div>

      {/* Header — floating top bar */}
      {header}

      {/* Focal Plane View — floating top-left */}
      {focalPlaneView}

      {/* Side Panel — floating HUD overlay */}
      <div className="absolute top-11 right-2 bottom-14 w-72 z-10 flex flex-col pointer-events-none">
        <div className="hud-panel relative rounded-sm flex-1 min-h-0 flex flex-col pointer-events-auto">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {sidebar}
          </div>
        </div>
      </div>

      {/* Coordinate Display — floating bottom-left */}
      {coordinateDisplay}

      {/* Bottom Timeline Bar — floating */}
      <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-auto">
        <div className="hud-panel relative rounded-sm px-3 py-2">
          {bottomBar}
        </div>
      </div>
    </div>
  );
}
