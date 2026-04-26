import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loginWithGoogle, loginWithEmail, signUpWithEmail } from '@/src/lib/firebase';
import { Loader2, Mail, Lock, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
  children?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AuthModal({ children, isOpen, onOpenChange }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Welcome to Forester!');
      onOpenChange?.(false);
    } catch (error) {
      toast.error('Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      toast.success('Welcome back!');
      onOpenChange?.(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName) {
      toast.error('Please enter a display name');
      return;
    }
    setIsLoading(true);
    try {
      await signUpWithEmail(email, password, displayName);
      toast.success('Account created! Please check your email to verify your account.');
      onOpenChange?.(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {children && <DialogTrigger render={children as React.ReactElement} />}
      <DialogContent className="sm:max-w-md rounded-3xl p-8 glass border-none">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black italic text-brand-900 dark:text-brand-500 text-center">
            Join the Forest
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl mb-8 bg-brand-50 dark:bg-stone-900/50">
            <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-stone-800">Login</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-stone-800">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <Input 
                    type="email" 
                    placeholder="nature@example.com" 
                    className="pl-10 rounded-xl bg-white/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 focus:ring-brand-500 focus:border-brand-500" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 rounded-xl bg-white/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 focus:ring-brand-500 focus:border-brand-500" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl py-6" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 ml-1">Display Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <Input 
                    placeholder="Oak Ranger" 
                    className="pl-10 rounded-xl bg-white/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 focus:ring-brand-500 focus:border-brand-500" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <Input 
                    type="email" 
                    placeholder="nature@example.com" 
                    className="pl-10 rounded-xl bg-white/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 focus:ring-brand-500 focus:border-brand-500" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700 dark:text-stone-300 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 rounded-xl bg-white/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 focus:ring-brand-500 focus:border-brand-500" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl py-6" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-stone-200 dark:border-stone-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-stone-500">Or continue with</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full rounded-xl py-6 border-2 border-stone-200 dark:border-stone-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all active:scale-95"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>
      </DialogContent>
    </Dialog>
  );
}
