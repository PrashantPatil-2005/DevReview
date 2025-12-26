/**
 * Privacy Banner Component
 * 
 * Prominently displays the privacy guarantee for browser-only analysis.
 */

function PrivacyBanner() {
    return (
        <div style={{
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        }}>
            <span style={{ fontSize: '1.5rem' }}>🔒</span>
            <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>
                    Zero-Trust Mode Active
                </strong>
                <span style={{ opacity: 0.9, fontSize: '0.9rem' }}>
                    All analysis runs locally in your browser. No code is uploaded or stored.
                </span>
            </div>
        </div>
    );
}

export default PrivacyBanner;
