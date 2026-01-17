import React, { useState, useEffect } from 'react';
import { Input, List, Button, Tag, message } from 'antd';
import { Download, Trash2, Search, Package } from 'lucide-react';

interface PackageInfo {
    name: string;
    version: string;
    description: string;
}

interface PackageSidebarProps {
    mode: 'repl' | 'react';
}

export const PackageSidebar: React.FC<PackageSidebarProps> = ({ mode }) => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PackageInfo[]>([]);
    const [installedPackages, setInstalledPackages] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);

    useEffect(() => {
        fetchInstalledPackages();
    }, [mode]);

    const fetchInstalledPackages = async () => {
        try {
            const result = mode === 'react' 
                ? await window.electron.getReactPackages() 
                : await window.electron.getPackages();
            
            if (result.success) {
                setInstalledPackages(result.packages);
            } else {
                message.error(result.error || 'Failed to fetch installed packages');
            }
        } catch (err) {
            message.error('Failed to fetch installed packages');
        }
    };

    const searchPackages = async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchQuery)}&size=10`);
            const data = await response.json();
            setSearchResults(data.objects.map((obj: any) => ({
                name: obj.package.name,
                version: obj.package.version,
                description: obj.package.description
            })));
        } catch (err) {
            message.error('Failed to search packages');
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async (name: string) => {
        setInstalling(name);
        try {
            const result = mode === 'react'
                ? await window.electron.installReactPackage(name)
                : await window.electron.installPackage(name);

            if (result.success) {
                message.success(`Installed ${name}`);
                await fetchInstalledPackages();
            } else {
                const msg = result.error || `Failed to install ${name}`;
                message.error(msg);
            }
        } catch (err) {
            message.error(`Failed to install ${name}`);
        } finally {
            setInstalling(null);
        }
    };

    const handleUninstall = async (name: string) => {
        setInstalling(name); 
        try {
            const result = mode === 'react'
                ? await window.electron.uninstallReactPackage(name)
                : await window.electron.uninstallPackage(name);

            if (result.success) {
                message.success(`Uninstalled ${name}`);
                await fetchInstalledPackages();
            } else {
                const msg = result.error || `Failed to uninstall ${name}`;
                message.error(msg);
            }
        } catch (err) {
            message.error(`Failed to uninstall ${name}`);
        } finally {
            setInstalling(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
            <div className="p-2 border-b border-[var(--border-color)]">
                <Input
                    prefix={<Search size={14} className="text-gray-400" />}
                    placeholder={`Search packages for ${mode}...`}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        searchPackages(e.target.value);
                    }}
                    allowClear
                    size="small"
                />
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
                 {/* Search Results */}
                 {query && (
                    <div className="mb-4">
                        <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Search Results</div>
                        <List
                            loading={loading}
                            dataSource={searchResults}
                            renderItem={(pkg) => {
                                const isInstalled = !!installedPackages[pkg.name];
                                return (
                                    <List.Item className="!px-2 !py-2 border-b border-gray-800 flex-col items-start gap-1">
                                        <div className="flex w-full justify-between items-start">
                                            <div>
                                                <div className="font-semibold text-sm text-[var(--text-primary)]">{pkg.name}</div>
                                                <div className="text-xs text-[var(--text-secondary)]">{pkg.description}</div>
                                            </div>
                                            {!isInstalled && (
                                                <Button 
                                                    size="small" 
                                                    type="primary"
                                                    ghost
                                                    icon={<Download size={12} />}
                                                    loading={installing === pkg.name}
                                                    onClick={() => handleInstall(pkg.name)}
                                                />
                                            )}
                                            {isInstalled && <Tag color="green">Installed</Tag>}
                                        </div>
                                    </List.Item>
                                );
                            }}
                        />
                    </div>
                )}

                {/* Installed Packages */}
                <div className="mb-4">
                    <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Installed ({mode})</div>
                     <List
                        dataSource={Object.entries(installedPackages)}
                        renderItem={([name, version]) => (
                            <List.Item className="!px-2 !py-2 border-b border-gray-800 flex justify-between items-center group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                     <Package size={14} className="text-gray-400 flex-shrink-0" />
                                     <div className="truncate">
                                        <div className="text-sm font-medium text-[var(--text-primary)]">{name}</div>
                                        <div className="text-xs text-[var(--text-secondary)]">{version}</div>
                                     </div>
                                </div>
                                <Button 
                                    size="small" 
                                    danger 
                                    type="text"
                                    icon={<Trash2 size={12} />}
                                    loading={installing === name}
                                    onClick={() => handleUninstall(name)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </List.Item>
                        )}
                     />
                     {Object.keys(installedPackages).length === 0 && !loading && (
                         <div className="text-center text-xs text-gray-500 py-4">
                             No packages installed in {mode} environment.
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
};
