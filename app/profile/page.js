"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, User, Lock, Bell } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";
import { OBMOCJE_MAP, REGION_NAMES } from "@/lib/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const translations = {
  sl: {
    myProfile: "Moj profil",
    signOut: "Odjava",
    accountSettings: "Nastavitve računa",
    accountSettingsDesc: "Posodobite uporabniško ime in geslo",
    email: "E-pošta",
    username: "Uporabniško ime",
    changePassword: "Spremeni geslo",
    newPassword: "Novo geslo",
    leaveEmpty: "Pustite prazno, če ne želite spremeniti",
    confirmPassword: "Potrdi geslo",
    confirmNewPassword: "Potrdi novo geslo",
    saveChanges: "Shrani spremembe",
    activeSubscriptions: "Aktivna obvestila",
    activeSubscriptionsDesc: "Vaši aktivni filtri za obvestila",
    noSubscriptions: "Ni aktivnih obvestil.",
    type: "Tip:",
    categories: "Kategorije:",
    town: "Mesto:",
    region: "Območje:",
    created: "Ustvarjeno:",
    passwordsDoNotMatch: "Gesli se ne ujemata",
    profileUpdated: "Profil uspešno posodobljen",
    failedToLoad: "Napaka pri nalaganju profila",
    failedToUpdate: "Napaka pri posodabljanju profila",
    error: "Prišlo je do napake",
    driving: "Vožnja",
    theory: "Teorija",
    driving: "Vožnja",
    theory: "Teorija",
    delete: "Izbriši",
    deleteSubscription: "Izbriši obvestilo",
    deleteSubscriptionDesc: "Ali ste prepričani, da želite izbrisati to obvestilo? Tega dejanja ni mogoče razveljaviti.",
    subscriptionDeleted: "Obvestilo izbrisano",
    cancel: "Prekliči",
  },
  en: {
    myProfile: "My Profile",
    signOut: "Sign Out",
    accountSettings: "Account Settings",
    accountSettingsDesc: "Update your username and password",
    email: "Email",
    username: "Username",
    changePassword: "Change Password",
    newPassword: "New Password",
    leaveEmpty: "Leave empty to keep current",
    confirmPassword: "Confirm Password",
    confirmNewPassword: "Confirm new password",
    saveChanges: "Save Changes",
    activeSubscriptions: "Active Subscriptions",
    activeSubscriptionsDesc: "Your active notification filters",
    noSubscriptions: "No active subscriptions found.",
    type: "Type:",
    categories: "Categories:",
    town: "Town:",
    region: "Region:",
    created: "Created:",
    passwordsDoNotMatch: "Passwords do not match",
    profileUpdated: "Profile updated successfully",
    failedToLoad: "Failed to load profile",
    failedToUpdate: "Failed to update profile",
    error: "An error occurred",
    driving: "Driving",
    theory: "Theory",
    driving: "Driving",
    theory: "Theory",
    delete: "Delete",
    deleteSubscription: "Delete Subscription",
    deleteSubscriptionDesc: "Are you sure you want to delete this subscription? This action cannot be undone.",
    subscriptionDeleted: "Subscription deleted",
    cancel: "Cancel",
  },
};

export default function ProfilePage() {
  const { user, loading: authLoading, getAuthHeaders, logout } = useAuth();
  const { lang } = useSettings();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const t = translations[lang];

  // Form states
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile", {
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setUsername(data.user.username);
      } else {
        toast.error(t.failedToLoad);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (newPassword && newPassword !== confirmPassword) {
      toast.error(t.passwordsDoNotMatch);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          username,
          new_password: newPassword || undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(t.profileUpdated);
        setNewPassword("");
        setConfirmPassword("");
        fetchProfile(); // Refresh data
      } else {
        toast.error(data.error || t.failedToUpdate);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubscription = async (id) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });

      if (res.ok) {
        toast.success(t.subscriptionDeleted);
        fetchProfile(); // Refresh list
      } else {
        toast.error(t.error);
      }
    } catch (error) {
      console.error("Error deleting subscription:", error);
      toast.error(t.error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t.myProfile}</h1>
        <Button variant="outline" onClick={() => {
          logout();
          router.push("/");
        }}>
          {t.signOut}
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t.accountSettings}
            </CardTitle>
            <CardDescription>
              {t.accountSettingsDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input value={profile.user.email} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>{t.username}</Label>
                <Input 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.username}
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  {t.changePassword}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t.newPassword}</Label>
                    <Input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.leaveEmpty}
                    />
                  </div>
                  {newPassword && (
                    <div className="space-y-2">
                      <Label>{t.confirmPassword}</Label>
                      <Input 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t.confirmNewPassword}
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t.saveChanges}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t.activeSubscriptions}
            </CardTitle>
            <CardDescription>
              {t.activeSubscriptionsDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.subscriptions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t.noSubscriptions}
              </p>
            ) : (
              <div className="space-y-4">
                {profile.subscriptions.map((sub) => (
                  <div key={sub.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm relative group">
                    <div className="space-y-1 text-sm pt-6">
                      {sub.filter_exam_type && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.type}</span>
                          <span className="font-medium capitalize">
                            {sub.filter_exam_type === "voznja" ? t.driving : t.theory}
                          </span>
                        </div>
                      )}
                      {sub.filter_categories && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.categories}</span>
                          <span className="font-medium">{sub.filter_categories}</span>
                        </div>
                      )}
                      {sub.filter_town && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.town}</span>
                          <span className="font-medium">{sub.filter_town}</span>
                        </div>
                      )}
                      {sub.filter_obmocje && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.region}</span>
                          <span className="font-medium">
                            {REGION_NAMES[sub.filter_obmocje] || `${t.region} ${sub.filter_obmocje}`}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t mt-2">
                        <span className="text-xs text-muted-foreground">{t.created}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <span className="sr-only">{t.delete}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.deleteSubscription}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.deleteSubscriptionDesc}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSubscription(sub.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              {t.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
