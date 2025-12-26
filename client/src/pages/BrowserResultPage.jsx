/**
 * Browser Results Page
 * 
 * Displays analysis results for browser-only GitHub analysis.
 * No backend calls, no history storage.
 */

import { Link } from 'react-router-dom';
import PrivacyBanner from '../components/PrivacyBanner';
import VerdictBadge from '../components/VerdictBadge';

function BrowserResultPage({ result, onNewAnalysis }) {
    if (!result) {
        return (
            <div>
                <div className="error">No analysis result available</div>
                <Link to="/">← Back to Submit</Link>
            </div>
        );
    }

    const {
        totalScore,
        aggregated,
        files,
        verdict,
        verdictOverrideReason,
        criticalIssues,
        proofHash,
        analyzedAt,
        analysisTimeMs,
        fileCount,
    } = result;

    // Use aggregated scores or single file scores
    const scores = aggregated || result;

    const getScoreClass = (score, max = 100) => {
        const percentage = (score / max) * 100;
        if (percentage >= 80) return 'score-good';
        if (percentage >= 50) return 'score-okay';
        return 'score-bad';
    };

    const categories = [
        { key: 'readability', label: 'Readability', data: scores.readability },
        { key: 'complexity', label: 'Complexity', data: scores.complexity },
        { key: 'edgeCases', label: 'Edge Cases', data: scores.edgeCases },
        { key: 'security', label: 'Security', data: scores.security },
    ];

    return (
        <div>
            <PrivacyBanner />

            <h1>Browser Analysis Results</h1>

            {/* Verdict Badge */}
            <VerdictBadge
                verdict={verdict}
                totalScore={totalScore}
                overrideReason={verdictOverrideReason}
            />

            {/* Metadata */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                color: '#64748b',
            }}>
                <span>📁 {fileCount || 1} file(s) analyzed</span>
                <span>⏱️ {analysisTimeMs}ms</span>
                <span>📅 {new Date(analyzedAt).toLocaleString()}</span>
            </div>

            {/* Category Breakdown */}
            <div className="categories">
                {categories.map(({ key, label, data }) => (
                    <div key={key} className="category-card">
                        <div className={`score ${getScoreClass(data?.score || 0, 25)}`}>
                            {data?.score || 0}/25
                        </div>
                        <div className="label">{label}</div>
                    </div>
                ))}
            </div>

            {/* Critical Issues Section */}
            {criticalIssues && criticalIssues.length > 0 && (
                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginTop: '1.5rem',
                }}>
                    <h3 style={{ color: '#dc2626', margin: '0 0 1rem 0' }}>
                        🚨 Critical Security Issues ({criticalIssues.length})
                    </h3>
                    {criticalIssues.map((issue, idx) => (
                        <div key={idx} style={{
                            background: 'white',
                            padding: '12px',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            borderLeft: '3px solid #dc2626',
                        }}>
                            <strong style={{ color: '#1e293b' }}>{issue.filename}</strong>
                            <div style={{ color: '#dc2626', marginTop: '4px' }}>
                                {issue.comment}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reviewer Comments */}
            <div className="comments-section" style={{ marginTop: '1.5rem' }}>
                <h2>Reviewer Comments</h2>

                {categories.map(({ key, label, data }) => (
                    <div key={key} className="comment-group">
                        <h3>{label}</h3>
                        {!data?.comments || data.comments.length === 0 ? (
                            <p className="no-comments">No issues found</p>
                        ) : (
                            data.comments.slice(0, 10).map((comment, idx) => (
                                <div key={idx} className="comment">{comment}</div>
                            ))
                        )}
                        {data?.comments?.length > 10 && (
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                ... and {data.comments.length - 10} more
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Per-file Results (if multiple files) */}
            {files && files.length > 1 && (
                <div style={{ marginTop: '2rem' }}>
                    <h2>Per-File Scores</h2>
                    <div style={{
                        display: 'grid',
                        gap: '1rem',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    }}>
                        {files.map((file, idx) => (
                            <div key={idx} style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '1rem',
                            }}>
                                <div style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    color: '#334155',
                                    marginBottom: '8px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {file.filename}
                                </div>
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 600,
                                    color: file.error ? '#dc2626' :
                                        file.totalScore >= 80 ? '#22c55e' :
                                            file.totalScore >= 50 ? '#f59e0b' : '#ef4444',
                                }}>
                                    {file.error ? 'Error' : `${file.totalScore}/100`}
                                </div>
                                {file.error && (
                                    <div style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                                        {file.error}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Proof Hash */}
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: '#f1f5f9',
                borderRadius: '8px',
            }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#334155' }}>
                    🔐 Deterministic Proof
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 8px 0' }}>
                    SHA-256 hash of analyzed source bundle (locally generated):
                </p>
                <code style={{
                    display: 'block',
                    background: '#1e293b',
                    color: '#22d3ee',
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                }}>
                    {proofHash}
                </code>
            </div>

            {/* Actions */}
            <div style={{
                marginTop: '2rem',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
            }}>
                <button
                    onClick={onNewAnalysis}
                    style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                    }}
                >
                    ← New Analysis
                </button>
                <Link
                    to="/"
                    style={{
                        background: '#e2e8f0',
                        color: '#334155',
                        padding: '12px 24px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '1rem',
                    }}
                >
                    Back to Home
                </Link>
            </div>

            {/* Privacy Reminder */}
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#166534',
            }}>
                <strong>✓ Privacy Verified:</strong> This analysis was performed entirely in your browser.
                No code was uploaded, no data was stored, and no backend requests were made.
            </div>
        </div>
    );
}

export default BrowserResultPage;
