import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnalysisModeToggle from '../components/AnalysisModeToggle';
import GitHubInputPanel from '../components/GitHubInputPanel';
import FileSelector from '../components/FileSelector';
import PrivacyBanner from '../components/PrivacyBanner';
import BrowserResultPage from './BrowserResultPage';
import { fetchMultipleFiles } from '../services/githubService';
import { analyzeMultipleFiles, analyzeSingleFile } from '../analysis/browserEngine';
import { saveToHistory } from '../services/localHistoryService';

// Use relative URL in production (same domain), localhost for dev
const API_URL = import.meta.env.VITE_API_URL || '';

function SubmitPage() {
    // Analysis mode: 'server' or 'browser'
    const [mode, setMode] = useState('server');

    // Server mode state
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Browser mode state
    const [githubData, setGithubData] = useState(null);
    const [browserResult, setBrowserResult] = useState(null);
    const [fetchProgress, setFetchProgress] = useState(null);

    const navigate = useNavigate();

    // Server mode submit handler
    const handleServerSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Analysis failed');
                setLoading(false);
                return;
            }

            // Save to local history (user's own history)
            const localId = saveToHistory({
                ...data.scores,
                totalScore: data.scores.totalScore,
                code: code.substring(0, 500) + (code.length > 500 ? '...' : ''), // Truncate for storage
            });

            navigate(`/review/${localId}`);
        } catch (err) {
            setError('Failed to connect to server. Is the backend running?');
            setLoading(false);
        }
    };

    // Browser mode: handle GitHub files loaded
    const handleFilesLoaded = (data) => {
        setGithubData(data);
    };

    // Browser mode: handle file analysis
    const handleBrowserAnalyze = async (selectedPaths) => {
        setLoading(true);
        setError('');
        setFetchProgress({ current: 0, total: selectedPaths.length });

        try {
            // Fetch file contents from GitHub
            const files = await fetchMultipleFiles(
                githubData.owner,
                githubData.repo,
                githubData.ref || githubData.headSha,
                selectedPaths,
                setFetchProgress
            );

            if (files.length === 0) {
                setError('Failed to fetch any files');
                setLoading(false);
                return;
            }

            // Run browser-only analysis
            setFetchProgress({ current: 'analyzing', total: files.length });

            let result;
            if (files.length === 1) {
                result = await analyzeSingleFile(files[0].content, files[0].filename);
            } else {
                result = await analyzeMultipleFiles(files);
            }

            // Save to local history
            const localId = saveToHistory({
                ...result,
                source: `${githubData.owner}/${githubData.repo}`,
            });

            // Navigate to results page
            navigate(`/review/${localId}`);
        } catch (err) {
            setError(`Analysis failed: ${err.message}`);
        } finally {
            setLoading(false);
            setFetchProgress(null);
        }
    };

    // Reset browser mode state
    const handleCancelFileSelection = () => {
        setGithubData(null);
    };

    const handleNewBrowserAnalysis = () => {
        setBrowserResult(null);
        setGithubData(null);
    };

    // Handle mode change
    const handleModeChange = (newMode) => {
        setMode(newMode);
        setError('');
        setGithubData(null);
        setBrowserResult(null);
    };

    // If we have browser results, show them
    if (browserResult) {
        return (
            <BrowserResultPage
                result={browserResult}
                onNewAnalysis={handleNewBrowserAnalysis}
            />
        );
    }

    const isServerDisabled = code.trim().length === 0 || loading;

    return (
        <div>
            <h1>Submit Code for Review</h1>

            {/* Mode Toggle */}
            <AnalysisModeToggle mode={mode} onChange={handleModeChange} />

            {/* Browser Mode */}
            {mode === 'browser' && (
                <>
                    <PrivacyBanner />

                    {!githubData ? (
                        <GitHubInputPanel
                            onFilesLoaded={handleFilesLoaded}
                            disabled={loading}
                        />
                    ) : (
                        <FileSelector
                            files={githubData.files}
                            repoInfo={githubData}
                            onAnalyze={handleBrowserAnalyze}
                            onCancel={handleCancelFileSelection}
                            loading={loading}
                        />
                    )}

                    {fetchProgress && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: '#eff6ff',
                            borderRadius: '8px',
                        }}>
                            {fetchProgress.current === 'analyzing' ? (
                                <span>🔍 Analyzing {fetchProgress.total} files...</span>
                            ) : (
                                <span>
                                    📥 Fetching files: {fetchProgress.current}/{fetchProgress.total}
                                    {fetchProgress.currentFile && (
                                        <span style={{ marginLeft: '8px', color: '#64748b' }}>
                                            ({fetchProgress.currentFile})
                                        </span>
                                    )}
                                </span>
                            )}
                        </div>
                    )}

                    {error && <div className="error">{error}</div>}
                </>
            )}

            {/* Server Mode */}
            {mode === 'server' && (
                <>
                    <p style={{ marginBottom: '1rem', color: '#666' }}>
                        Paste a single JavaScript file below. The code will be analyzed for
                        readability, complexity, edge case handling, and security issues.
                    </p>

                    {error && <div className="error">{error}</div>}

                    <form onSubmit={handleServerSubmit}>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="// Paste your JavaScript code here..."
                            disabled={loading}
                        />
                        <button type="submit" disabled={isServerDisabled}>
                            {loading ? 'Analyzing...' : 'Analyze Code'}
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}

export default SubmitPage;
