/**
 * Verdict Badge Component
 * 
 * Displays the PR-style verdict as a prominent badge.
 */

import { VERDICT_CONFIG } from '../analysis/verdictEngine';

function VerdictBadge({ verdict, totalScore, overrideReason }) {
    const config = VERDICT_CONFIG[verdict];

    if (!config) {
        return null;
    }

    return (
        <div style={{
            background: `${config.color}15`,
            border: `2px solid ${config.color}`,
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
        }}>
            <div style={{
                fontSize: '2.5rem',
                marginBottom: '8px',
            }}>
                {config.icon}
            </div>
            <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: config.color,
                marginBottom: '4px',
            }}>
                {config.label}
            </div>
            <div style={{
                fontSize: '2rem',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '8px',
            }}>
                {totalScore}/100
            </div>
            <div style={{
                fontSize: '0.95rem',
                color: '#64748b',
            }}>
                {config.description}
            </div>

            {overrideReason && (
                <div style={{
                    marginTop: '1rem',
                    padding: '12px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '0.9rem',
                    textAlign: 'left',
                }}>
                    <strong>⚠️ Verdict Override:</strong> {overrideReason}
                </div>
            )}
        </div>
    );
}

export default VerdictBadge;
