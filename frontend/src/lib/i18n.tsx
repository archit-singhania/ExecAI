"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type LocaleCode = "en" | "es" | "fr" | "de" | "hi" | "ar";

export type LocaleOption = {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  flag: string;
  rtl: boolean;
};

export const LOCALES: LocaleOption[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸", rtl: false },
  { code: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸", rtl: false },
  { code: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷", rtl: false },
  { code: "de", label: "German", nativeLabel: "Deutsch", flag: "🇩🇪", rtl: false },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳", rtl: false },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦", rtl: true },
];

type Dictionary = Record<string, string>;

const dictionaries: Record<LocaleCode, Dictionary> = {
  en: {
    "nav.login": "Log in",
    "nav.signup": "Start free trial",
    "nav.tryDemo": "Try free demo",
    "hero.badge": "CEO + 9 specialist agents",
    "hero.title": "A boardroom that thinks, argues, and executes — before your money moves.",
    "hero.subtitle":
      "Give it capital, a rough idea, or a weak assumption. The AI CEO coordinates nine specialists, challenges your strategy, creates proof tasks, remembers every decision, and runs weekly board reviews — so you validate before you build.",
    "hero.ctaPrimary": "Start free trial",
    "hero.ctaSecondary": "I already have an account",
    "hero.ctaTertiary": "Try without signing up",
    "hero.specialists": "Meet a few of the specialists",
    "hero.specialistsNote": "Plus CTO, Product, Marketing, Legal, Designer, and an Executive Assistant — all in the free trial.",
    "hero.footerNote": "No credit card required for the free trial.",
    "auth.loginTitle": "Welcome back",
    "auth.signupTitle": "Start your free trial",
    "auth.loginSubtitle": "Log in to pick up where your boardroom left off.",
    "auth.signupSubtitle": "Nine specialist agents and a CEO, ready to challenge your next move.",
    "auth.nameLabel": "Name",
    "auth.emailLabel": "Email",
    "auth.passwordLabel": "Password",
    "auth.loginButton": "Log in",
    "auth.signupButton": "Create free account",
    "auth.alreadyAccount": "Already have an account?",
    "auth.newHere": "New here?",
    "auth.loginLink": "Log in",
    "auth.signupLink": "Start a free trial",
    "demo.banner": "You're in demo mode — sign up free to save your progress.",
    "demo.cta": "Sign up free",
  },
  es: {
    "nav.login": "Iniciar sesión",
    "nav.signup": "Prueba gratis",
    "nav.tryDemo": "Probar demo gratis",
    "hero.badge": "CEO + 9 agentes especialistas",
    "hero.title": "Una sala de juntas que piensa, discute y ejecuta — antes de mover tu dinero.",
    "hero.subtitle":
      "Dale capital, una idea vaga o una suposición débil. El CEO de IA coordina nueve especialistas, cuestiona tu estrategia, crea tareas de validación, recuerda cada decisión y dirige revisiones semanales — para que valides antes de construir.",
    "hero.ctaPrimary": "Prueba gratis",
    "hero.ctaSecondary": "Ya tengo una cuenta",
    "hero.ctaTertiary": "Probar sin registrarte",
    "hero.specialists": "Conoce a algunos especialistas",
    "hero.specialistsNote": "Además de CTO, Producto, Marketing, Legal, Diseñador y un Asistente Ejecutivo — todo en la prueba gratis.",
    "hero.footerNote": "No se requiere tarjeta de crédito para la prueba gratis.",
    "auth.loginTitle": "Bienvenido de nuevo",
    "auth.signupTitle": "Comienza tu prueba gratis",
    "auth.loginSubtitle": "Inicia sesión para continuar donde lo dejaste.",
    "auth.signupSubtitle": "Nueve agentes especialistas y un CEO, listos para cuestionar tu próximo paso.",
    "auth.nameLabel": "Nombre",
    "auth.emailLabel": "Correo electrónico",
    "auth.passwordLabel": "Contraseña",
    "auth.loginButton": "Iniciar sesión",
    "auth.signupButton": "Crear cuenta gratis",
    "auth.alreadyAccount": "¿Ya tienes una cuenta?",
    "auth.newHere": "¿Nuevo aquí?",
    "auth.loginLink": "Iniciar sesión",
    "auth.signupLink": "Prueba gratis",
    "demo.banner": "Estás en modo demo — regístrate gratis para guardar tu progreso.",
    "demo.cta": "Regístrate gratis",
  },
  fr: {
    "nav.login": "Connexion",
    "nav.signup": "Essai gratuit",
    "nav.tryDemo": "Essayer la démo gratuite",
    "hero.badge": "PDG + 9 agents spécialistes",
    "hero.title": "Un conseil d'administration qui réfléchit, débat et exécute — avant que votre argent ne bouge.",
    "hero.subtitle":
      "Donnez-lui du capital, une idée approximative ou une hypothèse fragile. Le PDG IA coordonne neuf spécialistes, remet en question votre stratégie, crée des tâches de validation, mémorise chaque décision et anime des revues hebdomadaires — pour valider avant de construire.",
    "hero.ctaPrimary": "Essai gratuit",
    "hero.ctaSecondary": "J'ai déjà un compte",
    "hero.ctaTertiary": "Essayer sans s'inscrire",
    "hero.specialists": "Découvrez quelques spécialistes",
    "hero.specialistsNote": "Plus CTO, Produit, Marketing, Juridique, Designer et un Assistant Exécutif — tout dans l'essai gratuit.",
    "hero.footerNote": "Aucune carte bancaire requise pour l'essai gratuit.",
    "auth.loginTitle": "Content de vous revoir",
    "auth.signupTitle": "Commencez votre essai gratuit",
    "auth.loginSubtitle": "Connectez-vous pour reprendre où vous en étiez.",
    "auth.signupSubtitle": "Neuf agents spécialistes et un PDG, prêts à challenger votre prochaine décision.",
    "auth.nameLabel": "Nom",
    "auth.emailLabel": "E-mail",
    "auth.passwordLabel": "Mot de passe",
    "auth.loginButton": "Connexion",
    "auth.signupButton": "Créer un compte gratuit",
    "auth.alreadyAccount": "Déjà un compte ?",
    "auth.newHere": "Nouveau ici ?",
    "auth.loginLink": "Connexion",
    "auth.signupLink": "Essai gratuit",
    "demo.banner": "Vous êtes en mode démo — inscrivez-vous gratuitement pour sauvegarder votre progression.",
    "demo.cta": "Inscription gratuite",
  },
  de: {
    "nav.login": "Anmelden",
    "nav.signup": "Kostenlos testen",
    "nav.tryDemo": "Kostenlose Demo testen",
    "hero.badge": "CEO + 9 Spezialagenten",
    "hero.title": "Ein Vorstand, der denkt, diskutiert und handelt — bevor sich Ihr Geld bewegt.",
    "hero.subtitle":
      "Geben Sie ihm Kapital, eine grobe Idee oder eine schwache Annahme. Der KI-CEO koordiniert neun Spezialisten, hinterfragt Ihre Strategie, erstellt Validierungsaufgaben, merkt sich jede Entscheidung und führt wöchentliche Board-Reviews durch — damit Sie validieren, bevor Sie bauen.",
    "hero.ctaPrimary": "Kostenlos testen",
    "hero.ctaSecondary": "Ich habe bereits ein Konto",
    "hero.ctaTertiary": "Ohne Anmeldung testen",
    "hero.specialists": "Lernen Sie einige Spezialisten kennen",
    "hero.specialistsNote": "Plus CTO, Produkt, Marketing, Recht, Designer und ein Executive Assistant — alles in der kostenlosen Testversion.",
    "hero.footerNote": "Keine Kreditkarte für die kostenlose Testversion erforderlich.",
    "auth.loginTitle": "Willkommen zurück",
    "auth.signupTitle": "Starten Sie Ihre kostenlose Testversion",
    "auth.loginSubtitle": "Melden Sie sich an, um dort weiterzumachen, wo Sie aufgehört haben.",
    "auth.signupSubtitle": "Neun Spezialagenten und ein CEO, bereit, Ihren nächsten Schritt zu hinterfragen.",
    "auth.nameLabel": "Name",
    "auth.emailLabel": "E-Mail",
    "auth.passwordLabel": "Passwort",
    "auth.loginButton": "Anmelden",
    "auth.signupButton": "Kostenloses Konto erstellen",
    "auth.alreadyAccount": "Bereits ein Konto?",
    "auth.newHere": "Neu hier?",
    "auth.loginLink": "Anmelden",
    "auth.signupLink": "Kostenlos testen",
    "demo.banner": "Sie befinden sich im Demo-Modus — registrieren Sie sich kostenlos, um Ihren Fortschritt zu speichern.",
    "demo.cta": "Kostenlos registrieren",
  },
  hi: {
    "nav.login": "लॉग इन करें",
    "nav.signup": "मुफ़्त ट्रायल शुरू करें",
    "nav.tryDemo": "मुफ़्त डेमो आज़माएं",
    "hero.badge": "CEO + 9 विशेषज्ञ एजेंट",
    "hero.title": "एक बोर्डरूम जो सोचता है, तर्क करता है, और क्रियान्वित करता है — आपका पैसा हिलने से पहले।",
    "hero.subtitle":
      "इसे पूंजी, एक मोटा-मोटा विचार, या एक कमज़ोर धारणा दें। AI CEO नौ विशेषज्ञों का समन्वय करता है, आपकी रणनीति को चुनौती देता है, सत्यापन कार्य बनाता है, हर निर्णय याद रखता है, और साप्ताहिक बोर्ड समीक्षा चलाता है — ताकि आप बनाने से पहले सत्यापित करें।",
    "hero.ctaPrimary": "मुफ़्त ट्रायल शुरू करें",
    "hero.ctaSecondary": "मेरे पास पहले से खाता है",
    "hero.ctaTertiary": "बिना साइन अप किए आज़माएं",
    "hero.specialists": "कुछ विशेषज्ञों से मिलें",
    "hero.specialistsNote": "साथ ही CTO, प्रोडक्ट, मार्केटिंग, लीगल, डिज़ाइनर, और एक एक्ज़ीक्यूटिव असिस्टेंट — सब मुफ़्त ट्रायल में।",
    "hero.footerNote": "मुफ़्त ट्रायल के लिए क्रेडिट कार्ड की आवश्यकता नहीं है।",
    "auth.loginTitle": "वापसी पर स्वागत है",
    "auth.signupTitle": "अपना मुफ़्त ट्रायल शुरू करें",
    "auth.loginSubtitle": "जहां आपने छोड़ा था वहां से जारी रखने के लिए लॉग इन करें।",
    "auth.signupSubtitle": "नौ विशेषज्ञ एजेंट और एक CEO, आपके अगले कदम को चुनौती देने के लिए तैयार।",
    "auth.nameLabel": "नाम",
    "auth.emailLabel": "ईमेल",
    "auth.passwordLabel": "पासवर्ड",
    "auth.loginButton": "लॉग इन करें",
    "auth.signupButton": "मुफ़्त खाता बनाएं",
    "auth.alreadyAccount": "पहले से खाता है?",
    "auth.newHere": "यहां नए हैं?",
    "auth.loginLink": "लॉग इन करें",
    "auth.signupLink": "मुफ़्त ट्रायल शुरू करें",
    "demo.banner": "आप डेमो मोड में हैं — अपनी प्रगति सहेजने के लिए मुफ़्त में साइन अप करें।",
    "demo.cta": "मुफ़्त साइन अप करें",
  },
  ar: {
    "nav.login": "تسجيل الدخول",
    "nav.signup": "ابدأ التجربة المجانية",
    "nav.tryDemo": "جرّب العرض التوضيحي المجاني",
    "hero.badge": "الرئيس التنفيذي + 9 وكلاء متخصصين",
    "hero.title": "غرفة اجتماعات تفكّر وتناقش وتنفّذ — قبل أن يتحرك مالك.",
    "hero.subtitle":
      "امنحه رأس مال، أو فكرة أولية، أو افتراضًا ضعيفًا. يقوم الرئيس التنفيذي بالذكاء الاصطناعي بتنسيق تسعة متخصصين، وتحدي استراتيجيتك، وإنشاء مهام إثبات، وتذكّر كل قرار، وإجراء مراجعات أسبوعية للمجلس — لتتحقق قبل أن تبني.",
    "hero.ctaPrimary": "ابدأ التجربة المجانية",
    "hero.ctaSecondary": "لدي حساب بالفعل",
    "hero.ctaTertiary": "جرّب دون التسجيل",
    "hero.specialists": "تعرّف على بعض المتخصصين",
    "hero.specialistsNote": "بالإضافة إلى CTO والمنتج والتسويق والقانوني والمصمم ومساعد تنفيذي — كل ذلك ضمن التجربة المجانية.",
    "hero.footerNote": "لا حاجة لبطاقة ائتمان للتجربة المجانية.",
    "auth.loginTitle": "مرحبًا بعودتك",
    "auth.signupTitle": "ابدأ تجربتك المجانية",
    "auth.loginSubtitle": "سجّل الدخول لمتابعة ما توقفت عنده.",
    "auth.signupSubtitle": "تسعة وكلاء متخصصين ورئيس تنفيذي، جاهزون لتحدي خطوتك التالية.",
    "auth.nameLabel": "الاسم",
    "auth.emailLabel": "البريد الإلكتروني",
    "auth.passwordLabel": "كلمة المرور",
    "auth.loginButton": "تسجيل الدخول",
    "auth.signupButton": "إنشاء حساب مجاني",
    "auth.alreadyAccount": "لديك حساب بالفعل؟",
    "auth.newHere": "جديد هنا؟",
    "auth.loginLink": "تسجيل الدخول",
    "auth.signupLink": "ابدأ التجربة المجانية",
    "demo.banner": "أنت في وضع العرض التوضيحي — سجّل مجانًا لحفظ تقدمك.",
    "demo.cta": "سجّل مجانًا",
  },
};

const LOCALE_STORAGE_KEY = "ceoai-locale";
const RTL_STORAGE_KEY = "ceoai-rtl-override";

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  rtl: boolean;
  setRtl: (value: boolean) => void;
  toggleRtl: () => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>("en");
  const [rtl, setRtlState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY) as LocaleCode | null;
    const storedRtl = window.localStorage.getItem(RTL_STORAGE_KEY);
    const initialLocale = storedLocale && dictionaries[storedLocale] ? storedLocale : "en";
    setLocaleState(initialLocale);
    if (storedRtl !== null) {
      setRtlState(storedRtl === "true");
    } else {
      setRtlState(LOCALES.find((option) => option.code === initialLocale)?.rtl ?? false);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    window.localStorage.setItem(RTL_STORAGE_KEY, String(rtl));
  }, [locale, rtl, mounted]);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    const option = LOCALES.find((entry) => entry.code === code);
    if (option) setRtlState(option.rtl);
  }, []);

  const setRtl = useCallback((value: boolean) => setRtlState(value), []);
  const toggleRtl = useCallback(() => setRtlState((current) => !current), []);

  const t = useCallback(
    (key: string) => dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key,
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, rtl, setRtl, toggleRtl, t }),
    [locale, setLocale, rtl, setRtl, toggleRtl, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
