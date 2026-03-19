import type { ReactNode } from 'react';

interface AppLayoutProps {
  viewport: ReactNode;
  sidebar: ReactNode;
  bottomBar: ReactNode;
  header: ReactNode;
  coordinateDisplay: ReactNode;
}

export function AppLayout({ viewport, sidebar, bottomBar, header, coordinateDisplay }: AppLayoutProps) {
  return (
    <div className="w-full h-full flex flex-col bg-roman-bg">
      {/* Header */}
      {header}

      <div className="flex-1 flex min-h-0">
        {/* 3D Viewport */}
        <div className="flex-1 relative">
          {viewport}
          {coordinateDisplay}
        </div>

        {/* Side Panel */}
        <div className="w-80 border-l border-roman-border bg-roman-surface/50 backdrop-blur-xl flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-5 pt-14">
            {sidebar}
          </div>
        </div>
      </div>

      {/* Bottom Timeline Bar */}
      <div className="h-auto border-t border-roman-border bg-roman-surface/50 backdrop-blur-xl p-3 px-4">
        {bottomBar}
      </div>
    </div>
  );
}
