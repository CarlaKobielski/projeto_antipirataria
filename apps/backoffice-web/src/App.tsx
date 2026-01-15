import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Detections } from './pages/Detections';
import { Cases } from './pages/Cases';
import { Takedowns } from './pages/Takedowns';
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
            <Route
                path="/"
                element={
                    <PrivateRoute>
                        <Layout />
                    </PrivateRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="detections" element={<Detections />} />
                <Route path="cases" element={<Cases />} />
                <Route path="takedowns" element={<Takedowns />} />
            </Route>
        </Routes>
    );
}
