/**
 * GitHub API Service (Client-Side Only)
 * 
 * Fetches code from public GitHub repositories and PRs.
 * Uses GitHub REST API with unauthenticated access.
 * 
 * PRIVACY GUARANTEE: This service ONLY communicates with GitHub.
 * No code is ever sent to our backend servers.
 */

// GitHub API configuration
const GITHUB_API_BASE = 'https://api.github.com';
const RAW_CONTENT_BASE = 'https://raw.githubusercontent.com';

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx'];

// Default limits
const DEFAULT_MAX_FILES = 20;
const MAX_FILE_SIZE = 500000; // 500KB per file

/**
 * Parses a GitHub URL into its components
 * @param {string} url - GitHub URL
 * @returns {{
 *   type: 'repo' | 'pr' | 'invalid',
 *   owner: string,
 *   repo: string,
 *   ref?: string,
 *   prNumber?: number,
 *   path?: string
 * }}
 */
export function parseGitHubUrl(url) {
    try {
        const parsed = new URL(url);

        if (parsed.hostname !== 'github.com') {
            return { type: 'invalid', error: 'Not a GitHub URL' };
        }

        const pathParts = parsed.pathname.split('/').filter(Boolean);

        if (pathParts.length < 2) {
            return { type: 'invalid', error: 'Invalid GitHub URL format' };
        }

        const owner = pathParts[0];
        const repo = pathParts[1];

        // Check for PR URL: /owner/repo/pull/123
        if (pathParts[2] === 'pull' && pathParts[3]) {
            const prNumber = parseInt(pathParts[3], 10);
            if (!isNaN(prNumber)) {
                return { type: 'pr', owner, repo, prNumber };
            }
        }

        // Check for tree URL: /owner/repo/tree/branch/path
        if (pathParts[2] === 'tree' && pathParts[3]) {
            const ref = pathParts[3];
            const path = pathParts.slice(4).join('/') || '';
            return { type: 'repo', owner, repo, ref, path };
        }

        // Check for blob URL: /owner/repo/blob/branch/path
        if (pathParts[2] === 'blob' && pathParts[3]) {
            const ref = pathParts[3];
            const path = pathParts.slice(4).join('/') || '';
            return { type: 'repo', owner, repo, ref, path };
        }

        // Default: just owner/repo (default branch)
        return { type: 'repo', owner, repo, ref: 'HEAD' };

    } catch (err) {
        return { type: 'invalid', error: err.message };
    }
}

/**
 * Fetches the default branch for a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<string>} Default branch name
 */
async function getDefaultBranch(owner, repo) {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch repository info: ${response.status}`);
    }

    const data = await response.json();
    return data.default_branch;
}

/**
 * Fetches file tree from a GitHub repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} [ref='HEAD'] - Branch/tag/commit
 * @param {string} [path=''] - Path within repo
 * @returns {Promise<Array<{path: string, size: number, type: string}>>}
 */
export async function fetchRepoFiles(owner, repo, ref = 'HEAD', path = '') {
    // If ref is HEAD, get the default branch first
    if (ref === 'HEAD') {
        ref = await getDefaultBranch(owner, repo);
    }

    // Use Git Trees API for recursive listing
    const treeUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
    const response = await fetch(treeUrl);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Repository not found or is private');
        }
        throw new Error(`Failed to fetch file tree: ${response.status}`);
    }

    const data = await response.json();

    // Filter for supported files
    const files = data.tree
        .filter(item => {
            if (item.type !== 'blob') return false;
            if (path && !item.path.startsWith(path)) return false;
            return SUPPORTED_EXTENSIONS.some(ext => item.path.endsWith(ext));
        })
        .map(item => ({
            path: item.path,
            size: item.size || 0,
            sha: item.sha,
        }))
        .filter(f => f.size <= MAX_FILE_SIZE); // Filter out huge files

    return {
        files,
        ref,
        owner,
        repo,
        totalFiles: files.length,
    };
}

/**
 * Fetches files changed in a pull request
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @returns {Promise<Array<{path: string, status: string}>>}
 */
export async function fetchPRFiles(owner, repo, prNumber) {
    const prUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/files`;
    const response = await fetch(prUrl);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Pull request not found or is from a private repo');
        }
        throw new Error(`Failed to fetch PR files: ${response.status}`);
    }

    const data = await response.json();

    // Get PR details for the head ref
    const prDetailRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`);
    const prDetail = await prDetailRes.json();

    // Filter for supported files
    const files = data
        .filter(file => {
            if (file.status === 'removed') return false; // Skip deleted files
            return SUPPORTED_EXTENSIONS.some(ext => file.filename.endsWith(ext));
        })
        .map(file => ({
            path: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            sha: file.sha,
        }));

    return {
        files,
        prNumber,
        owner,
        repo,
        headRef: prDetail.head?.ref,
        headSha: prDetail.head?.sha,
        baseRef: prDetail.base?.ref,
        title: prDetail.title,
        totalFiles: files.length,
    };
}

/**
 * Fetches raw file content from GitHub
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} ref - Branch/tag/commit SHA
 * @param {string} path - File path
 * @returns {Promise<string>} Raw file content
 */
export async function fetchFileContent(owner, repo, ref, path) {
    const rawUrl = `${RAW_CONTENT_BASE}/${owner}/${repo}/${ref}/${path}`;
    const response = await fetch(rawUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch file ${path}: ${response.status}`);
    }

    return response.text();
}

/**
 * Fetches content for multiple files
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} ref - Branch/tag/commit
 * @param {string[]} paths - Array of file paths
 * @param {function} [onProgress] - Progress callback
 * @returns {Promise<Array<{filename: string, content: string}>>}
 */
export async function fetchMultipleFiles(owner, repo, ref, paths, onProgress) {
    const results = [];
    const total = paths.length;

    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        try {
            const content = await fetchFileContent(owner, repo, ref, path);
            results.push({
                filename: path,
                content,
            });
        } catch (err) {
            console.warn(`Failed to fetch ${path}:`, err.message);
            // Skip failed files but continue
        }

        if (onProgress) {
            onProgress({
                current: i + 1,
                total,
                currentFile: path,
            });
        }
    }

    return results;
}

/**
 * Validates if a GitHub URL is supported
 * @param {string} url - URL to validate
 * @returns {{valid: boolean, error?: string, info?: object}}
 */
export function validateGitHubUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'Please enter a GitHub URL' };
    }

    const parsed = parseGitHubUrl(url);

    if (parsed.type === 'invalid') {
        return { valid: false, error: parsed.error };
    }

    return {
        valid: true,
        info: parsed,
    };
}

/**
 * Gets display-friendly info about the GitHub URL
 * @param {string} url - GitHub URL
 * @returns {string} Display text
 */
export function getUrlDisplayInfo(url) {
    const parsed = parseGitHubUrl(url);

    if (parsed.type === 'invalid') {
        return 'Invalid URL';
    }

    if (parsed.type === 'pr') {
        return `PR #${parsed.prNumber} in ${parsed.owner}/${parsed.repo}`;
    }

    let info = `${parsed.owner}/${parsed.repo}`;
    if (parsed.ref && parsed.ref !== 'HEAD') {
        info += ` @ ${parsed.ref}`;
    }
    if (parsed.path) {
        info += ` (${parsed.path})`;
    }

    return info;
}

// Export default limits
export const LIMITS = {
    MAX_FILES: DEFAULT_MAX_FILES,
    MAX_FILE_SIZE,
    SUPPORTED_EXTENSIONS,
};
