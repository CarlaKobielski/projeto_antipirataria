import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Works } from './pages/Works';
import { Detections } from './pages/Detections';
import { Reports } from './pages/Reports';
import { Subscription } from './pages/Subscription';
import { Login } from './pages/Login';
import { useAuthStore } from './store/auth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="works" element={<Works />} />
                <Route path="detections" element={<Detections />} />
                <Route path="reports" element={<Reports />} />
                <Route path="subscription" element={<Subscription />} />
            </Route>
        </Routes>
    );
}
