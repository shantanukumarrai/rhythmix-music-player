/**
 * Rhythmix - App Root
 * Layout: Sidebar + Main Content + Player bar
 */
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import Sidebar from './components/Sidebar/Sidebar';
import PlayerBar from './components/Player/PlayerBar';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import PlaylistPage from './pages/PlaylistPage';
import UploadPage from './pages/UploadPage';
import ProfilePage from './pages/ProfilePage';
import AuthModal from './components/Auth/AuthModal';
import styles from './App.module.css';

const AppLayout = () => {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingLogo}>
          <span className={styles.loadingDot} />
          RHYTHMIX
        </div>
      </div>
    );
  }

  return (
    <PlayerProvider>
      <div className={styles.app}>
        <Sidebar
          onLoginClick={() => setShowAuth(true)}
          onThemeToggle={toggleTheme}
          theme={theme}
        />

        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/library" element={user ? <LibraryPage /> : <Navigate to="/" />} />
            <Route path="/playlist/:id" element={user ? <PlaylistPage /> : <Navigate to="/" />} />
            <Route path="/upload" element={user ? <UploadPage /> : <Navigate to="/" />} />
            <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/" />} />
          </Routes>
        </main>

        <PlayerBar />

        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    </PlayerProvider>
  );
};

const App = () => (
  <AuthProvider>
    <AppLayout />
  </AuthProvider>
);

export default App;
