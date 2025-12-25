import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

// Use relative URL in production (same domain), localhost for dev
const API_URL = import.meta.env.VITE_API_URL || '';

function ResultPage() {
    const { id } = useParams();
    const [review, setReview] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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

    const { scores } = review;
    const totalScore = scores.totalScore;

    // Determine score color
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
            <Link to="/history" className="back-link">← Back to History</Link>

            <h1>Code Review Results</h1>

            {/* Total Score */}
            <div className={`total-score ${getScoreClass(totalScore)}`}>
                {totalScore} <span>/ 100</span>
            </div>

            {/* Category Breakdown */}
            <div className="categories">
                {categories.map(({ key, label, data }) => (
                    <div key={key} className="category-card">
                        <div className={`score ${getScoreClass(data.score, 25)}`}>
                            {data.score}/25
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
                        {data.comments.length === 0 ? (
                            <p className="no-comments">No issues found</p>
                        ) : (
                            data.comments.map((comment, idx) => (
                                <div key={idx} className="comment">{comment}</div>
                            ))
                        )}
                    </div>
                ))}
            </div>

            {/* Analyzed Code (collapsible could be added later) */}
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
        </div>
    );
}

export default ResultPage;
