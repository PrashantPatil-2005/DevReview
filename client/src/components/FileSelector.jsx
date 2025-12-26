/**
 * File Selector Component
 * 
 * Displays fetched files and allows selection for analysis.
 */

import { useState, useEffect } from 'react';
import { LIMITS } from '../services/githubService';

function FileSelector({ files, repoInfo, onAnalyze, onCancel, loading }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const maxFiles = LIMITS.MAX_FILES;

    // Pre-select first N files by default
    useEffect(() => {
        const initialSelection = files.slice(0, maxFiles).map(f => f.path);
        setSelectedFiles(initialSelection);
    }, [files, maxFiles]);

    const handleToggleFile = (path) => {
        setSelectedFiles(prev => {
            if (prev.includes(path)) {
                return prev.filter(p => p !== path);
            }
            if (prev.length >= maxFiles) {
                return prev; // Already at max
            }
            return [...prev, path];
        });
    };

    const handleSelectAll = () => {
        setSelectedFiles(files.slice(0, maxFiles).map(f => f.path));
    };

    const handleDeselectAll = () => {
        setSelectedFiles([]);
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1.5rem',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
            }}>
                <h3 style={{ margin: 0, color: '#1e293b' }}>
                    📁 Select Files to Analyze
                </h3>
                <span style={{
                    background: selectedFiles.length === maxFiles ? '#fef3c7' : '#dbeafe',
                    color: selectedFiles.length === maxFiles ? '#92400e' : '#1e40af',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                }}>
                    {selectedFiles.length}/{maxFiles} selected
                </span>
            </div>

            {repoInfo && (
                <div style={{
                    fontSize: '0.9rem',
                    color: '#64748b',
                    marginBottom: '1rem',
                    padding: '8px 12px',
                    background: '#f1f5f9',
                    borderRadius: '6px',
                }}>
                    {repoInfo.type === 'pr' ? (
                        <span>📋 PR #{repoInfo.prNumber}: {repoInfo.title || 'Pull Request'}</span>
                    ) : (
                        <span>📂 {repoInfo.owner}/{repoInfo.repo} @ {repoInfo.ref}</span>
                    )}
                    <span style={{ marginLeft: '12px', color: '#94a3b8' }}>
                        ({repoInfo.totalFiles} files found)
                    </span>
                </div>
            )}

            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '1rem',
            }}>
                <button
                    onClick={handleSelectAll}
                    disabled={loading}
                    style={{
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                        background: '#e2e8f0',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Select All ({Math.min(files.length, maxFiles)})
                </button>
                <button
                    onClick={handleDeselectAll}
                    disabled={loading}
                    style={{
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                        background: '#e2e8f0',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Deselect All
                </button>
            </div>

            <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: 'white',
            }}>
                {files.map((file) => (
                    <label
                        key={file.path}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            background: selectedFiles.includes(file.path) ? '#eff6ff' : 'transparent',
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.path)}
                            onChange={() => handleToggleFile(file.path)}
                            disabled={loading || (!selectedFiles.includes(file.path) && selectedFiles.length >= maxFiles)}
                            style={{ marginRight: '12px' }}
                        />
                        <span style={{
                            flex: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            color: '#334155',
                        }}>
                            {file.path}
                        </span>
                        {file.size && (
                            <span style={{
                                fontSize: '0.8rem',
                                color: '#94a3b8',
                            }}>
                                {formatSize(file.size)}
                            </span>
                        )}
                        {file.status && (
                            <span style={{
                                fontSize: '0.75rem',
                                marginLeft: '8px',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: file.status === 'added' ? '#dcfce7' :
                                    file.status === 'modified' ? '#fef3c7' : '#fee2e2',
                                color: file.status === 'added' ? '#166534' :
                                    file.status === 'modified' ? '#92400e' : '#dc2626',
                            }}>
                                {file.status}
                            </span>
                        )}
                    </label>
                ))}
            </div>

            <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '1.5rem',
            }}>
                <button
                    onClick={() => onAnalyze(selectedFiles)}
                    disabled={selectedFiles.length === 0 || loading}
                    style={{
                        flex: 1,
                        background: selectedFiles.length === 0 ? '#94a3b8' : '#22c55e',
                        color: 'white',
                        border: 'none',
                        padding: '14px 24px',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        fontWeight: 500,
                        cursor: selectedFiles.length === 0 || loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    {loading ? (
                        <>
                            <span style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid white',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                            }} />
                            Analyzing...
                        </>
                    ) : (
                        <>🔍 Analyze {selectedFiles.length} Files</>
                    )}
                </button>
                <button
                    onClick={onCancel}
                    disabled={loading}
                    style={{
                        padding: '14px 24px',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                >
                    Cancel
                </button>
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default FileSelector;
