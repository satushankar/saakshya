import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { startSync } from './data/sync';
import Capture from './screens/Capture';
import Home from './screens/Home';
import Log from './screens/Log';
import NewTest from './screens/NewTest';
import Record from './screens/Record';
import Result from './screens/Result';
import Review from './screens/Review';
import Settings from './screens/Settings';
import SignIn from './screens/SignIn';
import Verify from './screens/Verify';
import { AppProvider, useApp } from './state';

function Routed() {
  const { profile, loading } = useApp();
  useEffect(() => (profile ? startSync() : undefined), [profile]);
  if (loading) return <div className="min-h-dvh bg-ground" />;
  if (!profile) return <SignIn />;
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/new" element={<NewTest />} />
      <Route path="/capture" element={<Capture />} />
      <Route path="/review" element={<Review />} />
      <Route path="/result" element={<Result />} />
      <Route path="/record/:id" element={<Record />} />
      <Route path="/verify/:id" element={<Verify />} />
      <Route path="/log" element={<Log />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routed />
      </BrowserRouter>
    </AppProvider>
  );
}
