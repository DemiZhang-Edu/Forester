import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  increment,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth, loginWithGoogle, logout } from './lib/firebase';
import { Post, Comment, UserProfile, ChatMessage, PostStatus, OperationType, FOREST_BADGES } from './types';
import { handleFirestoreError } from './lib/errorHandlers';
import { describeMedia } from './lib/gemini';
import { onAuthStateChanged } from 'firebase/auth';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageSquare, 
  Trophy, 
  ShieldCheck, 
  Plus, 
  LogOut, 
  User as UserIcon,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Award,
  Loader2,
  Sun,
  Moon,
  Sparkles,
  Camera,
  X,
  MousePointer2,
  Share2,
  Menu,
  Trees,
  Fingerprint
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ForestBackground } from '@/components/ForestBackground';
import { AuthModal } from '@/components/AuthModal';
import { WildlifeAI } from '@/components/WildlifeAI';
import { ImageAnnotator } from '@/components/ImageAnnotator';
import { SplashScreen } from '@/components/SplashScreen';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'feed' | 'profile' | 'leaderboard'>('feed');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [minLoadingDone, setMinLoadingDone] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [annotatingImage, setAnnotatingImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitDescription, setSubmitDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Handle Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setMinLoadingDone(true), 2500);
    return () => clearTimeout(timer);
  }, []);


  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userRef = doc(db, 'users', fbUser.uid);
        
        unsubscribeUser = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            setUser(userData);
          } else {
            const newUser: UserProfile = {
              uid: fbUser.uid,
              displayName: fbUser.displayName || 'Nature Lover',
              email: fbUser.email || '',
              photoURL: fbUser.photoURL || '',
              badges: [],
              postsCount: 0,
              xp: 0,
              totalLikes: 0,
              createdAt: Timestamp.now() as any,
            };
            setDoc(userRef, newUser);
          }
          setLoading(false);
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`));
      } else {
        setUser(null);
        setCurrentView('feed');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // Sync Posts for Feed
  useEffect(() => {
    if (currentView !== 'feed') return;
    const postsQuery = query(
      collection(db, 'posts'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post));
      setPosts(docs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'posts'));

    return unsubscribe;
  }, [currentView, user]);

  useEffect(() => {
    if (!user) return;

    const checkBadges = async () => {
      const newBadges: string[] = [...user.badges];
      let changed = false;

      // Logic for awarding badges
      if (user.postsCount >= 1 && !newBadges.includes('scout')) {
        newBadges.push('scout');
        toast.success('New Badge Unlocked: Forest Scout! 🌲', {
          description: 'You submitted your first photo.'
        });
        changed = true;
      }
      if (user.postsCount >= 5 && !newBadges.includes('watcher')) {
        newBadges.push('watcher');
        toast.success('New Badge Unlocked: Wildlife Watcher! 🦉', {
          description: 'You submitted 5 approved photos.'
        });
        changed = true;
      }
      if (user.postsCount >= 20 && !newBadges.includes('guardian')) {
        newBadges.push('guardian');
        toast.success('New Badge Unlocked: Nature Guardian! 🦁', {
          description: 'You are an active contributor with 20+ posts.'
        });
        changed = true;
      }
      if ((user.totalLikes || 0) >= 100 && !newBadges.includes('star')) {
        newBadges.push('star');
        toast.success('New Badge Unlocked: Community Star! ⭐', {
          description: 'You received 100+ total likes.'
        });
        changed = true;
      }

      if (changed) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            badges: newBadges
          });
          setUser({ ...user, badges: newBadges });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'users');
        }
      }
    };

    checkBadges();
  }, [user?.postsCount, user?.totalLikes]);
  useEffect(() => {
    const leaderQuery = query(
      collection(db, 'users'),
      orderBy('xp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(leaderQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as UserProfile);
      setLeaderboard(docs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return unsubscribe;
  }, [user]);

  const handleAiSuggest = async (type: 'photo' | 'video') => {
    if (!submitUrl) {
      toast.error('Please provide a URL first!');
      return;
    }
    setIsAnalyzing(true);
    try {
      const suggestion = await describeMedia(submitUrl, type);
      setSubmitDescription(suggestion);
      toast.success('AI description generated!');
    } catch (error) {
      toast.error('Failed to analyze media. You can still write your own description!');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCapturedPhoto = (base64: string) => {
    setSubmitUrl(base64);
    setIsCameraOpen(false);
    setIsSubmitOpen(true);
    toast.success('Photo captured! Now add a title and description.');
  };

  const handlePostSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const url = formData.get('url') as string;
    const tagsRaw = formData.get('tags') as string;
    const type = formData.get('type') as 'photo' | 'video';

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '') : [];

    try {
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: user.displayName,
        title,
        description,
        tags,
        url,
        type,
        status: 'approved',
        likes: 0,
        commentCount: 0,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'users', user.uid), {
        postsCount: increment(1),
        xp: increment(type === 'photo' ? 20 : 50)
      });
      toast.success('Your wildlife snap is live!');
      setIsSubmitOpen(false);
      setSubmitUrl('');
      setSubmitDescription('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToProfile = async (userId: string) => {
    if (user && userId === user.uid) {
      setViewingUser(user);
      setCurrentView('profile');
      return;
    }

    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) {
        setViewingUser(userSnap.data() as UserProfile);
        setCurrentView('profile');
      } else {
        toast.error('User not found.');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    }
  };
  const getRank = (xp: number = 0) => {
    if (xp >= 2500) return { name: 'Elder Oak', next: 'Max Level', progress: 100 };
    if (xp >= 1000) return { name: 'Forest Warden', next: 'Elder Oak', progress: ((xp - 1000) / 1500) * 100, needed: 2500 - xp };
    if (xp >= 500) return { name: 'Nature Guardian', next: 'Forest Warden', progress: ((xp - 500) / 500) * 100, needed: 1000 - xp };
    if (xp >= 100) return { name: 'Wildlife Watcher', next: 'Nature Guardian', progress: ((xp - 100) / 400) * 100, needed: 500 - xp };
    return { name: 'Forest Scout', next: 'Wildlife Watcher', progress: (xp / 100) * 100, needed: 100 - xp };
  };

  const currentRank = getRank(user?.xp);

  const renderContent = () => {
    switch (currentView) {
      case 'leaderboard':
        return <LeaderboardFull users={leaderboard} onViewProfile={navigateToProfile} />;
      case 'profile':
        return <ProfileView user={viewingUser || user} currentUser={user} />;
      default:
        return (
          <div className="col-span-12 grid grid-cols-12 gap-8">
            {/* Left Sidebar */}
            <aside className="hidden lg:col-span-3 lg:block space-y-6">
              <ProfileCard user={user} onAction={() => {
                setViewingUser(user);
                setCurrentView('profile');
              }} />
              <LeaderboardSmall users={leaderboard} onUserClick={navigateToProfile} />
              
              <Card className="glass card-vibrant p-5 bg-brand-50/50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-xl">🦉</span>
                  <h3 className="text-xs uppercase tracking-widest font-black text-brand-600">
                    Wise Forest Owl
                  </h3>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 italic mb-4 leading-relaxed">
                  Confused about a species? The forest's wisest owl is standing by to answer your questions!
                </p>
                <div className="flex justify-center py-4 border-2 border-dashed border-brand-100 dark:border-stone-800 rounded-2xl bg-white/30 dark:bg-black/20 text-3xl">
                  🦉
                </div>
                <div className="mt-4">
                  <Button 
                    onClick={() => setIsAiOpen(true)}
                    className="w-full rounded-xl font-black uppercase text-[10px] tracking-widest bg-brand-600 hover:bg-brand-700 text-white shadow-lg h-10 group"
                  >
                    <Sparkles className="w-3 h-3 mr-2 group-hover:animate-pulse" />
                    Consult the Wise Owl
                  </Button>
                </div>
              </Card>

              <Card className="glass card-vibrant p-5">
                <h3 className="text-xs uppercase tracking-widest font-black text-brand-600 mb-4 flex items-center">
                  <Trophy className="w-4 h-4 mr-2" />
                  Forest Status
                </h3>
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Rank</span>
                      <span className="text-sm font-bold text-accent-600 dark:text-accent-400">{currentRank.name}</span>
                    </div>
                    <div className="w-full bg-brand-100 dark:bg-brand-900/50 rounded-full h-2.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${currentRank.progress}%` }}
                        className="bg-brand-500 h-full rounded-full progress-glow"
                      />
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 italic">
                      {currentRank.needed ? `${currentRank.needed} XP until ${currentRank.next} rank` : 'Legend of the Forest'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 dark:text-stone-400 italic">Sign in to track your progress!</p>
                )}
              </Card>

              <Card className="glass card-vibrant p-5">
                <h3 className="text-xs uppercase tracking-widest font-black text-brand-600 mb-4 flex items-center">
                  <Award className="w-4 h-4 mr-2" />
                  Achievements
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {FOREST_BADGES.map((badge) => (
                    <div 
                      key={badge.id}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-1 text-center transition-opacity ${user?.badges.includes(badge.id) ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100' : 'bg-stone-100 dark:bg-stone-800 opacity-30 grayscale'}`}
                    >
                      <div className="text-2xl mb-1">{badge.icon}</div>
                      <span className="text-[9px] font-black leading-none uppercase">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </aside>

            {/* Main Feed */}
            <div className="col-span-12 lg:col-span-6 space-y-8">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-brand-600 transition-colors" />
                <Input 
                  placeholder="Search species, locations, or tags..." 
                  className="pl-12 py-7 rounded-[2rem] border-2 border-brand-100 dark:border-stone-800 bg-card/60 backdrop-blur-sm dark:bg-stone-900/50 shadow-sm focus:ring-brand-500 focus:border-brand-500 text-lg italic font-medium text-stone-900 dark:text-stone-100"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {posts
                .filter(p => {
                  const query = searchQuery.toLowerCase();
                  return p.title.toLowerCase().includes(query) || 
                         p.description.toLowerCase().includes(query) ||
                         p.tags.some(t => t.includes(query));
                })
                .map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    user={user} 
                    onAnnotate={(url) => setAnnotatingImage(url)}
                    onViewProfile={navigateToProfile}
                  />
                ))}
              {posts.length === 0 && (
                <div className="text-center py-20 glass text-card-foreground rounded-3xl border-2 border-dashed border-border">
                  <div className="text-4xl mb-4">🍃</div>
                  <p className="text-stone-500 dark:text-stone-400 font-medium italic">The forest is quiet... be the first to share something!</p>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <aside className="hidden lg:col-span-3 lg:block space-y-6">
              <div className="glass rounded-[32px] p-6 text-brand-900 dark:text-white shadow-xl">
                <h3 className="text-center text-sm font-black uppercase tracking-[0.2em] mb-6 flex items-center justify-center">
                  <Trophy className="w-4 h-4 mr-2 text-accent-400" />
                  Leaderboard
                </h3>
                <div className="space-y-4">
                  {leaderboard.map((member, i) => (
                    <div key={member.uid} className="flex items-center p-3 rounded-2xl bg-white/10 border border-white/5 cursor-pointer hover:bg-white/20 transition-colors" onClick={() => navigateToProfile(member.uid)}>
                      <span className={`w-6 font-black italic ${i === 0 ? 'text-accent-400' : 'text-brand-300'}`}>0{i + 1}</span>
                      <Avatar className="mx-3 border-2 border-brand-500 w-10 h-10 bg-white/5 dark:bg-black/20">
                        <AvatarImage src={member.photoURL} />
                        <AvatarFallback>{member.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold truncate">{member.displayName}</p>
                        <p className="text-[10px] text-brand-300 uppercase tracking-tighter">
                          {member.xp || 0} XP
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground selection:bg-brand-200 dark:selection:bg-brand-900">
      <AnimatePresence mode="wait">
        {(loading || !minLoadingDone) ? (
          <SplashScreen key="splash" />
        ) : (
          <motion.div
            key="main-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-screen flex flex-col shrink-0 overflow-x-hidden"
          >
            <ForestBackground />
            <Toaster position="top-right" richColors />
            
            {/* Header */}
      <header className="sticky top-0 z-50 bg-card/60 backdrop-blur-md border-b-2 border-border/50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold italic shadow-lg">F</div>
          <span className="text-2xl font-black tracking-tight text-brand-900 dark:text-brand-500 italic">Forester</span>
        </div>
        
        <nav className="hidden md:flex space-x-8 font-bold text-brand-700 dark:text-brand-300">
          <button 
            onClick={() => setCurrentView('feed')}
            className={`hover:text-brand-900 dark:hover:text-brand-500 transition-colors ${currentView === 'feed' ? 'text-brand-900 dark:text-brand-500 border-b-2 border-brand-600' : ''}`}
          >
            Explore
          </button>
          {user && (
            <button 
              onClick={() => {
                setViewingUser(user);
                setCurrentView('profile');
              }}
              className={`hover:text-brand-900 dark:hover:text-brand-500 transition-colors ${currentView === 'profile' && viewingUser?.uid === user.uid ? 'text-brand-900 dark:text-brand-500 border-b-2 border-brand-600' : ''}`}
            >
              My Profile
            </button>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => user ? setIsCameraOpen(true) : loginWithGoogle()}
              className="rounded-xl w-10 h-10 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/50 transition-colors"
            >
              <Camera className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="rounded-xl w-10 h-10 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/50 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            {user ? (
              <>
                <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
                  <DialogTrigger render={
                    <Button className="bg-brand-600 hover:bg-brand-700 rounded-xl font-black uppercase tracking-tighter italic shadow-lg shadow-brand-500/20 px-4">
                      <Plus className="w-4 h-4 mr-2" />
                      <span>Submit Photo</span>
                    </Button>
                  } />
                  <DialogContent className="rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black italic text-brand-900 dark:text-brand-500">Share Nature's Beauty</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePostSubmit} className="space-y-4 pt-4">
                      <Input name="title" placeholder="Stunning Title" required className="rounded-xl" />
                      <div className="relative">
                        <Textarea 
                          name="description" 
                          value={submitDescription}
                          onChange={(e) => setSubmitDescription(e.target.value)}
                          placeholder="Where was this captured? What wildlife is pictured?" 
                          required 
                          className="rounded-xl min-h-[100px]" 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const typeInput = document.querySelector('input[name="type"]:checked') as HTMLInputElement;
                            handleAiSuggest(typeInput?.value as 'photo' | 'video' || 'photo');
                          }}
                          disabled={isAnalyzing || !submitUrl}
                          className="absolute bottom-2 right-2 flex items-center space-x-1 text-[10px] uppercase font-black tracking-widest text-brand-600 hover:bg-brand-50"
                        >
                          {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          <span>AI Suggest</span>
                        </Button>
                      </div>
                      <Input name="tags" placeholder="Tags (e.g. owl, forest, sunset) - separated by commas" className="rounded-xl" />
                      <Input 
                        name="url" 
                        value={submitUrl}
                        onChange={(e) => setSubmitUrl(e.target.value)}
                        placeholder="Image or Video URL (Unsplash, etc.)" 
                        required 
                        className="rounded-xl" 
                      />
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="type" value="photo" defaultChecked />
                          <span className="font-medium text-sm">Photo</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="type" value="video" />
                          <span className="font-medium text-sm">Video</span>
                        </label>
                      </div>
                      <Button type="submit" disabled={isSubmitting} className="w-full bg-brand-600 font-bold rounded-xl py-6 text-white">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <span>Sprouting...</span>
                          </>
                        ) : (
                          'Post Now'
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Avatar 
                  className="border-2 border-white dark:border-stone-800 shadow-sm ring-2 ring-brand-100 dark:ring-brand-900/50 cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => {
                    setViewingUser(user);
                    setCurrentView('profile');
                  }}
                >
                  <AvatarImage src={user.photoURL} />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={logout} className="text-stone-500 dark:text-stone-400 rounded-xl">
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <AuthModal isOpen={isAuthOpen} onOpenChange={setIsAuthOpen}>
                <Button className="bg-brand-600 hover:bg-brand-700 rounded-xl font-black uppercase tracking-tighter italic shadow-lg shadow-brand-500/20 px-6">
                  Get Started
                </Button>
              </AuthModal>
            )}
          </div>

          {/* Mobile Smart Menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400">
                  {user ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL} />
                      <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ) : <Menu className="w-6 h-6" />}
                </Button>
              } />
              <DropdownMenuContent align="end" className="w-64 p-3 rounded-[2.5rem] bg-card/95 backdrop-blur-2xl border-2 border-brand-100 dark:border-brand-900/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] z-[100]">
                {user && (
                  <div className="px-3 py-4 mb-2 border-b border-border/50">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12 border-2 border-white dark:border-stone-800">
                        <AvatarImage src={user.photoURL} />
                        <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-black text-stone-900 dark:text-white leading-tight truncate">{user.displayName}</span>
                        <span className="text-[10px] text-brand-600 font-bold uppercase tracking-[0.2em]">{getRank(user.xp).name}</span>
                      </div>
                    </div>
                  </div>
                )}

                <DropdownMenuItem 
                  onClick={() => setCurrentView('feed')} 
                  className="flex items-center space-x-4 p-4 rounded-2xl focus:bg-brand-50 dark:focus:bg-brand-900/40 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600">
                    <Trees className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black uppercase text-xs tracking-tight">Explore Nature</span>
                    <span className="text-[10px] text-stone-500 font-medium tracking-tight">Discover wildlife</span>
                  </div>
                </DropdownMenuItem>

                {user && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => setIsSubmitOpen(true)}
                      className="flex items-center space-x-4 p-4 rounded-2xl focus:bg-brand-600 focus:text-white cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black uppercase text-xs tracking-tight group-focus:text-white">Quick Submit</span>
                        <span className="text-[10px] text-brand-500 font-medium tracking-tight group-focus:text-brand-200">+50 XP</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => setIsCameraOpen(true)}
                      className="flex items-center space-x-4 p-4 rounded-2xl focus:bg-emerald-50 dark:focus:bg-emerald-950/40 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black uppercase text-xs tracking-tight">Direct Capture</span>
                        <span className="text-[10px] text-emerald-500 font-medium tracking-tight">Snap and go</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => {
                        setViewingUser(user);
                        setCurrentView('profile');
                      }}
                      className="flex items-center space-x-4 p-4 rounded-2xl focus:bg-brand-50 dark:focus:bg-brand-900/40 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black uppercase text-xs tracking-tight">Your Profile</span>
                        <span className="text-[10px] text-blue-500 font-medium tracking-tight">Badges & Stats</span>
                      </div>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuItem 
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="flex items-center space-x-4 p-4 rounded-2xl focus:bg-brand-50 dark:focus:bg-brand-900/40 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600">
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black uppercase text-xs tracking-tight">Appearance</span>
                    <span className="text-[10px] text-amber-500 font-medium tracking-tight">Switch to {theme === 'light' ? 'Dark' : 'Light'}</span>
                  </div>
                </DropdownMenuItem>

                {/* Removed Staff Panel */}
                {!user ? (
                  <DropdownMenuItem 
                    onClick={() => setIsAuthOpen(true)}
                    className="flex items-center space-x-4 p-4 rounded-2xl focus:bg-brand-600 focus:text-white cursor-pointer mt-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black uppercase text-xs tracking-tight group-focus:text-white">Join Forester</span>
                      <span className="text-[10px] text-brand-200 font-medium tracking-tight group-focus:text-brand-100">Start your journey</span>
                    </div>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    onClick={logout}
                    className="flex items-center space-x-4 p-4 rounded-2xl focus:bg-rose-50 dark:focus:bg-rose-900/40 cursor-pointer mt-2 text-rose-500"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-500">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <span className="font-black uppercase text-xs tracking-tight">Sign Out</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-12 gap-6 p-6 relative z-10">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      <WildlifeAI 
        open={isAiOpen} 
        onOpenChange={setIsAiOpen} 
        showTrigger={false} 
      />

      {/* Image Annotator */}
      <AnimatePresence>
        {annotatingImage && (
          <ImageAnnotator 
            imageUrl={annotatingImage} 
            onClose={() => setAnnotatingImage(null)} 
          />
        )}
      </AnimatePresence>

      {/* Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4"
          >
            <div className="absolute top-6 right-6 z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 rounded-full w-12 h-12"
                onClick={() => setIsCameraOpen(false)}
              >
                <X className="w-8 h-8" />
              </Button>
            </div>
            
            <div className="relative w-full max-w-lg aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 bg-stone-900">
              {/* @ts-ignore */}
              <Webcam
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{
                  facingMode: "environment"
                }}
                onUserMediaError={() => toast.error("Camera access denied.")}
              >
                {/* @ts-ignore */}
                {({ getScreenshot }: { getScreenshot: () => string | null }) => (
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                    <Button
                      size="lg"
                      className="w-20 h-20 rounded-full bg-white hover:bg-white/90 border-8 border-white/20 flex items-center justify-center p-0 transition-transform active:scale-90"
                      onClick={() => {
                        const imageSrc = getScreenshot();
                        if (imageSrc) handleCapturedPhoto(imageSrc);
                      }}
                    />
                  </div>
                )}
              </Webcam>
            </div>
            <p className="text-white/60 text-xs mt-8 uppercase tracking-[0.3em] font-black text-center">
              Spot the wildlife • Capture the moment
            </p>
          </motion.div>
        )}
      </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PostCardProps {
  key?: string;
  post: Post;
  user: UserProfile | null;
  onAnnotate?: (url: string) => void;
  onViewProfile?: (userId: string) => void;
}

function PostCard({ post, user, onAnnotate, onViewProfile }: PostCardProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    if (!showComments) return;
    const q = query(
      collection(db, 'posts', post.id, 'comments'), 
      orderBy('createdAt', 'asc'), // Ascending to read like a conversation
      limit(50)
    );
    return onSnapshot(q, (s) => {
      setComments(s.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `posts/${post.id}/comments`));
  }, [showComments, post.id]);

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like!');
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: increment(1)
      });
      // Also increment total weight for the creator
      await updateDoc(doc(db, 'users', post.userId), {
        totalLikes: increment(1),
        xp: increment(5) // Bonus XP for receiving a like
      });
      toast.success('Heart added!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'posts');
    } finally {
      setIsLiking(false);
    }
  };

  const submitComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to make an observation!');
      return;
    }
    const form = e.currentTarget;
    const formData = new FormData(form);
    const text = formData.get('comment') as string;
    
    if (!text.trim()) return;

    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        postId: post.id,
        userId: user.uid,
        userName: user.displayName,
        text: text.trim(),
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: increment(1)
      });
      form.reset();
      toast.success('Observation recorded!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${post.id}/comments`);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass text-card-foreground rounded-[40px] shadow-xl border-4 border-white/20 dark:border-white/5 overflow-hidden mb-12"
    >
      <div className="aspect-[4/3] relative overflow-hidden group">
        <img 
          src={post.url} 
          alt={post.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-pointer" 
          onClick={() => {
            toast.info('Opening editor...');
            onAnnotate?.(post.url);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-8 text-white w-full">
          <div className="flex justify-between items-end">
            <div className="flex-1">
              <h2 className="text-4xl font-black italic mb-2 leading-tight drop-shadow-xl">{post.title}</h2>
              <div className="flex items-center space-x-3 opacity-90 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => onViewProfile?.(post.userId)}>
                <Avatar className="w-8 h-8 border-2 border-brand-500">
                  <AvatarFallback className="text-black bg-white font-bold">{post.userName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-widest">{post.userName}</span>
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">
                    {post.createdAt?.toDate().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Side Actions */}
        <div className="hidden md:flex absolute top-6 right-6 flex-col items-center space-y-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
            onClick={() => {
              toast.info('Opening editor...');
              onAnnotate?.(post.url);
            }}
            className="bg-white/90 dark:bg-stone-900/90 backdrop-blur p-4 rounded-full shadow-2xl text-brand-600 hover:scale-110 transition-transform active:scale-90"
            title="Annotate & Mark"
          >
            <MousePointer2 className="w-6 h-6" />
          </button>
          <button 
            onClick={handleLike}
            disabled={isLiking}
            className="group/btn bg-white/90 dark:bg-stone-900/90 backdrop-blur p-5 rounded-full shadow-2xl text-rose-500 hover:scale-110 transition-transform active:scale-90 disabled:opacity-50"
          >
            <Heart className={`w-8 h-8 ${isLiking ? 'animate-ping' : ''} fill-current`} />
          </button>
          <span className="text-white font-black text-2xl drop-shadow-2xl bg-black/40 px-3 py-1 rounded-full">{post.likes}</span>
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: post.title, text: post.description, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard!');
              }
            }}
            className="bg-white/90 dark:bg-stone-900/90 backdrop-blur p-4 rounded-full shadow-2xl text-blue-500 hover:scale-110 transition-transform active:scale-90"
            title="Share"
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu Action */}
        <div className="md:hidden absolute top-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button className="bg-white/90 dark:bg-stone-900/90 backdrop-blur p-3 rounded-full shadow-2xl text-stone-900 dark:text-white active:scale-90 transition-transform">
                <MoreVertical className="w-6 h-6" />
              </button>
            } />
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-[2rem] bg-white/95 dark:bg-stone-950/95 backdrop-blur border-2 border-brand-100 dark:border-brand-900/50 shadow-2xl">
              <DropdownMenuItem 
                onClick={() => {
                  toast.info('Opening editor...');
                  onAnnotate?.(post.url);
                }}
                className="flex items-center space-x-3 p-4 rounded-2xl focus:bg-brand-50 dark:focus:bg-brand-900/40 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-600">
                  <MousePointer2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight">Annotate</span>
                  <span className="text-[10px] text-stone-500 font-medium">Mark findings</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={handleLike}
                className="flex items-center space-x-3 p-4 rounded-2xl focus:bg-rose-50 dark:focus:bg-rose-900/40 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-500">
                  <Heart className={`w-5 h-5 ${isLiking ? 'animate-pulse text-amber-500' : ''}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight">Like</span>
                  <span className="text-[10px] text-stone-500 font-medium">{post.likes} Hearts</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: post.title, text: post.description, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied!');
                  }
                }}
                className="flex items-center space-x-3 p-4 rounded-2xl focus:bg-blue-50 dark:focus:bg-blue-900/40 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-500">
                  <Share2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight">Share</span>
                  <span className="text-[10px] text-stone-500 font-medium">Spread the beauty</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-6">
          <p className="text-xl font-medium text-stone-800 dark:text-stone-200 leading-relaxed italic border-l-4 border-brand-500 pl-6 mb-4">
            "{post.description}"
          </p>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-sm hover:bg-brand-100 transition-colors cursor-default">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-brand-100 dark:border-stone-800 pt-8 mt-2">
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-3 text-brand-700 dark:text-brand-400 font-black uppercase text-xs tracking-[0.2em] hover:text-brand-900 dark:hover:text-brand-200 transition-colors py-2 px-4 rounded-full bg-brand-50 dark:bg-brand-900/20"
          >
            <MessageSquare className="w-5 h-5" />
            <span>{post.commentCount} Observations</span>
          </button>
          
          <div className="flex space-x-1">
            {[1,2,3,4,5].map(i => (
              <span key={i} className="text-lg text-accent-500 drop-shadow-sm">★</span>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-8 pt-8 border-t-2 border-brand-50 dark:border-stone-800/50 space-y-6 overflow-hidden"
            >
              {comments.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-brand-200">
                  {comments.map(c => (
                    <motion.div 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      key={c.id} 
                      className="flex space-x-4 group"
                    >
                      <Avatar className="w-10 h-10 border-2 border-brand-100 dark:border-stone-700">
                        <AvatarFallback className="bg-stone-100 dark:bg-stone-800 font-bold">{c.userName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="bg-stone-100/50 dark:bg-stone-900/50 backdrop-blur-sm rounded-3xl rounded-tl-none p-5 flex-1 relative cursor-pointer" onClick={() => onViewProfile?.(c.userId)}>
                        <p className="text-[10px] font-black text-brand-700 dark:text-brand-400 uppercase tracking-widest mb-1.5 italic">
                          {c.userName}
                        </p>
                        <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                          {c.text}
                        </p>
                        <div className="absolute -left-2 top-0 w-4 h-4 bg-stone-100/50 dark:bg-stone-900/50 rounded-bl-[100%] shadow-[-2px_2px_0_white] dark:shadow-[-2px_2px_0_#0c0a09]" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-stone-50 dark:bg-stone-900/30 rounded-3xl border-2 border-dashed border-stone-200 dark:border-stone-800">
                  <p className="text-sm font-medium text-stone-500 italic">No professional observations yet. Capture the moment!</p>
                </div>
              )}
              
              <form onSubmit={submitComment} className="flex space-x-3 items-end">
                <div className="flex-1">
                  <Textarea 
                    name="comment" 
                    placeholder="Record your observation..." 
                    className="min-h-[80px] rounded-[2rem] bg-stone-50 dark:bg-stone-900/80 border-2 border-stone-200 dark:border-stone-800 px-6 py-4 text-stone-900 dark:text-stone-100 focus:ring-brand-500 transition-all resize-none italic" 
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  className="rounded-2xl bg-brand-600 hover:bg-brand-700 w-14 h-14 shrink-0 shadow-lg active:scale-95 transition-transform"
                >
                  <Plus className="w-6 h-6" />
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ProfileView({ user, currentUser }: { user: UserProfile | null, currentUser: UserProfile | null }) {
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const isOwnProfile = user?.uid === currentUser?.uid;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'posts'), 
      where('userId', '==', user.uid), 
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (s) => {
      setMyPosts(s.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    });
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    const displayName = formData.get('displayName') as string;
    const photoURL = formData.get('photoURL') as string;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        photoURL
      });
      toast.success('Forest identity updated!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  if (!user) return <div className="col-span-12 py-20 text-center font-black italic text-brand-900 dark:text-brand-500">Please sign in to view your profile.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8"
    >
      <div className="md:col-span-1 space-y-6">
        <Card className="glass card-vibrant p-8 text-center overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-24 bg-brand-600/50" />
          <Avatar className="w-32 h-32 mx-auto border-4 border-white shadow-xl relative z-10">
            <AvatarImage src={user.photoURL} />
            <AvatarFallback className="text-4xl">{user.displayName[0]}</AvatarFallback>
          </Avatar>
          <div className="mt-4">
            <h2 className="text-2xl font-black italic text-brand-900 dark:text-brand-500">{user.displayName}</h2>
            <p className="text-stone-500 dark:text-stone-400 font-medium italic text-sm">{user.email}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-brand-50 dark:bg-brand-900/30 rounded-2xl p-4">
              <p className="text-2xl font-black text-brand-700 dark:text-brand-300">{user.postsCount}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">Posts</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-2xl p-4">
              <p className="text-2xl font-black text-accent-600 dark:text-accent-400">{user.badges.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-accent-600 dark:text-accent-400">Badges</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl p-4">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{user.xp || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">XP</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/30 rounded-2xl p-4">
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{user.totalLikes || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Likes</p>
            </div>
          </div>

          {isOwnProfile && (
            <Dialog>
              <DialogTrigger render={
                <Button variant="outline" className="w-full mt-6 rounded-xl font-bold border-border dark:border-stone-700 hover:bg-brand-50 dark:hover:bg-brand-900/50">
                  Customize Profile
                </Button>
              } />
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black italic text-brand-900 dark:text-brand-500">Your Forest Identity</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-brand-600">Display Name</label>
                    <Input name="displayName" defaultValue={user.displayName} required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-brand-600">Avatar URL</label>
                    <Input name="photoURL" defaultValue={user.photoURL} required className="rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full bg-brand-600 font-bold rounded-xl py-6">Save Changes</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </Card>

        <Card className="card-vibrant p-6">
          <h3 className="text-xs uppercase tracking-widest font-black text-brand-600 mb-6 flex items-center">
            <Award className="w-4 h-4 mr-2" />
            Badge Cabinet
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {FOREST_BADGES.map((badge) => (
              <div 
                key={badge.id}
                className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${user.badges.includes(badge.id) ? 'bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-200 dark:ring-amber-800' : 'bg-stone-50 dark:bg-stone-800 opacity-20'}`}
                title={badge.name}
              >
                {badge.icon}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="md:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black italic text-brand-900 dark:text-brand-500">{isOwnProfile ? 'Your Submissions' : `${user.displayName}'s Submissions`}</h3>
          <Badge variant="secondary" className="bg-brand-100 text-brand-700 font-black">{myPosts.length} Total</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myPosts.map(post => (
            <motion.div 
              key={post.id}
              layout
              className="bg-card text-card-foreground rounded-3xl overflow-hidden border-2 border-border shadow-sm group relative"
            >
              <img src={post.url} alt={post.title} className="w-full aspect-square object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center text-white">
                <p className="font-black italic text-lg mb-1">{post.title}</p>
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest">
                  <Badge className={`${post.status === 'approved' ? 'bg-emerald-500' : post.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                    {post.status}
                  </Badge>
                </div>
                <div className="mt-4 flex space-x-4 text-sm font-black">
                  <span className="flex items-center"><Heart className="w-4 h-4 mr-1" /> {post.likes}</span>
                  <span className="flex items-center"><MessageSquare className="w-4 h-4 mr-1" /> {post.commentCount}</span>
                </div>
              </div>
            </motion.div>
          ))}
          {myPosts.length === 0 && (
            <div className="col-span-full py-20 glass text-card-foreground rounded-[2.5rem] border-2 border-dashed border-border text-center">
              <Camera className="w-12 h-12 text-brand-200 dark:text-brand-800 mx-auto mb-4" />
              <p className="text-stone-400 dark:text-stone-500 font-medium italic">No submissions found.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ProfileCard({ user, onAction }: { user: UserProfile | null, onAction: () => void }) {
  if (!user) return null;
  return (
    <Card className="glass card-vibrant p-5 overflow-hidden relative group cursor-pointer" onClick={onAction}>
      <div className="absolute top-0 left-0 w-full h-1 bg-brand-500" />
      <div className="flex items-center space-x-4">
        <Avatar className="w-12 h-12 border-2 border-brand-100">
          <AvatarImage src={user.photoURL} />
          <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <h3 className="font-black italic text-brand-900 dark:text-brand-100 truncate">{user.displayName}</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{user.xp} XP • {user.postsCount} Posts</p>
        </div>
      </div>
    </Card>
  );
}

function LeaderboardSmall({ users, onUserClick }: { users: UserProfile[], onUserClick: (uid: string) => void }) {
  return (
    <Card className="glass card-vibrant p-5">
      <h3 className="text-xs uppercase tracking-widest font-black text-brand-600 mb-4 flex items-center">
        <Trophy className="w-4 h-4 mr-2" />
        Top Explorers
      </h3>
      <div className="space-y-3">
        {users.slice(0, 5).map((u, i) => (
          <div 
            key={u.uid} 
            className="flex items-center space-x-3 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/20 p-1 rounded-lg transition-colors"
            onClick={() => onUserClick(u.uid)}
          >
            <span className="text-[10px] font-black italic text-stone-300 w-4">0{i+1}</span>
            <Avatar className="w-7 h-7 border border-brand-100">
              <AvatarImage src={u.photoURL} />
              <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-[11px] font-bold truncate flex-1">{u.displayName}</span>
            <span className="text-[10px] font-black text-brand-600">{u.xp}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LeaderboardFull({ users, onViewProfile }: { users: UserProfile[], onViewProfile: (uid: string) => void }) {
  return (
    <div className="col-span-12 space-y-10 py-10">
      <div className="text-center">
        <h2 className="text-5xl font-black italic text-brand-900 dark:text-brand-500 tracking-tighter mb-4">Hall of Guardians</h2>
        <p className="text-stone-500 font-medium max-w-lg mx-auto">The most dedicated explorers and protectors of our shared wild spaces.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {users.slice(0, 3).map((u, i) => (
          <motion.div
            key={u.uid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass p-10 rounded-[3rem] text-center border-4 relative overflow-hidden cursor-pointer ${i === 0 ? 'border-amber-400 scale-110 shadow-amber-200/20' : 'border-stone-100'}`}
            onClick={() => onViewProfile(u.uid)}
          >
            {i === 0 && <div className="absolute top-0 left-0 w-full h-2 bg-amber-400 animate-pulse" />}
            <div className="text-4xl mb-4">{i === 0 ? '👑' : i === 1 ? '🥈' : '🥉'}</div>
            <Avatar className="w-24 h-24 mx-auto mb-6 border-4 border-white shadow-xl">
              <AvatarImage src={u.photoURL} />
              <AvatarFallback className="text-3xl">{u.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <h3 className="text-2xl font-black italic text-brand-900 dark:text-brand-100 mb-2">{u.displayName}</h3>
            <p className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-4">{u.postsCount} Approved Snaps</p>
            <div className="bg-brand-500 text-white font-black italic px-6 py-2 rounded-full inline-block shadow-lg">
              {u.xp} XP
            </div>
          </motion.div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto glass rounded-[2.5rem] overflow-hidden border-2 border-border/50">
        <Table>
          <TableHeader className="bg-brand-50/50">
            <TableRow>
              <TableHead className="w-20 font-black uppercase tracking-widest text-[10px]">Rank</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px]">Guardian</TableHead>
              <TableHead className="text-right font-black uppercase tracking-widest text-[10px]">Experience</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.slice(3).map((u, i) => (
              <TableRow key={u.uid} className="cursor-pointer hover:bg-brand-50 transition-colors" onClick={() => onViewProfile(u.uid)}>
                <TableCell className="font-black italic text-stone-300">#{i + 4}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.photoURL} />
                      <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-bold">{u.displayName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-black italic text-brand-600">{u.xp} XP</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CommunityChat() { return null; }
function RecentActivity() { return null; }
function AdminPanel() { return null; }
