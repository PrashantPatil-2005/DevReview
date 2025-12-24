import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Use relative URL in production (same domain), localhost for dev
const API_URL = import.meta.env.VITE_API_URL || '';

function SubmitPage() {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle syntax errors or validation errors
                setError(data.error || 'Analysis failed');
                setLoading(false);
                return;
            }

            // Redirect to results page
            navigate(`/review/${data._id}`);
        } catch (err) {
            setError('Failed to connect to server. Is the backend running?');
            setLoading(false);
        }
    };

    const isDisabled = code.trim().length === 0 || loading;

    return (
        <div>
            <h1>Submit JavaScript Code for Review</h1>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
                Paste a single JavaScript file below. The code will be analyzed for
                readability, complexity, edge case handling, and security issues.
            </p>

            {error && <div className="error">{error}</div>}

            <form onSubmit={handleSubmit}>
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="// Paste your JavaScript code here..."
                    disabled={loading}
                />
                <button type="submit" disabled={isDisabled}>
                    {loading ? 'Analyzing...' : 'Analyze Code'}
                </button>
            </form>
        </div>
    );
}

export default SubmitPage;
