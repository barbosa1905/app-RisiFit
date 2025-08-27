// contexts/PreferencesContext.js
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

// i18n + moment para aplicar idioma globalmente
import i18n from '../i18n';
import moment from 'moment';
import 'moment/locale/pt';
import 'moment/locale/en-gb';

const STORAGE_KEY = 'risifit:user_settings';

const defaultPrefs = {
  notifications: true,
  reminders: true,
  units: 'metric',   // 'metric' | 'imperial'
  theme: 'system',   // 'system' | 'light' | 'dark'
  language: 'pt-PT', // 'pt-PT' | 'en'
};

export const PreferencesContext = createContext({
  prefs: defaultPrefs,
  setPrefsInMemory: (_p) => {},
  savePreferences: async (_p) => {},
  setUnits: (_u, _persist = false) => {},
  setLanguage: async (_lang) => {},
  reload: async () => {},
});

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [uid, setUid] = useState(null);

  const applyLanguage = useCallback((lang) => {
    const lng = lang || 'pt-PT';
    i18n.changeLanguage(lng);
    // moment: usar 'pt' para PT e 'en-gb' para inglês EU-like
    moment.locale(lng.startsWith('pt') ? 'pt' : 'en-gb');
  }, []);

  // Carregar preferências (local + cloud)
  const load = useCallback(async (currentUid) => {
    let next = { ...defaultPrefs };

    // 1) Local
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) next = { ...next, ...JSON.parse(raw) };
    } catch {}

    // 2) Cloud
    try {
      if (currentUid) {
        const snap = await getDoc(doc(db, 'users', currentUid));
        const cloud = snap.exists() ? (snap.data()?.preferences || {}) : {};
        if (Object.keys(cloud).length) {
          next = { ...next, ...cloud };
        }
      }
    } catch {}

    setPrefs(next);
    applyLanguage(next.language);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, [applyLanguage]);

  // Ouvir login/logout
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const u = user?.uid || null;
      setUid(u);
      load(u);
    });
    return () => unsub && unsub();
  }, [load]);

  // ——— API exposta ———
  const setPrefsInMemory = useCallback((partial) => {
    setPrefs((prev) => ({ ...prev, ...partial }));
  }, []);

  const savePreferences = useCallback(async (nextPartial) => {
    const merged = { ...prefs, ...nextPartial };
    setPrefs(merged);

    // aplicar idioma imediatamente se vier no payload
    if (typeof nextPartial?.language === 'string') {
      applyLanguage(nextPartial.language);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}

    if (uid) {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      const payload = { preferences: merged };
      if (snap.exists()) await updateDoc(ref, payload);
      else await setDoc(ref, payload, { merge: true });
    }
    return true;
  }, [prefs, uid, applyLanguage]);

  const setUnits = useCallback(async (units, persist = false) => {
    if (!['metric', 'imperial'].includes(units)) return;
    setPrefs((p) => ({ ...p, units }));
    if (persist) await savePreferences({ units });
  }, [savePreferences]);

  const setLanguage = useCallback(async (language) => {
    if (!['pt-PT', 'en'].includes(language)) return;
    applyLanguage(language);
    await savePreferences({ language });
  }, [applyLanguage, savePreferences]);

  const reload = useCallback(async () => {
    await load(uid);
  }, [load, uid]);

  const value = useMemo(() => ({
    prefs,
    setPrefsInMemory,
    savePreferences,
    setUnits,
    setLanguage,
    reload,
  }), [prefs, setPrefsInMemory, savePreferences, setUnits, setLanguage, reload]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = React.useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
