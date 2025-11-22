import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, Package, X, Loader2 } from 'lucide-react';

interface PackageInfo {
    name: string;
    version: string;
    description: string;
}

interface PackageManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PackageManager: React.FC<PackageManagerProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PackageInfo[]>([]);
    const [installedPackages, setInstalledPackages] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchInstalledPackages();
        }
    }, [isOpen]);

    const fetchInstalledPackages = async () => {
        try {
            const result = await window.electron.getPackages();
            if (result.success) {
                setInstalledPackages(result.packages);
            } else {
                setError(result.error || 'Failed to fetch installed packages');
            }
        } catch (err) {
            setError('Failed to fetch installed packages');
        }
    };

    const searchPackages = async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchQuery)}&size=10`);
            const data = await response.json();
            setSearchResults(data.objects.map((obj: any) => ({
                name: obj.package.name,
                version: obj.package.version,
                description: obj.package.description
            })));
        } catch (err) {
            setError('Failed to search packages');
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async (name: string) => {
        setInstalling(name);
        setError(null);
        try {
            const result = await window.electron.installPackage(name);
            if (result.success) {
                await fetchInstalledPackages();
            } else {
                setError(result.error || `Failed to install ${name}`);
            }
        } catch (err) {
            setError(`Failed to install ${name}`);
        } finally {
            setInstalling(null);
        }
    };

    const handleUninstall = async (name: string) => {
        setInstalling(name); // Reuse installing state for loading indicator
        setError(null);
        try {
            const result = await window.electron.uninstallPackage(name);
            if (result.success) {
                await fetchInstalledPackages();
            } else {
                setError(result.error || `Failed to uninstall ${name}`);
            }
        } catch (err) {
            setError(`Failed to uninstall ${name}`);
        } finally {
            setInstalling(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-[var(--bg-secondary)] w-[600px] max-h-[80vh] rounded-lg shadow-xl flex flex-col border border-[var(--border-color)]">
                {/* Header */}
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-[var(--accent-color)]" />
                        <h2 className="text-lg font-semibold">Package Manager</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-[var(--border-color)]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Search npm packages..."
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--accent-color)] transition-colors"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                searchPackages(e.target.value);
                            }}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {query ? (
                        // Search Results
                        <div className="space-y-2">
                            <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Search Results</h3>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-color)]" />
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((pkg) => (
                                    <div key={pkg.name} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-md border border-[var(--border-color)]">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium truncate">{pkg.name}</span>
                                                <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded">v{pkg.version}</span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] truncate mt-0.5">{pkg.description}</p>
                                        </div>
                                        {installedPackages[pkg.name] ? (
                                            <span className="text-xs text-green-400 font-medium px-3 py-1.5">Installed</span>
                                        ) : (
                                            <button
                                                onClick={() => handleInstall(pkg.name)}
                                                disabled={!!installing}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {installing === pkg.name ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Download className="w-3 h-3" />
                                                )}
                                                Install
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-[var(--text-secondary)]">
                                    No packages found
                                </div>
                            )}
                        </div>
                    ) : (
                        // Installed Packages
                        <div className="space-y-2">
                            <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Installed Packages</h3>
                            {Object.keys(installedPackages).length > 0 ? (
                                Object.entries(installedPackages).map(([name, version]) => (
                                    <div key={name} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-md border border-[var(--border-color)]">
                                        <div>
                                            <span className="font-medium">{name}</span>
                                            <span className="ml-2 text-xs text-[var(--text-secondary)]">v{version.replace('^', '').replace('~', '')}</span>
                                        </div>
                                        <button
                                            onClick={() => handleUninstall(name)}
                                            disabled={!!installing}
                                            className="p-1.5 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Uninstall"
                                        >
                                            {installing === name ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-[var(--text-secondary)]">
                                    No packages installed
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
