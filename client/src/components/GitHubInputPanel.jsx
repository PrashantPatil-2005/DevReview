/**
 * GitHub Input Panel Component
 * 
 * Accepts GitHub repository or PR URLs and fetches file list.
 */

import { useState } from 'react';
import {
    validateGitHubUrl,
    getUrlDisplayInfo,
    fetchRepoFiles,
    fetchPRFiles,
    parseGitHubUrl,
    LIMITS
} from '../services/githubService';

function GitHubInputPanel({ onFilesLoaded, disabled }) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [urlInfo, setUrlInfo] = useState('');

    const handleUrlChange = (e) => {
        const value = e.target.value;
        setUrl(value);
        setError('');

        if (value.trim()) {
            const validation = validateGitHubUrl(value);
            if (validation.valid) {
                setUrlInfo(getUrlDisplayInfo(value));
            } else {
                setUrlInfo('');
            }
        } else {
            setUrlInfo('');
        }
    };

    const handleFetchFiles = async () => {
        const validation = validateGitHubUrl(url);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const parsed = parseGitHubUrl(url);
            let result;

            if (parsed.type === 'pr') {
                result = await fetchPRFiles(parsed.owner, parsed.repo, parsed.prNumber);
            } else {
                result = await fetchRepoFiles(parsed.owner, parsed.repo, parsed.ref, parsed.path);
            }

            if (result.files.length === 0) {
                setError('No JavaScript or TypeScript files found in this location.');
                setLoading(false);
                return;
            }

            onFilesLoaded({
                ...result,
                type: parsed.type,
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1rem',
        }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>
                📂 Import from GitHub
            </h3>

            <p style={{
                fontSize: '0.9rem',
                color: '#64748b',
                marginBottom: '1rem'
            }}>
                Enter a public GitHub repository URL or pull request URL.
                Supported files: {LIMITS.SUPPORTED_EXTENSIONS.join(', ')}
            </p>

            <div style={{ marginBottom: '1rem' }}>
                <input
                    type="url"
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="https://github.com/owner/repo or https://github.com/owner/repo/pull/123"
                    disabled={loading || disabled}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '1rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxSizing: 'border-box',
                    }}
                />
                {urlInfo && (
                    <div style={{
                        marginTop: '8px',
                        fontSize: '0.85rem',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}>
                        ✓ {urlInfo}
                    </div>
                )}
            </div>

            {error && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                }}>
                    {error}
                </div>
            )}

            <button
                onClick={handleFetchFiles}
                disabled={!url.trim() || loading || disabled}
                style={{
                    background: loading ? '#94a3b8' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}
            >
                {loading ? (
                    <>
                        <span className="spinner" style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid white',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                        }} />
                        Fetching Files...
                    </>
                ) : (
                    <>📥 Fetch Files</>
                )}
            </button>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default GitHubInputPanel;
