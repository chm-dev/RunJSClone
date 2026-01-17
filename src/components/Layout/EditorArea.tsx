import React from 'react';
import { Tabs, Button, Tooltip, theme } from 'antd';
import { Play, Trash2 } from 'lucide-react';

interface EditorAreaProps {
  activeMode: 'repl' | 'react';
  onTabChange: (key: string) => void;
  onRun: () => void;
  onClear: () => void;
  children: React.ReactNode;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  activeMode,
  onTabChange,
  onRun,
  onClear,
  children
}) => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const items = [
    {
      label: 'index.ts',
      key: 'repl',
      // We render children here. Antd will only mount the active one.
      // Since 'children' is passed from parent (App), it already contains the correct content for the active mode.
      children: <div className="h-full w-full">{children}</div>, 
    },
    {
      label: 'App.tsx',
      key: 'react',
      children: <div className="h-full w-full">{children}</div>,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--editor-bg)]">
      <Tabs
        activeKey={activeMode}
        onChange={onTabChange}
        type="card"
        size="small"
        items={items}
        tabBarExtraContent={
          <div className="flex items-center gap-1 pr-2">
            {activeMode === 'repl' && (
              <Tooltip title="Clear Output">
                <Button
                  type="text"
                  icon={<Trash2 size={16} />}
                  onClick={onClear}
                  className="text-gray-400 hover:text-white"
                />
              </Tooltip>
            )}
            <Tooltip title={activeMode === 'react' ? "Run (Auto)" : "Run Code"}>
              <Button
                type="text"
                icon={<Play size={16} className={activeMode === 'repl' ? "text-green-500" : "text-gray-500"} />}
                onClick={onRun}
                className="hover:bg-gray-700"
                disabled={activeMode === 'react'} // React mode auto-runs
              />
            </Tooltip>
          </div>
        }
        className="editor-tabs"
        style={{ height: '100%' }}
      />
    </div>
  );
};
