import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReviewById, isLocalId } from '../services/localHistoryService';

// Use relative URL in production (same domain), localhost for dev
const API_URL = import.meta.env.VITE_API_URL || '';

function ResultPage() {
    const { id } = useParams();
    const [review, setReview] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [isLocal, setIsLocal] = useState(false);

    useEffect(() => {
        // Check if this is a local history ID
        if (isLocalId(id)) {
            const localReview = getReviewById(id);
            if (localReview) {
                setReview(localReview);
                setIsLocal(true);
            } else {
                setError('Review not found in local history');
            }
            setLoading(false);
            return;
        }

        // Otherwise fetch from server (for backwards compatibility)
        const fetchReview = async () => {
            try {
                const response = await fetch(`${API_URL}/api/reviews/${id}`);
                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || 'Failed to load review');
                    setLoading(false);
                    return;
                }

                setReview(data);
                setLoading(false);
            } catch (err) {
                setError('Failed to connect to server');
                setLoading(false);
            }
        };

        fetchReview();
    }, [id]);

    if (loading) {
        return <div className="loading">Loading review...</div>;
    }

    if (error) {
        return (
            <div>
                <Link to="/history" className="back-link">← Back to History</Link>
                <div className="error">{error}</div>
            </div>
        );
    }

    // Handle both local and server review formats
    const scores = review.scores || review;
    const totalScore = scores.totalScore || review.totalScore;

    // Determine score color
    const getScoreClass = (score, max = 100) => {
        const percentage = (score / max) * 100;
        if (percentage >= 80) return 'score-good';
        if (percentage >= 50) return 'score-okay';
        return 'score-bad';
    };

    const getVerdictInfo = (verdict) => {
        const verdicts = {
            'APPROVE': { label: 'Approved', color: '#22c55e', icon: '✓' },
            'APPROVE_WITH_NITS': { label: 'Approved with Nits', color: '#eab308', icon: '~' },
            'REQUEST_CHANGES': { label: 'Changes Requested', color: '#f97316', icon: '!' },
            'BLOCK_MERGE': { label: 'Blocked', color: '#ef4444', icon: '✕' },
        };
        return verdicts[verdict];
    };

    const categories = [
        { key: 'readability', label: 'Readability', data: scores.readability },
        { key: 'complexity', label: 'Complexity', data: scores.complexity },
        { key: 'edgeCases', label: 'Edge Cases', data: scores.edgeCases },
        { key: 'security', label: 'Security', data: scores.security },
    ];

    const verdictInfo = getVerdictInfo(review.verdict);

    return (
        <div>
            <Link to="/history" className="back-link">← Back to History</Link>

            <h1>Code Review Results</h1>

            {/* Local indicator */}
            {isLocal && (
                <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    color: '#166534',
                }}>
                    🔒 Stored locally in your browser
                </div>
            )}

            {/* Verdict Badge (for browser-only reviews) */}
            {verdictInfo && (
                <div style={{
                    background: `${verdictInfo.color}15`,
                    border: `2px solid ${verdictInfo.color}`,
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <span style={{
                        fontSize: '2rem',
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: verdictInfo.color,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        {verdictInfo.icon}
                    </span>
                    <div>
                        <div style={{ fontWeight: 600, color: verdictInfo.color }}>
                            {verdictInfo.label}
                        </div>
                        {review.verdictOverrideReason && (
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {review.verdictOverrideReason}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Total Score */}
            <div className={`total-score ${getScoreClass(totalScore)}`}>
                {totalScore} <span>/ 100</span>
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

            {/* Reviewer Comments */}
            <div className="comments-section">
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

            {/* Proof Hash (for browser-only reviews) */}
            {review.proofHash && (
                <div style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    background: '#f1f5f9',
                    borderRadius: '8px',
                }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#334155' }}>
                        🔐 Deterministic Proof
                    </h3>
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
                        {review.proofHash}
                    </code>
                </div>
            )}

            {/* Analyzed Code (only for server mode with code) */}
            {review.code && (
                <div className="card" style={{ marginTop: '2rem' }}>
                    <h3>Analyzed Code</h3>
                    <pre style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        overflow: 'auto',
                        fontSize: '0.85rem',
                        maxHeight: '300px'
                    }}>
                        {review.code}
                    </pre>
                </div>
            )}
        </div>
    );
}

export default ResultPage;
