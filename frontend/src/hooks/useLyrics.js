/**
 * useLyrics - Fetches lyrics and returns the current active line index
 */
import { useState, useEffect, useRef } from 'react';
import { lyricsAPI } from '../api/client';

export const useLyrics = (songId, currentTime) => {
  const [lyrics, setLyrics] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const prevSongId = useRef(null);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (!songId || songId === prevSongId.current) return;
    prevSongId.current = songId;

    setLoading(true);
    setLyrics([]);
    setActiveIndex(0);
    setError(null);

    lyricsAPI.get(songId)
      .then(({ data }) => setLyrics(data.data?.lines || []))
      .catch(() => setError('No lyrics available'))
      .finally(() => setLoading(false));
  }, [songId]);

  // Update active lyric line as time progresses
  useEffect(() => {
    if (!lyrics.length) return;

    let idx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].timestamp <= currentTime) idx = i;
      else break;
    }
    setActiveIndex(idx);
  }, [currentTime, lyrics]);

  return { lyrics, activeIndex, loading, error };
};
