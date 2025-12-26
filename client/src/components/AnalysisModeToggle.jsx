/**
 * Analysis Mode Toggle Component
 * 
 * Switches between Server Analysis and Browser-Only GitHub Analysis.
 */

function AnalysisModeToggle({ mode, onChange }) {
    return (
        <div style={{
            marginBottom: '1.5rem',
        }}>
            <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 500,
                color: '#374151',
            }}>
                Analysis Mode
            </label>
            <div style={{
                display: 'flex',
                gap: '0',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #d1d5db',
            }}>
                <button
                    type="button"
                    onClick={() => onChange('server')}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: 'none',
                        background: mode === 'server' ? '#3b82f6' : 'white',
                        color: mode === 'server' ? 'white' : '#4b5563',
                        fontWeight: mode === 'server' ? 600 : 400,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s',
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>☁️</span>
                    <span>Server Analysis</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        {mode === 'server' ? 'Default mode' : 'Paste code directly'}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => onChange('browser')}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: 'none',
                        borderLeft: '1px solid #d1d5db',
                        background: mode === 'browser' ? '#059669' : 'white',
                        color: mode === 'browser' ? 'white' : '#4b5563',
                        fontWeight: mode === 'browser' ? 600 : 400,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s',
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>🔒</span>
                    <span>Browser-Only GitHub</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        {mode === 'browser' ? 'Zero-trust mode' : 'Import from GitHub'}
                    </span>
                </button>
            </div>
        </div>
    );
}

export default AnalysisModeToggle;
