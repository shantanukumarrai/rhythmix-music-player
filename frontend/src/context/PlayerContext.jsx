/**
 * Rhythmix - Player Context
 * Global audio player state: current track, queue, playback controls
 */
import React, {
  createContext, useContext, useReducer, useRef, useEffect, useCallback,
} from 'react';
import { songsAPI } from '../api/client';

const PlayerContext = createContext(null);

const initialState = {
  currentSong: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  volume: parseInt(localStorage.getItem('volume') || '80'),
  shuffle: false,
  repeat: 'none', // 'none' | 'all' | 'one'
  likedIds: new Set(JSON.parse(localStorage.getItem('likedIds') || '[]')),
  recentlyPlayed: [],
};

const playerReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SONG':
      return { ...state, currentSong: action.song, currentTime: 0, isPlaying: true };
    case 'SET_QUEUE':
      return { ...state, queue: action.queue, queueIndex: action.index ?? 0 };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying };
    case 'SET_TIME':
      return { ...state, currentTime: action.time };
    case 'SET_DURATION':
      return { ...state, duration: action.duration };
    case 'SET_VOLUME':
      return { ...state, volume: action.volume };
    case 'TOGGLE_SHUFFLE':
      return { ...state, shuffle: !state.shuffle };
    case 'CYCLE_REPEAT': {
      const modes = ['none', 'all', 'one'];
      const next = modes[(modes.indexOf(state.repeat) + 1) % 3];
      return { ...state, repeat: next };
    }
    case 'TOGGLE_LIKE': {
      const liked = new Set(state.likedIds);
      liked.has(action.id) ? liked.delete(action.id) : liked.add(action.id);
      localStorage.setItem('likedIds', JSON.stringify([...liked]));
      return { ...state, likedIds: liked };
    }
    case 'ADD_RECENT': {
      const recent = [action.song, ...state.recentlyPlayed.filter((s) => s._id !== action.song._id)].slice(0, 20);
      return { ...state, recentlyPlayed: recent };
    }
    case 'SET_QUEUE_INDEX':
      return { ...state, queueIndex: action.index };
    default:
      return state;
  }
};

export const PlayerProvider = ({ children }) => {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const audioRef = useRef(new Audio());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Wire up audio element events
  useEffect(() => {
    const audio = audioRef.current;

    const onTimeUpdate = () => dispatch({ type: 'SET_TIME', time: audio.currentTime });
    const onDurationChange = () => dispatch({ type: 'SET_DURATION', duration: audio.duration || 0 });
    const onEnded = () => {
      const { repeat, queue, queueIndex, shuffle } = stateRef.current;
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (repeat === 'all' || queueIndex < queue.length - 1) {
        playNext();
      } else {
        dispatch({ type: 'SET_PLAYING', isPlaying: false });
      }
    };
    const onPlay = () => dispatch({ type: 'SET_PLAYING', isPlaying: true });
    const onPause = () => dispatch({ type: 'SET_PLAYING', isPlaying: false });

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  // Sync volume
  useEffect(() => {
    audioRef.current.volume = state.volume / 100;
    localStorage.setItem('volume', state.volume);
  }, [state.volume]);

  // Load & play song when currentSong changes
  useEffect(() => {
    if (!state.currentSong) return;
    const audio = audioRef.current;
    audio.src = songsAPI.getStreamUrl(state.currentSong._id);
    audio.load();
    audio.play().catch(console.error);
    dispatch({ type: 'ADD_RECENT', song: state.currentSong });
  }, [state.currentSong?._id]);

  // ── Controls ────────────────────────────────────────────────
  const playSong = useCallback((song, queue = [], index = 0) => {
    dispatch({ type: 'SET_QUEUE', queue: queue.length ? queue : [song], index });
    dispatch({ type: 'SET_SONG', song });
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio.paused) audio.play().catch(console.error);
    else audio.pause();
  }, []);

  const seek = useCallback((time) => {
    audioRef.current.currentTime = time;
    dispatch({ type: 'SET_TIME', time });
  }, []);

  const setVolume = useCallback((vol) => {
    dispatch({ type: 'SET_VOLUME', volume: vol });
  }, []);

  const playNext = useCallback(() => {
    const { queue, queueIndex, shuffle } = stateRef.current;
    if (!queue.length) return;
    let next;
    if (shuffle) {
      next = Math.floor(Math.random() * queue.length);
    } else {
      next = (queueIndex + 1) % queue.length;
    }
    dispatch({ type: 'SET_QUEUE_INDEX', index: next });
    dispatch({ type: 'SET_SONG', song: queue[next] });
  }, []);

  const playPrev = useCallback(() => {
    const { queue, queueIndex } = stateRef.current;
    if (!queue.length) return;
    // If more than 3 seconds in, restart instead
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prev = queueIndex === 0 ? queue.length - 1 : queueIndex - 1;
    dispatch({ type: 'SET_QUEUE_INDEX', index: prev });
    dispatch({ type: 'SET_SONG', song: queue[prev] });
  }, []);

  const toggleLike = useCallback((id) => {
    dispatch({ type: 'TOGGLE_LIKE', id });
    songsAPI.like(id).catch(console.error); // optimistic update
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        audioRef,
        playSong,
        togglePlay,
        seek,
        setVolume,
        playNext,
        playPrev,
        toggleLike,
        dispatch,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};
