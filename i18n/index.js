// i18n/index.js (sem dependências externas)
import en from './locales/en.json';
import ptPT from './locales/pt-PT.json';

// Mapa de traduções
const DICTS = {
  en,
  'pt-PT': ptPT,
  pt: ptPT, // fallback se o device reportar "pt"
};

// detetar locale do dispositivo (super simples)
const detectLocale = () => {
  try {
    const sys = Intl?.DateTimeFormat?.().resolvedOptions?.().locale || 'en';
    if (sys.startsWith('pt')) return 'pt-PT';
    return 'en';
  } catch {
    return 'en';
  }
};

let CURRENT_LOCALE = detectLocale();

// util: obter valor por caminho "a.b.c"
const getByPath = (obj, path) =>
  path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);

// t(key, params?)
export const t = (key, params = {}) => {
  // cadeia de fallbacks: locale completo -> base -> en
  const chain = [
    CURRENT_LOCALE,
    CURRENT_LOCALE.split('-')[0],
    'en',
  ];

  let str;
  for (const loc of chain) {
    const dict = DICTS[loc];
    if (!dict) continue;
    const val = getByPath(dict, key);
    if (typeof val === 'string') {
      str = val;
      break;
    }
  }

  if (typeof str !== 'string') {
    // se chave não encontrada, devolve a própria chave (útil p/ debug)
    str = key;
  }

  // interpolação simples: "Olá, {name}"
  return str.replace(/\{(\w+)\}/g, (_, p1) =>
    params[p1] !== undefined ? String(params[p1]) : `{${p1}}`
  );
};

// mudar idioma em runtime (usa isto nas Definições)
export const setLocale = (locale) => {
  CURRENT_LOCALE = locale === 'pt' ? 'pt-PT' : locale; // normaliza "pt"
};

// opcionalmente expõe o locale atual
export const getLocale = () => CURRENT_LOCALE;

export default { t, setLocale, getLocale };
