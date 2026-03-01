import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import GiveFeedback from './pages/GiveFeedback';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import PulseCheck from './pages/PulseCheck';
import ShowerThoughts from './pages/ShowerThoughts';
import SelfAssessment from './pages/SelfAssessment';
import Layout from './components/Layout';

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="give-feedback" element={<GiveFeedback />} />
                <Route path="self-assessment" element={<SelfAssessment />} />
                <Route path="pulse-check" element={<PulseCheck />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="admin" element={<Admin />} />
                <Route path="shower-thoughts" element={<ShowerThoughts />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </DialogProvider>
    </AuthProvider>
  );
}
