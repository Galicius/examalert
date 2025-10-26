"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Mail, User, Lock, Trash2, Bell, Filter, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ProfilePage() {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Edit form states
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/");
    } else if (isAuthenticated) {
      fetchProfile();
    }
  }, [loading, isAuthenticated, router]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setSubscriptions(data.subscriptions);
        setUsername(data.user.username || "");
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Error loading profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setUpdating(true);

    try {
      const token = localStorage.getItem("auth_token");
      const body = { username };

      if (newPassword) {
        body.current_password = currentPassword;
        body.new_password = newPassword;
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Profile updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        fetchProfile();
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success("Account deleted successfully");
        logout();
        router.push("/");
      } else {
        toast.error("Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Error deleting account");
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const getRegionName = (obmocje) => {
    const regions = {
      1: "Primorska/Goriška",
      2: "Osrednjeslovenska/Gorenjska",
      3: "Celjska/Koroška",
      4: "Dolenjska/BelaKrajina",
      5: "Štajerska/Prekmurje",
    };
    return regions[obmocje] || `Območje ${obmocje}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Slots
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{profile.email}</p>
                    {profile.email_confirmed && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Username</Label>
                  <p className="font-medium mt-1">
                    {profile.username || "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Member Since</Label>
                  <p className="font-medium mt-1">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications Received
                  </Label>
                  <p className="font-medium mt-1 text-2xl">
                    {profile.notification_count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">Change Password</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="current-password">
                        Current Password (OTP if not changed)
                      </Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={updating}
                  className="w-full"
                  data-testid="update-profile-btn"
                >
                  {updating ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Subscriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Active Subscriptions ({subscriptions.filter((s) => s.active).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.filter((s) => s.active).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No active subscriptions
                </p>
              ) : (
                <div className="space-y-3">
                  {subscriptions
                    .filter((s) => s.active)
                    .map((sub) => (
                      <div
                        key={sub.id}
                        className="border rounded-lg p-4 space-y-2"
                        data-testid={`subscription-${sub.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">
                            Subscription #{sub.id}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Created: {new Date(sub.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {sub.filter_obmocje && (
                            <p>• Region: {getRegionName(sub.filter_obmocje)}</p>
                          )}
                          {sub.filter_town && <p>• Town: {sub.filter_town}</p>}
                          {sub.filter_exam_type && (
                            <p>
                              • Exam Type:{" "}
                              {sub.filter_exam_type === "voznja"
                                ? "Driving"
                                : "Theory"}
                            </p>
                          )}
                          {sub.filter_tolmac && <p>• With Translator</p>}
                          {sub.filter_categories && (
                            <p>• Categories: {sub.filter_categories}</p>
                          )}
                          {!sub.filter_obmocje &&
                            !sub.filter_town &&
                            !sub.filter_exam_type &&
                            !sub.filter_categories && (
                              <p className="text-muted-foreground">
                                No specific filters (all slots)
                              </p>
                            )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delete Account */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Deleting your account will permanently remove all your data,
                including subscriptions and preferences. This action cannot be
                undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    data-testid="delete-account-btn"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and remove all
                      your data from our servers. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
