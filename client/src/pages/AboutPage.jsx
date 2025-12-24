function AboutPage() {
    return (
        <div>
            <h1>About This Tool</h1>

            <div className="about-section">
                <h2>What This Is</h2>
                <p>
                    This is a <strong>rule-based static code review engine</strong> for JavaScript.
                    It analyzes code using deterministic heuristics and produces scores with
                    human-readable explanations — similar to what a senior engineer might say
                    during a code review.
                </p>
                <p>
                    The tool parses your code into an Abstract Syntax Tree (AST) using Babel,
                    then applies a set of well-defined rules to detect issues across four categories.
                </p>
            </div>

            <div className="about-section">
                <h2>Scoring Categories</h2>

                <h3>Readability (0-25 points)</h3>
                <p>Assesses how easy the code is to read and understand:</p>
                <ul>
                    <li>Function length (penalizes functions over 40 lines)</li>
                    <li>Nesting depth (penalizes nesting deeper than 4 levels)</li>
                    <li>Variable naming (penalizes 1-2 character names)</li>
                    <li>Statement density (penalizes too many statements per function)</li>
                </ul>

                <h3>Cyclomatic Complexity (0-25 points)</h3>
                <p>
                    Measures the number of independent paths through your code. Higher complexity
                    means more potential for bugs and harder testing.
                </p>
                <ul>
                    <li>Counts: <code>if</code>, <code>else</code>, <code>for</code>, <code>while</code>,
                        <code>switch case</code>, ternary operators, <code>&&</code>, <code>||</code></li>
                    <li>Complexity 1-5: No penalty</li>
                    <li>Complexity 6-10: -3 points</li>
                    <li>Complexity 11-15: -6 points</li>
                    <li>Complexity 16-20: -10 points</li>
                    <li>Complexity 21+: -15 points</li>
                </ul>

                <h3>Edge Case Handling (0-25 points)</h3>
                <p>Detects potential runtime issues:</p>
                <ul>
                    <li>Async functions without try/catch</li>
                    <li>Array access without length or null checks</li>
                    <li>External input (req.body, req.params) used without validation</li>
                </ul>

                <h3>Security Smells (0-25 points)</h3>
                <p>Flags common security anti-patterns:</p>
                <ul>
                    <li><code>eval()</code> usage (-8 points)</li>
                    <li><code>child_process.exec/spawn</code> usage (-6 points)</li>
                    <li>Hardcoded secrets/API keys (-5 points)</li>
                    <li>Unsanitized input in SQL/HTML contexts (-4 points)</li>
                </ul>
            </div>

            <div className="about-section">
                <h2>Why Rule-Based?</h2>
                <p>
                    This tool uses explicit, deterministic rules rather than machine learning or AI.
                    This means:
                </p>
                <ul>
                    <li><strong>Reproducible:</strong> Same code always produces the same score</li>
                    <li><strong>Explainable:</strong> Every deduction has a clear, human-readable reason</li>
                    <li><strong>Transparent:</strong> You can see exactly what rules are being applied</li>
                    <li><strong>Fast:</strong> No API calls or model inference required</li>
                </ul>
            </div>

            <div className="about-section">
                <h2>Known Limitations</h2>
                <p>This tool is <strong>not</strong>:</p>
                <ul>
                    <li><strong>A compiler:</strong> Valid code might still have logical bugs</li>
                    <li><strong>A security scanner:</strong> It detects smells, not vulnerabilities</li>
                    <li><strong>AI-powered:</strong> It cannot understand intent or context deeply</li>
                    <li><strong>Perfect:</strong> Heuristics can produce false positives</li>
                </ul>
                <p style={{ marginTop: '1rem' }}>
                    Some rules use heuristics that may flag code that is actually fine. For example,
                    a short variable name like <code>i</code> in a loop is acceptable, and the tool
                    tries to allow common patterns. But edge cases exist.
                </p>
                <p>
                    Use this tool as one input among many — code review, tests, and human judgment
                    should all be part of your quality process.
                </p>
            </div>

            <div className="about-section">
                <h2>How It Works</h2>
                <ol style={{ marginLeft: '1.5rem' }}>
                    <li>Your JavaScript code is parsed into an Abstract Syntax Tree (AST)</li>
                    <li>The AST is traversed by four rule modules</li>
                    <li>Each module applies its rules and records penalties with comments</li>
                    <li>A central scorer aggregates penalties (starting from 25 per category)</li>
                    <li>Results are stored and returned with the full breakdown</li>
                </ol>
            </div>
        </div>
    );
}

export default AboutPage;
