import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import MentorDashboard from './pages/MentorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import { SkeletonPage } from './components/Skeleton';

const home = { student: '/student', mentor: '/mentor', admin: '/admin' };

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <SkeletonPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={home[user.role]} replace />;
  return children;
}

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return <SkeletonPage />;
  return <Navigate to={user ? home[user.role] : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/student" element={<Guard role="student"><StudentDashboard /></Guard>} />
      <Route path="/student/profile" element={<Guard role="student"><StudentProfile /></Guard>} />
      <Route path="/mentor" element={<Guard role="mentor"><MentorDashboard /></Guard>} />
      <Route path="/admin" element={<Guard role="admin"><AdminDashboard /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
