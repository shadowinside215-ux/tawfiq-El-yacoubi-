import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  Menu, 
  X, 
  Trophy, 
  Target, 
  Users, 
  TrendingUp, 
  Phone, 
  Mail, 
  MessageCircle, 
  ChevronRight, 
  Globe,
  Award,
  Check,
  Shield,
  Star,
  Instagram,
  Facebook,
  Play,
  Upload,
  AlertCircle
} from 'lucide-react';
import { translations } from './translations';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDocFromServer,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const errInfo = JSON.parse(this.state.error?.message || "{}");
        if (errInfo.error) {
          message = `Firestore Error: ${errInfo.error} (${errInfo.operationType} on ${errInfo.path})`;
        }
      } catch (e) {
        message = this.state.error?.message || message;
      }

      return (
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 text-center">
          <div className="glass p-8 rounded-3xl max-w-md">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Oops!</h2>
            <p className="text-white/60 mb-6">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-brand-accent text-white rounded-full font-bold"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const CLOUDINARY_CLOUD_NAME = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

const getImageUrl = (filename: string, transforms = "") => {
  if (filename.startsWith('http')) return filename;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME'}/image/upload/${transforms}/${filename}`;
};

type Language = 'fr' | 'en' | 'ar';

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [lang, setLang] = useState<Language>('fr');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const t = translations[lang];
  const isRtl = lang === 'ar';

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 200]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  
  // Admin State
  const [user, setUser] = useState<User | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Gallery State
  const [galleryImages, setGalleryImages] = useState<string[]>(['gallery-1.jpg', 'gallery-2.jpg', 'gallery-3.jpg', 'gallery-4.jpg', 'gallery-5.jpg', 'gallery-6.jpg']);
  const [whyImages, setWhyImages] = useState<string[]>(['action-1.jpg', 'action-2.jpg']);
  const [disciplineImages, setDisciplineImages] = useState<Record<string, string>>({
    muaythai: '',
    k1: '',
    kickboxing: '',
    mma: '',
    fullcontact: '',
    fitness: '',
  });
  const [storyVideo, setStoryVideo] = useState<string>('');
  const [heroImage, setHeroImage] = useState<string>('');
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  // Cloudinary Config State (if not in env)
  const [cloudConfig, setCloudConfig] = useState({
    name: CLOUDINARY_CLOUD_NAME,
    preset: CLOUDINARY_UPLOAD_PRESET
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u && u.email === 'dragonballsam86@gmail.com') {
        setIsAdminLoggedIn(true);
      } else {
        setIsAdminLoggedIn(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listener
  useEffect(() => {
    if (!isAuthReady) return;

    const configDoc = doc(db, 'settings', 'main');
    const unsubscribe = onSnapshot(configDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.galleryImages) setGalleryImages(data.galleryImages);
        if (data.whyImages) setWhyImages(data.whyImages);
        if (data.disciplineImages) setDisciplineImages(data.disciplineImages);
        if (data.storyVideo) setStoryVideo(data.storyVideo);
        if (data.heroImage) setHeroImage(data.heroImage);
        setIsInitialDataLoaded(true);
      } else {
        setIsInitialDataLoaded(true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/main');
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'settings', 'main'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const saveToFirestore = async (newData: any) => {
    if (!isAdminLoggedIn) return;
    const configDoc = doc(db, 'settings', 'main');
    try {
      await setDoc(configDoc, {
        ...newData,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/main');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'sam' && loginForm.password === 'sam2006') {
      // This is just for UI state, but for Firestore writes, we need Firebase Auth
      // We'll prompt for Google Login if they use this
      setLoginError('Please use "Sign in with Google" to enable admin editing.');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError("Google login failed.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdminLoggedIn(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const openUploadWidget = (index?: number | string, type: 'gallery' | 'why' | 'discipline' | 'video' | 'hero' = 'gallery') => {
    if (!cloudConfig.name || !cloudConfig.preset) {
      alert("Please configure Cloudinary Cloud Name and Upload Preset in the Admin Panel first.");
      return;
    }

    // @ts-ignore
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudConfig.name,
        uploadPreset: cloudConfig.preset,
        sources: ['local', 'url', 'camera'],
        resourceType: type === 'video' ? 'video' : 'image',
        multiple: index === undefined,
        cropping: false,
        styles: {
          palette: {
            window: "#0a0a0f",
            sourceBg: "#0d1b2a",
            windowBorder: "#c1272d",
            tabIcon: "#c1272d",
            inactiveTabIcon: "#ffffff",
            menuIcons: "#c1272d",
            link: "#c1272d",
            action: "#c1272d",
            inProgress: "#c1272d",
            complete: "#25D366",
            error: "#ff0000",
            textDark: "#000000",
            textLight: "#ffffff"
          }
        }
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          const newUrl = result.info.secure_url;
          if (type === 'video') {
            saveToFirestore({ storyVideo: newUrl });
          } else if (type === 'hero') {
            saveToFirestore({ heroImage: newUrl });
          } else if (type === 'discipline' && typeof index === 'string') {
            saveToFirestore({ disciplineImages: { ...disciplineImages, [index]: newUrl } });
          } else if (type === 'why' && typeof index === 'number') {
            const next = [...whyImages];
            next[index] = newUrl;
            saveToFirestore({ whyImages: next });
          } else if (index !== undefined && typeof index === 'number') {
            const next = [...galleryImages];
            next[index] = newUrl;
            saveToFirestore({ galleryImages: next });
          } else {
            saveToFirestore({ galleryImages: [newUrl, ...galleryImages] });
          }
        }
      }
    );
    widget.open();
  };

  const toggleLang = (newLang: Language) => {
    setLang(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    setIsMenuOpen(false);
  };

  const navLinks = [
    { href: '#about', label: t.nav.about },
    { href: '#story', label: t.story.title },
    { href: '#disciplines', label: t.nav.disciplines },
    { href: '#achievements', label: t.nav.achievements },
    { href: '#gallery', label: t.nav.gallery },
    { href: '#contact', label: t.nav.contact },
  ];

  return (
    <div className={`min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-accent selection:text-white ${isRtl ? 'font-arabic' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Texture Overlay */}
      <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-brand-dark/95 border-b border-brand-accent/20 py-3 shadow-2xl shadow-brand-accent/5' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-none">
              {(['fr', 'en', 'ar'] as Language[]).map(l => (
                <button 
                  key={l} 
                  onClick={() => toggleLang(l)}
                  className={`relative text-[10px] font-black px-4 py-2 transition-all duration-500 ${lang === l ? 'text-brand-dark' : 'text-white/50 hover:text-white'}`}
                >
                  {lang === l && (
                    <motion.div 
                      layoutId="lang-bg"
                      className="absolute inset-0 bg-brand-accent z-0"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{l.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-xs font-bold uppercase tracking-[0.2em] hover:text-brand-accent transition-all relative group">
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-brand-accent transition-all group-hover:w-full"></span>
              </a>
            ))}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden w-12 h-12 flex items-center justify-center bg-brand-accent text-brand-dark rounded-none shadow-[4px_4px_0px_rgba(255,255,255,0.1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} strokeWidth={3} /> : <Menu size={24} strokeWidth={3} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-brand-dark/98 backdrop-blur-2xl flex flex-col items-center justify-center gap-10 lg:hidden"
          >
            {navLinks.map((link, idx) => (
              <motion.a 
                key={link.href} 
                href={link.href} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setIsMenuOpen(false)}
                className="text-4xl font-display font-black tracking-tighter hover:text-brand-accent transition-colors"
              >
                {link.label}
              </motion.a>
            ))}
            <div className="flex gap-2 mt-8">
              {(['fr', 'en', 'ar'] as Language[]).map(l => (
                <button 
                  key={l} 
                  onClick={() => toggleLang(l)}
                  className={`text-sm font-black px-6 py-3 rounded-none border border-white/10 ${lang === l ? 'bg-brand-accent text-brand-dark border-brand-accent' : 'bg-white/5 text-white'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/0 via-brand-dark/20 to-brand-dark z-10"></div>
          {isInitialDataLoaded && (
            <img 
              src={heroImage || "https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?auto=format&fit=crop&q=80&w=2070"} 
              alt="Martial Arts Background" 
              className="w-full h-full object-cover opacity-60"
              referrerPolicy="no-referrer"
            />
          )}
        </motion.div>
        
        {isAdminLoggedIn && (
          <button 
            onClick={() => openUploadWidget(undefined, 'hero')}
            className="absolute bottom-10 right-10 z-30 bg-brand-accent/20 hover:bg-brand-accent/40 text-white p-4 rounded-none border border-white/20 backdrop-blur-md flex items-center gap-2 transition-all"
          >
            <Upload size={20} />
            Change Hero Image
          </button>
        )}

        <div className="relative z-20 w-full max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-6 lg:gap-12 text-center lg:text-left mt-12 lg:mt-0"
          >
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-7xl lg:text-8xl font-display font-black mb-4 md:mb-8 leading-[0.85] tracking-tighter overflow-hidden">
                <motion.span 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  TAWFIQ
                </motion.span>
                <motion.span 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.6, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="block text-gradient"
                >
                  EL YACOUBI
                </motion.span>
              </h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="text-lg md:text-xl text-white/60 leading-relaxed font-light"
              >
                {t.hero.subtitle}
              </motion.p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <motion.a 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="#contact" 
                className="group relative px-6 py-3 sm:px-10 sm:py-5 bg-brand-accent text-brand-dark font-bold rounded-none overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(193,39,45,0.4)] text-sm sm:text-base"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t.hero.cta}
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </motion.a>
              <motion.a 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="#about" 
                className="px-6 py-3 sm:px-10 sm:py-5 bg-white/5 backdrop-blur-xl border border-white/10 text-white font-bold rounded-none hover:bg-white/10 transition-all text-sm sm:text-base"
              >
                {t.nav.about}
              </motion.a>
            </div>
          </motion.div>
        </div>

      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-brand-dark">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-black mb-6">
              {t.about.title}
            </h2>
            <p className="text-lg text-white/70 leading-relaxed mb-8">
              {t.about.bio}
            </p>
            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-none bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Trophy size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold">World Class</p>
                  <p className="text-xs text-white/50">Competitor</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-none bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Award size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold">Certified</p>
                  <p className="text-xs text-white/50">National Coach</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* My Story Section */}
      <section id="story" className="py-24 bg-brand-green-dark/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-4">{t.story.title}</h2>
            <div className="w-24 h-1 bg-brand-accent mx-auto rounded-full"></div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div 
              className={`relative aspect-video rounded-none overflow-hidden border border-white/10 bg-brand-dark/40 group ${isAdminLoggedIn ? 'cursor-pointer' : ''}`}
              onClick={() => isAdminLoggedIn && openUploadWidget(0, 'video')}
            >
              {storyVideo ? (
                <video 
                  src={storyVideo} 
                  controls 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                  <Play size={64} className="mb-4" />
                  <p className="uppercase tracking-widest font-bold">Video Placeholder</p>
                </div>
              )}
              
              {isAdminLoggedIn && (
                <div className="absolute inset-0 bg-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-20">
                  <Upload size={48} className="text-white mb-2" />
                  <p className="text-white font-bold uppercase tracking-widest">Upload Story Video</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Disciplines Section */}
      <section id="disciplines" className="py-24 bg-brand-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-4">{t.disciplines.title}</h2>
            <div className="w-24 h-1 bg-brand-accent mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { key: 'muaythai', icon: <Trophy size={32} /> },
              { key: 'k1', icon: <Target size={32} /> },
              { key: 'kickboxing', icon: <Shield size={32} /> },
              { key: 'mma', icon: <TrendingUp size={32} /> },
              { key: 'fullcontact', icon: <Award size={32} /> },
              { key: 'fitness', icon: <Users size={32} /> },
            ].map((item, idx) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass glass-hover p-8 rounded-none group"
              >
                <div 
                  className={`w-16 h-16 rounded-none bg-brand-accent/10 flex items-center justify-center text-brand-accent mb-6 group-hover:scale-110 transition-transform overflow-hidden relative ${isAdminLoggedIn ? 'cursor-pointer' : ''}`}
                  onClick={() => isAdminLoggedIn && openUploadWidget(item.key, 'discipline')}
                >
                  {disciplineImages[item.key] ? (
                    <img 
                      src={getImageUrl(disciplineImages[item.key], 'w_200,c_fill,q_auto')} 
                      alt={item.key} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    item.icon
                  )}
                  {isAdminLoggedIn && (
                    <div className="absolute inset-0 bg-brand-accent/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload size={20} className="text-white" />
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-display font-bold mb-3">{(t.disciplines as any)[item.key]}</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {(t.disciplines as any)[`${item.key}_desc`]}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section id="achievements" className="py-24 bg-brand-dark relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-accent blur-[120px] rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-secondary blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-4">{t.achievements.title}</h2>
            <div className="w-24 h-1 bg-brand-gold mx-auto rounded-full"></div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              {[
                { key: 'world', color: 'text-brand-gold', borderColor: 'border-l-brand-gold' },
                { key: 'africa', color: 'text-brand-secondary', borderColor: 'border-l-brand-secondary' },
                { key: 'arab', color: 'text-brand-secondary', borderColor: 'border-l-brand-secondary' },
                { key: 'morocco_muaythai', color: 'text-white/80', borderColor: 'border-l-white/20' },
              ].map((item, idx) => (
                <motion.div 
                  key={item.key}
                  initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex gap-6 items-start glass p-6 rounded-none border-l-4 ${item.borderColor}`}
                >
                  <div className={`mt-1 ${item.color}`}>
                    <Trophy size={28} />
                  </div>
                  <p className="text-lg font-medium">{(t.achievements as any)[item.key]}</p>
                </motion.div>
              ))}
            </div>
            <div className="space-y-6">
              {[
                { key: 'morocco_kick', color: 'text-white/80', borderColor: 'border-l-white/20' },
                { key: 'morocco_full', color: 'text-white/80', borderColor: 'border-l-white/20' },
                { key: 'mma_reg', color: 'text-white/80', borderColor: 'border-l-white/20' },
                { key: 'blackbelt', color: 'text-brand-secondary', borderColor: 'border-l-brand-secondary' },
              ].map((item, idx) => (
                <motion.div 
                  key={item.key}
                  initial={{ opacity: 0, x: isRtl ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex gap-6 items-start glass p-6 rounded-xl border-l-4 ${item.borderColor}`}
                >
                  <div className={`mt-1 ${item.color}`}>
                    <Award size={28} />
                  </div>
                  <p className="text-lg font-medium">{(t.achievements as any)[item.key]}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Train With Me */}
      <section className="py-24 bg-brand-green-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-black mb-8">{t.why.title}</h2>
              <div className="space-y-6">
                {[1, 2, 3, 4].map(i => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center text-white shrink-0">
                      <Check size={16} />
                    </div>
                    <p className="text-xl font-medium">{(t.why as any)[`point${i}`]}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`relative cursor-pointer overflow-hidden rounded-none border border-white/10 aspect-[3/4] ${isAdminLoggedIn ? 'hover:border-brand-accent transition-colors' : ''}`}
                onClick={() => isAdminLoggedIn && openUploadWidget(0, 'why')}
              >
                <img 
                  src={getImageUrl(whyImages[0], 'w_600,c_fill,q_auto')} 
                  alt="Action 1" 
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                {isAdminLoggedIn && (
                  <div className="absolute inset-0 bg-brand-accent/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={32} className="text-white" />
                  </div>
                )}
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className={`relative cursor-pointer overflow-hidden rounded-none mt-8 md:mt-16 border border-white/10 aspect-[3/4] ${isAdminLoggedIn ? 'hover:border-brand-accent transition-colors' : ''}`}
                onClick={() => isAdminLoggedIn && openUploadWidget(1, 'why')}
              >
                <img 
                  src={getImageUrl(whyImages[1], 'w_600,c_fill,q_auto')} 
                  alt="Action 2" 
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                {isAdminLoggedIn && (
                  <div className="absolute inset-0 bg-brand-accent/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={32} className="text-white" />
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-24 bg-brand-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-4">{t.gallery.title}</h2>
            <div className="w-24 h-1 bg-brand-accent mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {galleryImages.map((img, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-none border border-white/10 group"
                onClick={() => {
                  if (isAdminLoggedIn) {
                    openUploadWidget(i);
                  } else {
                    setSelectedImage(getImageUrl(img, 'w_1200,q_auto'));
                  }
                }}
              >
                {img.includes('gallery-') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 text-white/20">
                    <Upload size={32} className="mb-2" />
                    <span className="text-[10px] uppercase tracking-widest">Empty Slot</span>
                  </div>
                ) : (
                  <img 
                    src={getImageUrl(img, 'w_600,c_fill,q_auto')} 
                    alt={`Gallery ${i}`} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                )}
                {isAdminLoggedIn && !img.includes('gallery-') && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = [...galleryImages];
                      next[i] = `gallery-${i + 1}.jpg`; // Reset to placeholder
                      saveToFirestore({ galleryImages: next });
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
                )}
              </motion.div>
            ))}
            {isAdminLoggedIn && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-none border-2 border-dashed border-white/10 hover:border-brand-accent/50 flex flex-col items-center justify-center group bg-white/5"
                onClick={() => openUploadWidget()}
              >
                <Upload size={32} className="text-brand-accent mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white/40 group-hover:text-white uppercase tracking-widest">Add New Slot</span>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-brand-dark/95 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-6 right-6 text-white hover:text-brand-accent">
              <X size={40} />
            </button>
            <img 
              src={selectedImage} 
              alt="Full view" 
              className="max-w-full max-h-full rounded-none shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-brand-dark">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-display font-black mb-12">{t.contact.title}</h2>
          
          <div className="glass p-12 rounded-none max-w-2xl mx-auto border-l-4 border-brand-accent">
            <div className="space-y-12 mb-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-none bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Phone size={32} />
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">{t.contact.phone}</p>
                  <p className="text-3xl font-bold">06 65 73 85 93</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-none bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Mail size={32} />
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">{t.contact.email}</p>
                  <p className="text-xl md:text-3xl font-bold break-all">elyacoubitawfik@gmail.com</p>
                  <p className="text-brand-accent text-sm mt-2 font-medium italic">{t.contact.ready}</p>
                </div>
              </div>
            </div>

            <a 
              href="https://wa.me/212665738593" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-4 px-12 py-6 bg-[#25D366] text-white text-xl font-bold rounded-none hover:scale-102 transition-all shadow-2xl shadow-[#25D366]/20"
            >
              <svg 
                viewBox="0 0 24 24" 
                width="32" 
                height="32" 
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {t.contact.whatsapp}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-brand-dark border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="text-center md:text-left">
              <p className="text-white/40 text-sm max-w-xs">
                Elite martial arts training and personal coaching for results-driven individuals.
              </p>
              {/* Admin Access Hidden as per user request */}
              {isAdminLoggedIn && (
                <button 
                  onClick={handleLogout}
                  className="mt-4 text-[10px] text-white/20 hover:text-brand-accent transition-colors uppercase tracking-widest"
                >
                  Logout Admin
                </button>
              )}
            </div>
            <div className="flex gap-6">
              <a 
                href="https://www.instagram.com/tawfikelyacoubi?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-accent transition-colors"
              >
                <Instagram size={20} />
              </a>
              <a 
                href="https://www.facebook.com/share/1bHQ8DpGME/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-accent transition-colors"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 text-xs text-white/30 gap-4">
            <p>© {new Date().getFullYear()} Tawfiq El Yacoubi. {t.footer.rights}</p>
            <div className="flex gap-6">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} className="hover:text-white transition-colors">{link.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {isAdminLoggedIn && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] glass p-4 rounded-2xl flex flex-wrap items-center gap-4 shadow-2xl border-brand-accent/30"
          >
            <div className="flex items-center gap-2 px-3 py-1 bg-brand-accent/20 rounded-lg text-brand-accent text-xs font-bold uppercase tracking-widest">
              <Shield size={14} /> Admin Mode
            </div>
            
            <div className="h-6 w-px bg-white/10 mx-2"></div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Cloud Name" 
                value={cloudConfig.name}
                onChange={(e) => setCloudConfig(prev => ({ ...prev, name: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-brand-accent"
              />
              <input 
                type="text" 
                placeholder="Upload Preset" 
                value={cloudConfig.preset}
                onChange={(e) => setCloudConfig(prev => ({ ...prev, preset: e.target.value }))}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-brand-accent"
              />
            </div>

            <button 
              onClick={openUploadWidget}
              className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-bold hover:bg-brand-accent/80 transition-all"
            >
              <Upload size={16} /> Add Pictures
            </button>
            
            <button 
              onClick={() => setIsAdminLoggedIn(false)}
              className="p-2 text-white/40 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-brand-dark/95 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass p-8 rounded-3xl w-full max-w-md relative"
            >
              <button 
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-3xl font-display font-black mb-6 text-center">Admin Login</h2>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/60">Username</label>
                  <input 
                    type="text" 
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-brand-accent transition-colors" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/60">Password</label>
                  <input 
                    type="password" 
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-brand-accent transition-colors" 
                  />
                </div>
                {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
                <button className="w-full py-4 bg-brand-accent text-white font-bold rounded-lg hover:bg-brand-accent/80 transition-all shadow-lg shadow-brand-accent/20">
                  Login
                </button>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-brand-dark px-2 text-white/40">Or continue with</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-4 bg-white text-brand-dark font-bold rounded-lg hover:bg-white/90 transition-all flex items-center justify-center gap-3"
                >
                  <Globe size={20} />
                  Sign in with Google
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
