import React from 'react';
import { Layout, Button, Tooltip, theme } from 'antd';
import { Folder, Package, Settings, Search } from 'lucide-react';

const { Sider, Content, Footer } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
  activeActivity: string;
  onActivityChange: (key: string) => void;
  statusContent?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  sidebarContent,
  activeActivity,
  onActivityChange,
  statusContent
}) => {
  const {
    token: { colorBgContainer, colorBorder },
  } = theme.useToken();

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Activity Bar */}
      <Sider
        width={50}
        theme="dark"
        style={{ borderRight: `1px solid ${colorBorder}` }}
      >
        <div className="flex flex-col h-full items-center py-2 justify-between">
           <div className="flex flex-col gap-2 w-full items-center">
              <Tooltip title="Explorer" placement="right">
                <Button
                  type="text"
                  icon={<Folder size={24} />}
                  className={activeActivity === 'explorer' ? 'text-blue-500' : 'text-gray-400'}
                  onClick={() => onActivityChange('explorer')}
                  style={{ width: 40, height: 40 }}
                />
              </Tooltip>
              <Tooltip title="Search" placement="right">
                <Button
                  type="text"
                  icon={<Search size={24} />}
                  className={activeActivity === 'search' ? 'text-blue-500' : 'text-gray-400'}
                  onClick={() => onActivityChange('search')}
                   style={{ width: 40, height: 40 }}
                />
              </Tooltip>
               <Tooltip title="Packages" placement="right">
                <Button
                  type="text"
                  icon={<Package size={24} />}
                  className={activeActivity === 'packages' ? 'text-blue-500' : 'text-gray-400'}
                  onClick={() => onActivityChange('packages')}
                   style={{ width: 40, height: 40 }}
                />
              </Tooltip>
           </div>
           
           <div className="flex flex-col gap-2 w-full items-center mb-2">
              <Tooltip title="Settings" placement="right">
                <Button
                  type="text"
                  icon={<Settings size={24} />}
                  className="text-gray-400"
                   style={{ width: 40, height: 40 }}
                />
              </Tooltip>
           </div>
        </div>
      </Sider>

      {/* Sidebar (Explorer/Packages View) */}
      <Sider
        width={250}
        theme="light" // Or dark depending on preference, VSCode uses a slightly lighter dark for sidebar
        style={{ 
            background: colorBgContainer, 
            borderRight: `1px solid ${colorBorder}` 
        }}
        collapsible
        collapsed={!activeActivity}
        collapsedWidth={0}
        trigger={null}
      >
        <div className="h-full flex flex-col">
            <div className="p-2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-700/50">
                {activeActivity?.toUpperCase()}
            </div>
            <div className="flex-1 overflow-auto">
                {sidebarContent}
            </div>
        </div>
      </Sider>

      {/* Main Editor Area */}
      <Layout>
        <Content className="bg-[#1e1e1e] relative">
          {children}
        </Content>
        {/* Status Bar */}
        <Footer 
            style={{ 
                padding: '0 12px', 
                height: 24, 
                lineHeight: '24px', 
                background: '#007acc', // VSCode blue or customized 
                color: 'white',
                fontSize: 12
            }}
        >
            {statusContent || "Ready"}
        </Footer>
      </Layout>
    </Layout>
  );
};
