'use client';

// Google Login Component

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export function AuthDialog({ open, onOpenChange, translations }) {
  const { login, register, loginWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(loginEmail, loginPassword);
    
    if (result.success) {
      onOpenChange(false);
      setLoginEmail('');
      setLoginPassword('');
    } else {
      setError(result.error || 'Login failed');
    }
    
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(regEmail, regUsername, regPassword);
    
    if (result.success) {
      onOpenChange(false);
      setRegEmail('');
      setRegUsername('');
      setRegPassword('');
    } else {
      setError(result.error || 'Registration failed');
    }
    
    setLoading(false);
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setLoading(true);
    setError('');
    
    if (credentialResponse.credential) {
      const result = await loginWithGoogle(credentialResponse.credential);
      
      if (result.success) {
        onOpenChange(false);
      } else {
        setError(result.error || 'Google login failed');
      }
    } else {
      setError('Google login failed');
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translations.authTitle}</DialogTitle>
          <DialogDescription>{translations.authDescription}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{translations.login}</TabsTrigger>
            <TabsTrigger value="register">{translations.register}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <div className="flex justify-center mb-4">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => setError('Google login failed')}
                theme="filled_blue"
                shape="pill"
                width="100%"
              />
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">{translations.email}</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="vas@email.si"
                  required
                />
              </div>
              <div>
                <Label htmlFor="login-password">{translations.password}</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {translations.login}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <div className="flex justify-center mb-4">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => setError('Google login failed')}
                theme="filled_blue"
                shape="pill"
                width="100%"
              />
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="reg-email">{translations.email}</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="vas@email.si"
                  required
                />
              </div>
              <div>
                <Label htmlFor="reg-username">{translations.username}</Label>
                <Input
                  id="reg-username"
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder={translations.username}
                  required
                />
              </div>
              <div>
                <Label htmlFor="reg-password">{translations.password}</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {translations.register}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}