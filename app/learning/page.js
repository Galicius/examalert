'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Globe, Calendar as CalendarIcon, Users, LogIn, LogOut, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { AuthDialog } from '@/components/auth-dialog';
import { format } from 'date-fns';

const translations = {
  sl: {
    title: 'Skupno učenje',
    subtitle: 'Pridruži se drugim in se učite skupaj za izpit',
    selectDate: 'Izberi datum',
    availableSpots: 'Prosta mesta',
    participants: 'Udeleženci',
    join: 'Pridruži se',
    leave: 'Zapusti',
    addNote: 'Dodaj opombo',
    updateNote: 'Posodobi opombo',
    yourNote: 'Tvoja opomba (opcijsko)',
    sessionFull: 'Polno',
    loginRequired: 'Prijava potrebna',
    backToHome: 'Nazaj na domačo stran',
    login: 'Prijava',
    register: 'Registracija',
    logout: 'Odjava',
    authTitle: 'Prijava / Registracija',
    authDescription: 'Prijavite se ali se registrirajte za dostop do vseh funkcij',
    email: 'E-pošta',
    username: 'Uporabniško ime',
    password: 'Geslo',
  },
  en: {
    title: 'Group Learning',
    subtitle: 'Join others and study together for the exam',
    selectDate: 'Select date',
    availableSpots: 'Available spots',
    participants: 'Participants',
    join: 'Join',
    leave: 'Leave',
    addNote: 'Add note',
    updateNote: 'Update note',
    yourNote: 'Your note (optional)',
    sessionFull: 'Full',
    loginRequired: 'Login required',
    backToHome: 'Back to home',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    authTitle: 'Login / Register',
    authDescription: 'Login or register to access all features',
    email: 'Email',
    username: 'Username',
    password: 'Password',
  }
};

export default function LearningPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState('sl');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');

  const { user, isAuthenticated, logout, getAuthHeaders } = useAuth();
  const t = translations[lang];

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    fetchSessions();
  }, [selectedDate]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/learning/sessions?date=${dateStr}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (sessionId) => {
    if (!isAuthenticated) {
      setAuthDialogOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/learning/sessions/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ session_id: sessionId, note: '' })
      });

      if (res.ok) {
        fetchSessions();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to join session');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      alert('Failed to join session');
    }
  };

  const handleLeaveSession = async (sessionId) => {
    try {
      const res = await fetch('/api/learning/sessions/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ session_id: sessionId })
      });

      if (res.ok) {
        fetchSessions();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to leave session');
      }
    } catch (error) {
      console.error('Error leaving session:', error);
      alert('Failed to leave session');
    }
  };

  const handleUpdateNote = async (sessionId) => {
    try {
      const res = await fetch('/api/learning/sessions/note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ session_id: sessionId, note: noteText })
      });

      if (res.ok) {
        setEditingNote(null);
        setNoteText('');
        fetchSessions();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note');
    }
  };

  const isUserInSession = (session) => {
    return session.participants?.some(p => p.username === user?.username);
  };

  const getUserNote = (session) => {
    const participant = session.participants?.find(p => p.username === user?.username);
    return participant?.note || '';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{t.title}</h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  {t.backToHome}
                </Button>
              </Link>
              {isAuthenticated ? (
                <>
                  <Badge variant="secondary" className="px-3 py-1.5">
                    {user?.username}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t.logout}
                  </Button>
                </>
              ) : (
                <Button variant="default" size="sm" onClick={() => setAuthDialogOpen(true)}>
                  <LogIn className="h-4 w-4 mr-2" />
                  {t.login}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setLang(lang === 'sl' ? 'en' : 'sl')}>
                <Globe className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">{t.selectDate}</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </CardContent>
          </Card>

          {/* Sessions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">
              {format(selectedDate, 'EEEE, dd MMMM yyyy')}
            </h2>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => {
                  const userInSession = isUserInSession(session);
                  const userNote = getUserNote(session);

                  return (
                    <Card key={session.id}>
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl font-bold text-primary">{session.time}</div>
                            <div>
                              <Badge variant={session.isFull ? 'secondary' : 'default'}>
                                {session.isFull ? t.sessionFull : `${session.availableSpots} ${t.availableSpots}`}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            {!isAuthenticated ? (
                              <Button size="sm" onClick={() => setAuthDialogOpen(true)}>
                                <LogIn className="h-4 w-4 mr-2" />
                                {t.loginRequired}
                              </Button>
                            ) : userInSession ? (
                              <Button size="sm" variant="outline" onClick={() => handleLeaveSession(session.id)}>
                                {t.leave}
                              </Button>
                            ) : session.isFull ? (
                              <Button size="sm" disabled>
                                {t.sessionFull}
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => handleJoinSession(session.id)}>
                                {t.join}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {session.participants.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {t.participants} ({session.participants.length}/5)
                            </h4>
                            <div className="space-y-2">
                              {session.participants.map((participant) => (
                                <div 
                                  key={participant.id} 
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded bg-accent/50"
                                >
                                  <div className="flex-1">
                                    <span className="font-medium">{participant.username}</span>
                                    {participant.note && (
                                      <p className="text-sm text-muted-foreground mt-1">{participant.note}</p>
                                    )}
                                  </div>
                                  {participant.username === user?.username && (
                                    <div className="flex items-center gap-2">
                                      {editingNote === session.id ? (
                                        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                                          <Input
                                            type="text"
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            placeholder={t.yourNote}
                                            className="flex-1 sm:w-48"
                                          />
                                          <Button size="sm" onClick={() => handleUpdateNote(session.id)}>
                                            {t.updateNote}
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => setEditingNote(null)}>
                                            ✕
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingNote(session.id);
                                            setNoteText(userNote);
                                          }}
                                        >
                                          {userNote ? t.updateNote : t.addNote}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {t.participants}: 0/5
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <AuthDialog 
        open={authDialogOpen} 
        onOpenChange={setAuthDialogOpen} 
        translations={t}
      />
    </div>
  );
}