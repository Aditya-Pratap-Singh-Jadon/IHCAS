import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ToastContainer from './components/Toast';
import CounsellingScreen from './pages/CounsellingScreen';
import StudentPage from './pages/StudentPage';
import AdminPage from './pages/AdminPage';
import WardenPage from './pages/WardenPage';
import CompatibilitySurvey from './pages/CompatibilitySurvey';

function App() {
  return (
    <Router>
      <Navbar />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<CounsellingScreen />} />
        <Route path="/dashboard" element={<StudentPage />} />
        <Route path="/survey" element={<CompatibilitySurvey />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/warden" element={<WardenPage />} />
      </Routes>
    </Router>
  );
}

export default App;
