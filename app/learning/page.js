"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Users, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { AuthDialog } from "@/components/auth-dialog";
import { format } from "date-fns";

const translations = {
  sl: {
    title: "Skupinsko učenje",
    subtitle: "Pridružite se učnim uram in se pripravite na izpit skupaj",
    calendar: "Koledar",
    sessions: "Učne ure",
    join: "Pridruži se",
    leave: "Zapusti",
    participants: "Udeleženci",
    sessionFull: "Polno",
    availableSpots: "prostih mest",
    loginRequired: "Prijava potrebna",
    yourNote: "Tvoja opomba (npr. kaj se učiš)",
    addNote: "Dodaj opombo",
    updateNote: "Posodobi",
    loading: "Nalaganje...",
    noSessions: "Za ta dan ni razpisanih učnih ur.",
    createSession: "Predlagaj termin",
    authTitle: "Prijava / Registracija",
    authDescription: "Prijavite se za sodelovanje pri učenju",
    email: "E-pošta",
    username: "Uporabniško ime",
    password: "Geslo",
    login: "Prijava",
    register: "Registracija",
    orContinueEmail: "Ali nadaljujte z e-pošto",
    googleLoginFailed: "Prijava z Google ni uspela",
    loginFailed: "Prijava ni uspela",
    registrationFailed: "Registracija ni uspela",
  },
  en: {
    title: "Group Learning",
    subtitle: "Join study sessions and prepare for exams together",
    calendar: "Calendar",
    sessions: "Study Sessions",
    join: "Join",
    leave: "Leave",
    participants: "Participants",
    sessionFull: "Full",
    availableSpots: "spots left",
    loginRequired: "Login required",
    yourNote: "Your note (e.g. what you're studying)",
    addNote: "Add note",
    updateNote: "Update",
    loading: "Loading...",
    noSessions: "No sessions scheduled for this day.",
    createSession: "Suggest a time",
    authTitle: "Login / Register",
    authDescription: "Login to join study sessions",
    email: "Email",
    username: "Username",
    password: "Password",
    login: "Login",
    register: "Register",
    orContinueEmail: "Or continue with email",
    googleLoginFailed: "Google login failed",
    loginFailed: "Login failed",
    registrationFailed: "Registration failed",
  },
};

export default function LearningPage() {
  const { lang } = useSettings();
  const { user, isAuthenticated, getAuthHeaders } = useAuth();
  const t = translations[lang];

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (selectedDate) {
      fetchSessions(selectedDate);
    }
  }, [selectedDate]);

  const fetchSessions = async (date) => {
    setLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const res = await fetch(`/api/learning/sessions?date=${formattedDate}`);
      
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else {
        console.error("Failed to fetch sessions");
        setSessions([]);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setSessions([]);
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
      const res = await fetch("/api/learning/sessions/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ session_id: sessionId, note: noteText }),
      });

      if (res.ok) {
        fetchSessions(selectedDate);
        setNoteText("");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to join session");
      }
    } catch (error) {
      console.error("Error joining session:", error);
    }
  };

  const handleLeaveSession = async (sessionId) => {
    try {
      const res = await fetch("/api/learning/sessions/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (res.ok) {
        fetchSessions(selectedDate);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to leave session");
      }
    } catch (error) {
      console.error("Error leaving session:", error);
    }
  };

  const handleUpdateNote = async (sessionId) => {
    try {
      const res = await fetch("/api/learning/sessions/note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ session_id: sessionId, note: noteText }),
      });

      if (res.ok) {
        setEditingNote(null);
        fetchSessions(selectedDate);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update note");
      }
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  const isUserInSession = (session) => {
    if (!user) return false;
    return session.participants.some(p => p.username === user.username);
  };

  const getUserNote = (session) => {
    if (!user) return "";
    const participant = session.participants.find(p => p.username === user.username);
    return participant ? participant.note : "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Sidebar */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {t.calendar}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
              />
            </CardContent>
          </Card>

          {/* Sessions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">
              {format(selectedDate, "EEEE, dd MMMM yyyy")}
            </h2>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                {t.loading}
              </div>
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
                            <div className="text-3xl font-bold text-primary">
                              {session.time}
                            </div>
                            <div>
                              <Badge
                                variant={
                                  session.isFull ? "secondary" : "default"
                                }
                              >
                                {session.isFull
                                  ? t.sessionFull
                                  : `${session.availableSpots} ${t.availableSpots}`}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            {!isAuthenticated ? (
                              <Button
                                size="sm"
                                onClick={() => setAuthDialogOpen(true)}
                              >
                                <LogIn className="h-4 w-4 mr-2" />
                                {t.loginRequired}
                              </Button>
                            ) : userInSession ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLeaveSession(session.id)}
                              >
                                {t.leave}
                              </Button>
                            ) : session.isFull ? (
                              <Button size="sm" disabled>
                                {t.sessionFull}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleJoinSession(session.id)}
                              >
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
                                    <span className="font-medium">
                                      {participant.username}
                                    </span>
                                    {participant.note && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {participant.note}
                                      </p>
                                    )}
                                  </div>
                                  {participant.username === user?.username && (
                                    <div className="flex items-center gap-2">
                                      {editingNote === session.id ? (
                                        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                                          <Input
                                            type="text"
                                            value={noteText}
                                            onChange={(e) =>
                                              setNoteText(e.target.value)
                                            }
                                            placeholder={t.yourNote}
                                            className="flex-1 sm:w-48"
                                          />
                                          <Button
                                            size="sm"
                                            onClick={() =>
                                              handleUpdateNote(session.id)
                                            }
                                          >
                                            {t.updateNote}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingNote(null)}
                                          >
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