/**
 * LyricsPanel - Slide-up panel showing synced lyrics
 */
import React, { useEffect, useRef } from 'react';
import { useLyrics } from '../../hooks/useLyrics';
import styles from './LyricsPanel.module.css';

const LyricsPanel = ({ songId, currentTime, onSeek, onClose }) => {
  const { lyrics, activeIndex, loading, error } = useLyrics(songId, currentTime);
  const activeRef = useRef(null);

  // Auto-scroll to active lyric
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>✦ Lyrics</span>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>

      <div className={styles.content}>
        {loading && <div className={styles.status}>Loading lyrics...</div>}
        {error && <div className={styles.status}>{error}</div>}

        {!loading && !error && lyrics.length === 0 && (
          <div className={styles.status}>No lyrics available for this track.</div>
        )}

        {lyrics.map((line, i) => (
          <div
            key={i}
            ref={i === activeIndex ? activeRef : null}
            className={`
              ${styles.line}
              ${i === activeIndex ? styles.active : ''}
              ${i < activeIndex ? styles.past : ''}
            `}
            onClick={() => onSeek(line.timestamp)}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LyricsPanel;
