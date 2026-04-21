/**
 * Sidebar - Navigation + playlist list
 */
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { playlistsAPI } from '../../api/client';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { path: '/',        icon: '♫', label: 'Home' },
  { path: '/search',  icon: '⌕', label: 'Search' },
  { path: '/library', icon: '♪', label: 'Library' },
  { path: '/upload',  icon: '↑', label: 'Upload' },
  { path: '/profile', icon: '◎', label: 'Profile' },
];

const Sidebar = ({ onLoginClick, onThemeToggle, theme }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!user) return;
    playlistsAPI.getAll()
      .then(({ data }) => setPlaylists(data.data || []))
      .catch(console.error);
  }, [user]);

  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const { data } = await playlistsAPI.create({ name: newName.trim() });
      setPlaylists((prev) => [data.data, ...prev]);
      setNewName('');
      setCreating(false);
      navigate(`/playlist/${data.data._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <span className={styles.logoDot} />
        RHYTHMIX
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <span className={styles.navLabel}>Menu</span>
        {NAV_ITEMS.map(({ path, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            onClick={!user && ['/library', '/upload', '/profile'].includes(path) ? (e) => { e.preventDefault(); onLoginClick(); } : undefined}
          >
            <span className={styles.navIcon}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Playlists */}
      {user && (
        <div className={styles.playlists}>
          <div className={styles.playlistsHeader}>
            <span className={styles.navLabel}>Playlists</span>
            <button className={styles.addBtn} onClick={() => setCreating((v) => !v)} title="New playlist">+</button>
          </div>

          {creating && (
            <form onSubmit={createPlaylist} className={styles.createForm}>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Playlist name..."
                onBlur={() => !newName && setCreating(false)}
              />
            </form>
          )}

          <div className={styles.playlistList}>
            {playlists.map((pl) => (
              <NavLink
                key={pl._id}
                to={`/playlist/${pl._id}`}
                className={({ isActive }) => `${styles.playlistItem} ${isActive ? styles.active : ''}`}
              >
                <div className={styles.plThumb}>♫</div>
                <div className={styles.plInfo}>
                  <div className={styles.plName}>{pl.name}</div>
                  <div className={styles.plCount}>{pl.songCount} songs</div>
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.themeBtn} onClick={onThemeToggle}>
          {theme === 'dark' ? '◑ Light' : '◑ Dark'}
        </button>
        {user ? (
          <div className={styles.userRow}>
            <div className={styles.userAvatar}>{user.name?.[0]?.toUpperCase()}</div>
            <div className={styles.userName}>{user.name}</div>
            <button className={styles.logoutBtn} onClick={logout} title="Sign out">×</button>
          </div>
        ) : (
          <button className={styles.loginBtn} onClick={onLoginClick}>Sign In</button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
