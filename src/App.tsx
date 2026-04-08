import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Zap,
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

  const openUploadWidget = (index?: number | string, type: 'gallery' | 'why' | 'discipline' | 'video' = 'gallery') => {
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
            windowBorder: "#1a3a5c",
            tabIcon: "#00aaff",
            inactiveTabIcon: "#ffffff",
            menuIcons: "#00aaff",
            link: "#00aaff",
            action: "#00aaff",
            inProgress: "#00aaff",
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
    { href: '#testimonials', label: t.nav.testimonials },
    { href: '#contact', label: t.nav.contact },
  ];

  return (
    <div className={`min-h-screen selection:bg-brand-accent selection:text-white`}>
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-brand-dark/90 backdrop-blur-md py-4 shadow-xl' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="w-10"></div> {/* Spacer where logo was */}

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-sm font-medium hover:text-brand-accent transition-colors">
                {link.label}
              </a>
            ))}
            <div className="flex items-center gap-2 ml-4 border-l border-white/10 pl-6">
              {(['fr', 'en', 'ar'] as Language[]).map(l => (
                <button 
                  key={l} 
                  onClick={() => toggleLang(l)}
                  className={`text-xs px-2 py-1 rounded transition-all ${lang === l ? 'bg-brand-accent text-white' : 'hover:bg-white/10'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="lg:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: isRtl ? -100 : 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? -100 : 100 }}
            className="fixed inset-0 z-40 bg-brand-dark flex flex-col items-center justify-center gap-8 lg:hidden"
          >
            {navLinks.map(link => (
              <a 
                key={link.href} 
                href={link.href} 
                onClick={() => setIsMenuOpen(false)}
                className="text-2xl font-display font-bold hover:text-brand-accent"
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-4 mt-4">
              {(['fr', 'en', 'ar'] as Language[]).map(l => (
                <button 
                  key={l} 
                  onClick={() => toggleLang(l)}
                  className={`text-lg px-4 py-2 rounded ${lang === l ? 'bg-brand-accent text-white' : 'bg-white/5'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/20 via-brand-dark/60 to-brand-dark"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-8xl font-display font-black mb-8 leading-tight">
              TAWFIQ <span className="text-gradient">EL YACOUBI</span>
            </h1>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="#contact" 
                className="group relative px-8 py-4 bg-brand-accent text-white font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
              >
                <span className="relative z-10">{t.hero.cta}</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </a>
              <a 
                href="#about" 
                className="px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 text-white font-bold rounded-full hover:bg-white/10 transition-all"
              >
                {t.nav.about}
              </a>
            </div>
          </motion.div>
        </div>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30"
        >
          <ChevronRight size={32} className="rotate-90" />
        </motion.div>
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
                <div className="w-12 h-12 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Trophy size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold">World Class</p>
                  <p className="text-xs text-white/50">Competitor</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent">
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
      <section id="story" className="py-24 bg-brand-navy/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-4">{t.story.title}</h2>
            <div className="w-24 h-1 bg-brand-accent mx-auto rounded-full"></div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div 
              className={`relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black/40 group ${isAdminLoggedIn ? 'cursor-pointer' : ''}`}
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
              { key: 'muaythai', icon: <Zap size={32} /> },
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
                className="glass glass-hover p-8 rounded-2xl group"
              >
                <div 
                  className={`w-16 h-16 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent mb-6 group-hover:scale-110 transition-transform overflow-hidden relative ${isAdminLoggedIn ? 'cursor-pointer' : ''}`}
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
                <p className="text-white/50 text-sm">
                  Professional training programs tailored for all skill levels, from beginners to elite athletes.
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
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-blue blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-4">{t.achievements.title}</h2>
            <div className="w-24 h-1 bg-brand-gold mx-auto rounded-full"></div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              {[
                { key: 'world', color: 'text-brand-gold' },
                { key: 'africa', color: 'text-brand-accent' },
                { key: 'arab', color: 'text-brand-accent' },
                { key: 'morocco_muaythai', color: 'text-white/80' },
              ].map((item, idx) => (
                <motion.div 
                  key={item.key}
                  initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-6 items-start glass p-6 rounded-xl border-l-4 border-l-brand-gold"
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
                { key: 'morocco_kick', color: 'text-white/80' },
                { key: 'morocco_full', color: 'text-white/80' },
                { key: 'mma_reg', color: 'text-white/80' },
                { key: 'blackbelt', color: 'text-brand-accent' },
              ].map((item, idx) => (
                <motion.div 
                  key={item.key}
                  initial={{ opacity: 0, x: isRtl ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex gap-6 items-start glass p-6 rounded-xl border-l-4 border-l-brand-accent"
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
      <section className="py-24 bg-brand-navy">
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
                      <Star size={16} fill="currentColor" />
                    </div>
                    <p className="text-xl font-medium">{(t.why as any)[`point${i}`]}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 ${isAdminLoggedIn ? 'hover:border-brand-accent transition-colors' : ''}`}
                onClick={() => isAdminLoggedIn && openUploadWidget(0, 'why')}
              >
                <img 
                  src={getImageUrl(whyImages[0], 'w_600,c_fill,q_auto')} 
                  alt="Action 1" 
                  className="w-full h-64 object-cover"
                  referrerPolicy="no-referrer"
                />
                {isAdminLoggedIn && (
                  <div className="absolute inset-0 bg-brand-accent/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Zap size={32} className="text-white" />
                  </div>
                )}
              </div>
              <div 
                className={`relative cursor-pointer overflow-hidden rounded-2xl mt-8 border border-white/10 ${isAdminLoggedIn ? 'hover:border-brand-accent transition-colors' : ''}`}
                onClick={() => isAdminLoggedIn && openUploadWidget(1, 'why')}
              >
                <img 
                  src={getImageUrl(whyImages[1], 'w_600,c_fill,q_auto')} 
                  alt="Action 2" 
                  className="w-full h-64 object-cover"
                  referrerPolicy="no-referrer"
                />
                {isAdminLoggedIn && (
                  <div className="absolute inset-0 bg-brand-accent/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Zap size={32} className="text-white" />
                  </div>
                )}
              </div>
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
                className="relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-white/10 group"
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
                    <Zap size={32} className="mb-2" />
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
                <div className="absolute inset-0 bg-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Zap size={32} className="text-white" />
                </div>
                {isAdminLoggedIn && !img.includes('gallery-') && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = [...galleryImages];
                      next[i] = `gallery-${i + 1}.jpg`; // Reset to placeholder
                      saveToFirestore({ galleryImages: next });
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                )}
              </motion.div>
            ))}
            {isAdminLoggedIn && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-white/10 hover:border-brand-accent/50 flex flex-col items-center justify-center group bg-white/5"
                onClick={() => openUploadWidget()}
              >
                <Zap size={32} className="text-brand-accent mb-2 group-hover:scale-110 transition-transform" />
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
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-6 right-6 text-white hover:text-brand-accent">
              <X size={40} />
            </button>
            <img 
              src={selectedImage} 
              alt="Full view" 
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-brand-navy/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-4">{t.testimonials.title}</h2>
            <div className="w-24 h-1 bg-brand-accent mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="glass p-8 rounded-2xl relative"
              >
                <div className="absolute -top-4 left-8 text-brand-accent">
                  <MessageCircle size={40} fill="currentColor" className="opacity-20" />
                </div>
                <p className="text-white/70 italic mb-6">"{(t.testimonials as any)[`t${i}`].text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-accent/20 flex items-center justify-center font-bold text-brand-accent">
                    {(t.testimonials as any)[`t${i}`].name[0]}
                  </div>
                  <p className="font-bold">{(t.testimonials as any)[`t${i}`].name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-brand-dark">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-display font-black mb-12">{t.contact.title}</h2>
          
          <div className="glass p-12 rounded-3xl max-w-2xl mx-auto">
            <div className="space-y-12 mb-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Phone size={32} />
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">{t.contact.phone}</p>
                  <p className="text-3xl font-bold">06 65 73 85 93</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Mail size={32} />
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-1">{t.contact.email}</p>
                  <p className="text-3xl font-bold">elyacoubitawfik@gmail.com</p>
                </div>
              </div>
            </div>

            <a 
              href="https://wa.me/212665738593" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-4 px-12 py-6 bg-[#25D366] text-white text-xl font-bold rounded-full hover:scale-105 transition-all shadow-2xl shadow-[#25D366]/20"
            >
              <MessageCircle size={32} />
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
              <h2 className="text-2xl font-display font-black tracking-tighter mb-2">
                TAWFIQ <span className="text-brand-accent">EL YACOUBI</span>
              </h2>
              <p className="text-white/40 text-sm max-w-xs">
                Elite martial arts training and personal coaching for results-driven individuals.
              </p>
              <button 
                onClick={() => isAdminLoggedIn ? handleLogout() : setShowLoginModal(true)}
                className="mt-4 text-[10px] text-white/20 hover:text-brand-accent transition-colors uppercase tracking-widest"
              >
                {isAdminLoggedIn ? 'Logout Admin' : 'Admin Access'}
              </button>
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
              <Zap size={16} /> Add Pictures
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
