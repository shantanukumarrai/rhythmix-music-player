/**
 * PlayerBar - Persistent bottom audio player
 * Controls: prev/play/next, progress bar, volume, shuffle, repeat
 */
import React, { useRef, useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import LyricsPanel from '../Lyrics/LyricsPanel';
import styles from './PlayerBar.module.css';

const fmt = (s) => {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const PlayerBar = () => {
  const {
    currentSong, isPlaying, currentTime, duration,
    volume, shuffle, repeat, likedIds,
    togglePlay, playNext, playPrev, seek, setVolume,
    toggleLike, dispatch,
  } = usePlayer();

  const [showLyrics, setShowLyrics] = useState(false);
  const progressRef = useRef(null);

  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {showLyrics && currentSong && (
        <LyricsPanel
          songId={currentSong._id}
          currentTime={currentTime}
          onSeek={seek}
          onClose={() => setShowLyrics(false)}
        />
      )}

      <footer className={styles.bar}>
        {/* Song info */}
        <div className={styles.songInfo}>
          <div
            className={styles.thumb}
            style={{ background: 'var(--bg4)' }}
          >
            {currentSong?.thumbnailUrl ? (
              <img src={currentSong.thumbnailUrl} alt="" />
            ) : (
              <span className={styles.thumbEmoji}>♫</span>
            )}
          </div>
          <div className={styles.meta}>
            <div className={styles.title}>{currentSong?.title || 'No track selected'}</div>
            <div className={styles.artist}>{currentSong?.artist || '—'}</div>
          </div>
          {currentSong && (
            <button
              className={`${styles.likeBtn} ${likedIds.has(currentSong._id) ? styles.liked : ''}`}
              onClick={() => toggleLike(currentSong._id)}
            >
              {likedIds.has(currentSong._id) ? '♥' : '♡'}
            </button>
          )}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.buttons}>
            <button
              className={`${styles.modeBtn} ${shuffle ? styles.modeBtnActive : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_SHUFFLE' })}
              title="Shuffle"
            >⇄</button>

            <button className={styles.skipBtn} onClick={playPrev} title="Previous">⏮</button>

            <button className={styles.playBtn} onClick={togglePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>

            <button className={styles.skipBtn} onClick={playNext} title="Next">⏭</button>

            <button
              className={`${styles.modeBtn} ${repeat !== 'none' ? styles.modeBtnActive : ''}`}
              onClick={() => dispatch({ type: 'CYCLE_REPEAT' })}
              title={`Repeat: ${repeat}`}
            >
              {repeat === 'one' ? '🔂' : '↻'}
            </button>
          </div>

          <div className={styles.progress}>
            <span className={styles.time}>{fmt(currentTime)}</span>
            <div
              className={styles.track}
              ref={progressRef}
              onClick={handleProgressClick}
            >
              <div className={styles.fill} style={{ width: `${progressPct}%` }} />
            </div>
            <span className={styles.time}>{fmt(duration)}</span>
          </div>
        </div>

        {/* Right controls */}
        <div className={styles.right}>
          <button
            className={`${styles.iconBtn} ${showLyrics ? styles.iconBtnActive : ''}`}
            onClick={() => setShowLyrics((v) => !v)}
            title="Toggle lyrics"
          >✦</button>

          <div className={styles.volume}>
            <span className={styles.volIcon}>♪</span>
            <input
              type="range"
              min="0" max="100"
              value={volume}
              onChange={(e) => setVolume(+e.target.value)}
              className={styles.volSlider}
            />
            <span className={styles.volVal}>{volume}%</span>
          </div>
        </div>
      </footer>
    </>
  );
};

export default PlayerBar;
