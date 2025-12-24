import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Use relative URL in production (same domain), localhost for dev
const API_URL = import.meta.env.VITE_API_URL || '';

function HistoryPage() {
    const [reviews, setReviews] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const response = await fetch(`${API_URL}/reviews`);
                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || 'Failed to load reviews');
                    setLoading(false);
                    return;
                }

                setReviews(data);
                setLoading(false);
            } catch (err) {
                setError('Failed to connect to server');
                setLoading(false);
            }
        };

        fetchReviews();
    }, []);

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

    if (loading) {
        return <div className="loading">Loading history...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div>
            <h1>Review History</h1>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                Past code analyses are listed below. Click to view full details.
            </p>

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
                        >
                            <span className="history-date">{formatDate(review.createdAt)}</span>
                            <span className={`history-score ${getScoreClass(review.totalScore)}`}>
                                {review.totalScore}/100
                            </span>
                        </Link>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default HistoryPage;
