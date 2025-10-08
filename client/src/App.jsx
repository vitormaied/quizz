import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateQuiz from './pages/CreateQuiz';
import HostGame from './pages/HostGame';
import JoinGame from './pages/JoinGame';
import PlayGame from './pages/PlayGame';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateQuiz />} />
          <Route path="/host" element={<HostGame />} />
          <Route path="/join" element={<JoinGame />} />
          <Route path="/play" element={<PlayGame />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
