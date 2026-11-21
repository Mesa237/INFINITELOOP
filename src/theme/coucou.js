// Shared light/dark palettes for the CouCouMTL screens.
// The chosen mode ('light' | 'dark' | 'auto') is saved with the app's
// existing storage; 'auto' follows the phone's setting via useColorScheme.
import { useSyncExternalStore } from 'react';
import { Appearance, Platform, StyleSheet, useColorScheme } from 'react-native';
import { supabaseStorage } from '../../lib/supabase-storage';

const accents = {
  yellow: '#FFDF46',
  lilac: '#D8C2F4',
  // Text on yellow/lilac stays dark in both modes.
  onAccent: '#20211C',
  onAccentMuted: '#55574E',
  sunMark: '#F3BB25',
};

export const PALETTES = {
  light: {
    name: 'light',
    ...accents,
    page: '#FFFDF4',
    card: '#FFFFFF',
    text: '#20211C',
    muted: '#55574E',
    border: '#DEDED1',
    inputBg: '#FFFFFF',
    inputBorder: '#BDBEAF',
    placeholder: '#7C7D72',
    track: '#EEEEE4',
    softBg: '#F1E8FE',
    softText: '#20211C',
    primary: '#20211C',
    onPrimary: '#FFFFFF',
    invertBg: '#20211C',
    invertText: '#FFFDF4',
    invertMuted: '#BDBEAF',
    error: '#A43C32',
    success: '#37694A',
    scrim: 'rgba(25,25,18,0.55)',
    shadow: '#322F21',
  },
  dark: {
    name: 'dark',
    ...accents,
    page: '#15160F',
    card: '#22231C',
    text: '#F3F1E4',
    muted: '#BDBEAF',
    border: '#3A3B32',
    inputBg: '#15160F',
    inputBorder: '#3A3B32',
    placeholder: '#8E8F82',
    track: '#2A2B23',
    softBg: '#2E2C36',
    softText: '#F3F1E4',
    primary: '#FFDF46',
    onPrimary: '#20211C',
    invertBg: '#F3F1E4',
    invertText: '#15160F',
    invertMuted: '#55574E',
    error: '#FF8F80',
    success: '#86CFA0',
    scrim: 'rgba(0,0,0,0.7)',
    shadow: '#000000',
  },
};

const KEY = 'coucou.themeMode';
export const THEME_MODES = ['light', 'dark', 'auto'];

function readMode() {
  try {
    const saved = supabaseStorage?.getItem(KEY);
    return THEME_MODES.includes(saved) ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

// Make native UI (tab bar, keyboard, status bar, alerts) follow the choice too.
function applyAppearance(next) {
  if (Platform.OS === 'web') return;
  try {
    Appearance.setColorScheme(next === 'auto' ? 'unspecified' : next);
  } catch {
    // Older runtimes without an override: screens still use the palette.
  }
}

let mode = readMode();
applyAppearance(mode);
const listeners = new Set();

export function setThemeMode(next) {
  if (!THEME_MODES.includes(next) || next === mode) return;
  mode = next;
  try {
    supabaseStorage?.setItem(KEY, next);
  } catch {
    // Not saved, but still applied for this session.
  }
  applyAppearance(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCoucouTheme() {
  const themeMode = useSyncExternalStore(
    subscribe,
    () => mode,
    () => 'auto',
  );
  const system = useColorScheme();
  const scheme =
    themeMode === 'auto' ? (system === 'dark' ? 'dark' : 'light') : themeMode;
  return { C: PALETTES[scheme], scheme, mode: themeMode };
}

// Build a StyleSheet once per palette: const useS = makeStyles((C) => ({ ... }));
export function makeStyles(factory) {
  const cache = {};
  return function useStyles() {
    const { C } = useCoucouTheme();
    return (cache[C.name] ??= StyleSheet.create(factory(C)));
  };
}
