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
  const [view, setView] = useState('default'); // 'default' or 'forgot-password'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Forgot Password form
  const [forgotEmail, setForgotEmail] = useState('');

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
      setError(result.error || translations.loginFailed);
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
      setError(result.error || translations.registrationFailed);
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
        setError(result.error || translations.googleLoginFailed);
      }
    } else {
      setError(translations.googleLoginFailed);
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(data.message || 'Reset link sent if account exists.');
      } else {
        setError(data.error || 'Failed to send reset link.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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
            {view === 'forgot-password' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium">Reset Password</h3>
                  <p className="text-sm text-muted-foreground">Enter your email to receive a reset link.</p>
                </div>

                {successMessage ? (
                  <div className="text-center space-y-4">
                    <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
                      {successMessage}
                    </div>
                    <Button variant="outline" onClick={() => setView('default')} className="w-full">
                      Back to Login
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="forgot-email">{translations.email}</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="vas@email.si"
                        required
                      />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send Reset Link
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setView('default')}>
                      Cancel
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <GoogleLogin
                    onSuccess={handleGoogleLogin}
                    onError={() => setError(translations.googleLoginFailed)}
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
                    <span className="bg-background px-2 text-muted-foreground">{translations.orContinueEmail}</span>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">{translations.password}</Label>
                      <button
                        type="button"
                        onClick={() => setView('forgot-password')}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
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
              </>
            )}
          </TabsContent>

          <TabsContent value="register">
            <div className="flex justify-center mb-4">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => setError(translations.googleLoginFailed)}
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
                <span className="bg-background px-2 text-muted-foreground">{translations.orContinueEmail}</span>
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