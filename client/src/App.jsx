import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect }   from 'react';
import Dashboard       from './layout/Dashboard';
import Compare         from './pages/Compare';
import Watchlist       from './pages/Watchlist';
import Portfolio       from './pages/Portfolio';


function DashboardLoader() {
  const location = useLocation();
  const navigate  = useNavigate();

  useEffect(() => {
    if (location.state?.loadSymbol) {
      // Pass symbol via sessionStorage so Dashboard can pick it up on mount
      sessionStorage.setItem('mm_load_symbol', location.state.loadSymbol);
      navigate('/', { replace: true });
    }
  }, [location.state, navigate]);

  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<DashboardLoader />} />
      <Route path="/compare"   element={<Compare />}   />
      <Route path="/watchlist" element={<Watchlist />}  />
      <Route path="/portfolio" element={<Portfolio />}  />
    </Routes>
  );
}