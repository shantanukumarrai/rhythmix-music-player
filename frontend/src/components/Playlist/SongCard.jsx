/**
 * SongCard + SongList — Reusable song display components
 */
import React from 'react';
import { usePlayer } from '../../context/PlayerContext';
import styles from './SongCard.module.css';

const fmt = (s) => {
  if (!s) return '--:--';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Single row song item
export const SongRow = ({ song, index, queue, onAddToPlaylist }) => {
  const { currentSong, isPlaying, playSong, togglePlay, toggleLike, likedIds } = usePlayer();
  const isActive = currentSong?._id === song._id;

  const handlePlay = () => {
    if (isActive) togglePlay();
    else playSong(song, queue || [song], index ?? 0);
  };

  return (
    <div className={`${styles.row} ${isActive ? styles.rowActive : ''}`}>
      <div className={styles.rowNum} onClick={handlePlay}>
        {isActive && isPlaying ? (
          <div className={styles.bars}>
            <span /><span /><span />
          </div>
        ) : (
          <span className={styles.num}>{(index ?? 0) + 1}</span>
        )}
      </div>

      <div className={styles.rowThumb} onClick={handlePlay}>
        {song.thumbnailUrl ? (
          <img src={song.thumbnailUrl} alt={song.title} />
        ) : (
          <span className={styles.thumbEmoji}>♫</span>
        )}
      </div>

      <div className={styles.rowInfo}>
        <div className={`${styles.rowTitle} ${isActive ? styles.rowTitleActive : ''}`}>{song.title}</div>
        <div className={styles.rowArtist}>{song.artist}</div>
      </div>

      <div className={styles.rowAlbum}>{song.album || '—'}</div>
      <div className={styles.rowDur}>{fmt(song.duration)}</div>

      <div className={styles.rowActions}>
        <button
          className={`${styles.likeBtn} ${likedIds.has(song._id) ? styles.liked : ''}`}
          onClick={() => toggleLike(song._id)}
        >
          {likedIds.has(song._id) ? '♥' : '♡'}
        </button>
        {onAddToPlaylist && (
          <button className={styles.moreBtn} onClick={() => onAddToPlaylist(song)}>+</button>
        )}
      </div>
    </div>
  );
};

// Full song list with header
export const SongList = ({ songs = [], showHeader = true, onAddToPlaylist }) => {
  if (!songs.length) {
    return <div className={styles.empty}>No songs found.</div>;
  }

  return (
    <div className={styles.list}>
      {showHeader && (
        <div className={styles.header}>
          <div className={styles.hNum}>#</div>
          <div className={styles.hThumb} />
          <div className={styles.hInfo}>Title</div>
          <div className={styles.hAlbum}>Album</div>
          <div className={styles.hDur}>Time</div>
          <div className={styles.hAct} />
        </div>
      )}
      {songs.map((song, i) => (
        <SongRow
          key={song._id}
          song={song}
          index={i}
          queue={songs}
          onAddToPlaylist={onAddToPlaylist}
        />
      ))}
    </div>
  );
};

// Grid card (for home page)
export const SongCard = ({ song }) => {
  const { currentSong, isPlaying, playSong, togglePlay, toggleLike, likedIds } = usePlayer();
  const isActive = currentSong?._id === song._id;

  const handlePlay = () => {
    if (isActive) togglePlay();
    else playSong(song);
  };

  return (
    <div className={`${styles.card} ${isActive ? styles.cardActive : ''}`}>
      <div className={styles.cardArt} onClick={handlePlay}>
        {song.thumbnailUrl ? (
          <img src={song.thumbnailUrl} alt={song.title} />
        ) : (
          <div className={styles.cardArtFallback}>♫</div>
        )}
        <div className={styles.cardOverlay}>
          <button className={styles.cardPlayBtn}>
            {isActive && isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>{song.title}</div>
        <div className={styles.cardArtist}>{song.artist}</div>
      </div>
      <button
        className={`${styles.cardLike} ${likedIds.has(song._id) ? styles.liked : ''}`}
        onClick={() => toggleLike(song._id)}
      >
        {likedIds.has(song._id) ? '♥' : '♡'}
      </button>
    </div>
  );
};
