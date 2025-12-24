import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SubmitPage from './pages/SubmitPage';
import ResultPage from './pages/ResultPage';
import HistoryPage from './pages/HistoryPage';
import AboutPage from './pages/AboutPage';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <ul>
          <li><Link to="/">Submit Code</Link></li>
          <li><Link to="/history">History</Link></li>
          <li><Link to="/about">About</Link></li>
        </ul>
      </nav>

      <main className="container">
        <Routes>
          <Route path="/" element={<SubmitPage />} />
          <Route path="/review/:id" element={<ResultPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
