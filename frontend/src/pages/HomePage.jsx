/**
 * HomePage — Discover music, recently played, trending
 */
import React, { useEffect, useState } from 'react';
import { songsAPI } from '../api/client';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { SongCard, SongList } from '../components/Playlist/SongCard';
import styles from './HomePage.module.css';

const Section = ({ title, children }) => (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>{title}</h2>
    {children}
  </section>
);

const HomePage = () => {
  const { user } = useAuth();
  const { recentlyPlayed } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    songsAPI.getAll({ limit: 20, sort: '-createdAt' })
      .then(({ data }) => setSongs(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.heroLabel}>▶ NOW STREAMING</div>
          <h1 className={styles.heroTitle}>
            {greeting()}{user ? `, ${user.name.split(' ')[0]}` : ''}.
          </h1>
          <p className={styles.heroSub}>{songs.length} tracks ready to play</p>
        </div>
        <div className={styles.heroViz}>
          {[...Array(18)].map((_, i) => (
            <div key={i} className={styles.heroBar}
              style={{ animationDelay: `${i * 0.07}s`, height: `${20 + Math.sin(i) * 40 + 40}%` }} />
          ))}
        </div>
      </div>

      {recentlyPlayed.length > 0 && (
        <Section title="Recently Played">
          <div className={styles.cardGrid}>
            {recentlyPlayed.slice(0, 6).map((song) => (
              <SongCard key={song._id} song={song} />
            ))}
          </div>
        </Section>
      )}

      <Section title="All Songs">
        {loading ? (
          <div className={styles.loading}>
            {[...Array(6)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : (
          <SongList songs={songs} />
        )}
      </Section>
    </div>
  );
};

export default HomePage;
