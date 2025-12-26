import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHistory, clearHistory } from '../services/localHistoryService';

function HistoryPage() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load from localStorage (user's own history only)
        const history = getHistory();
        setReviews(history);
        setLoading(false);
    }, []);

    const handleClearHistory = () => {
        if (window.confirm('Are you sure you want to clear all your local history? This cannot be undone.')) {
            clearHistory();
            setReviews([]);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getScoreClass = (score) => {
        if (score >= 80) return 'score-good';
        if (score >= 50) return 'score-okay';
        return 'score-bad';
    };

    const getVerdictBadge = (verdict) => {
        const badges = {
            'APPROVE': { text: '✓', color: '#22c55e' },
            'APPROVE_WITH_NITS': { text: '~', color: '#eab308' },
            'REQUEST_CHANGES': { text: '!', color: '#f97316' },
            'BLOCK_MERGE': { text: '✕', color: '#ef4444' },
        };
        const badge = badges[verdict];
        if (!badge) return null;
        return (
            <span style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: badge.color,
                color: 'white',
                textAlign: 'center',
                lineHeight: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                marginRight: '8px',
            }}>
                {badge.text}
            </span>
        );
    };

    if (loading) {
        return <div className="loading">Loading history...</div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 style={{ margin: 0 }}>Your Review History</h1>
                {reviews.length > 0 && (
                    <button
                        onClick={handleClearHistory}
                        style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                        }}
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                color: '#166534',
            }}>
                🔒 Your history is stored locally in this browser only. No one else can see it.
            </div>

            {reviews.length === 0 ? (
                <div className="empty-state">
                    <p>No reviews yet.</p>
                    <Link to="/" style={{ color: '#0066cc' }}>Submit your first code review</Link>
                </div>
            ) : (
                <ul className="history-list">
                    {reviews.map((review) => (
                        <Link
                            key={review._id}
                            to={`/review/${review._id}`}
                            className="history-item"
                            style={{ display: 'flex', alignItems: 'center' }}
                        >
                            {review.verdict && getVerdictBadge(review.verdict)}
                            <span className="history-date">{formatDate(review.createdAt)}</span>
                            <span className={`history-score ${getScoreClass(review.totalScore)}`}>
                                {review.totalScore}/100
                            </span>
                            {review.fileCount && review.fileCount > 1 && (
                                <span style={{
                                    marginLeft: '8px',
                                    fontSize: '0.8rem',
                                    color: '#64748b',
                                }}>
                                    ({review.fileCount} files)
                                </span>
                            )}
                        </Link>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default HistoryPage;
