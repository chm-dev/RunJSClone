import React from 'react';
import { Tree } from 'antd';
import { FileCode, FileType } from 'lucide-react';
import type { DataNode } from 'antd/es/tree';

interface ExplorerProps {
  activeFile: 'repl' | 'react';
  onFileSelect: (file: 'repl' | 'react') => void;
}

export const Explorer: React.FC<ExplorerProps> = ({ activeFile, onFileSelect }) => {
  const treeData: DataNode[] = [
    {
      title: 'RunJS Project',
      key: 'root',
      children: [
        {
          title: 'index.ts',
          key: 'repl',
          icon: <FileCode size={14} className="mr-2 text-yellow-500" />,
          isLeaf: true,
        },
        {
          title: 'App.tsx',
          key: 'react',
          icon: <FileType size={14} className="mr-2 text-blue-500" />,
          isLeaf: true,
        },
      ],
    },
  ];

  return (
    <div className="h-full select-none">
      <div className="px-4 py-2 text-xs font-bold text-gray-500">PROJECT</div>
      <Tree
        defaultExpandAll
        selectedKeys={[activeFile]}
        onSelect={(selectedKeys) => {
          if (selectedKeys.length > 0) {
            onFileSelect(selectedKeys[0] as 'repl' | 'react');
          }
        }}
        treeData={treeData}
        className="bg-transparent"
      />
    </div>
  );
};
