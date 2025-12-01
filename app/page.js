"use client";
import Head from "next/head";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutGrid,
  List,
  AlignJustify,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/lib/settings";
import { HeroSubscription } from "@/components/HeroSubscription";
import { useAuth } from "@/lib/auth";
import { GoogleLogin } from "@react-oauth/google";
import { OBMOCJE_MAP, ADDRESS_MAP, CATEGORY_GROUPS } from "@/lib/constants";

const translations = {
  sl: {
    title: "Vozniski.si - Prosti termini",
    filterTitle: "Filtriraj termine",
    clearFilters: "Počisti filtre",
    examType: "Tip izpita",
    examTypeDriving: "Vožnja",
    examTypeTheory: "Teorija",
    region: "Območje",
    regionAll: "Vsa območja",
    town: "Mesto",
    townAll: "Vsa mesta",
    categories: "Kategorije",
    categoryAll: "Vse kategorije",
    withTranslator: "S tolmačem",
    slotsFound: "najdenih terminov",
    lastUpdated: "Zadnja posodobitev",
    loading: "Nalaganje terminov...",
    noSlots: "Ni prostih terminov",
    noSlotsDesc: "Za izbrane filtre trenutno ni razpisanih prostih terminov. Poskusite spremeniti iskalne pogoje ali se naročite na obvestila.",
    subscribe: "Naroči se na obvestila",
    subscribeDesc: "Prejemajte e-poštna obvestila, ko se sprosti nov termin za vaše izbrane pogoje.",
    email: "E-pošta",
    subscribeBtn: "Naroči se",
    subscribeSuccess: "Uspešno ste se naročili! Preverite e-pošto za potrditev.",
    location: "Lokacija",
    date: "Datum",
    time: "Ura",
    places: "Prosta mesta",
    unknownLocation: "Neznana lokacija",
    validationError: "Prosimo, izpolnite vsa obvezna polja (E-pošta, Kategorija, Tip izpita ter Območje ali Mesto).",
  },
  en: {
    title: "Vozniski.si - Available Slots",
    filterTitle: "Filter Slots",
    clearFilters: "Clear Filters",
    examType: "Exam Type",
    examTypeDriving: "Driving",
    examTypeTheory: "Theory",
    region: "Region",
    regionAll: "All Regions",
    town: "Town",
    townAll: "All Towns",
    categories: "Categories",
    categoryAll: "All Categories",
    withTranslator: "With Translator",
    slotsFound: "slots found",
    lastUpdated: "Last updated",
    loading: "Loading slots...",
    noSlots: "No available slots",
    noSlotsDesc: "There are currently no available slots for the selected filters. Try changing your search criteria or subscribe to notifications.",
    subscribe: "Subscribe to Notifications",
    subscribeDesc: "Get email notifications when a new slot becomes available for your selected criteria.",
    email: "Email",
    subscribeBtn: "Subscribe",
    subscribeSuccess: "Successfully subscribed! Check your email for confirmation.",
    location: "Location",
    date: "Date",
    time: "Time",
    places: "Free Places",
    unknownLocation: "Unknown Location",
    validationError: "Please fill in all required fields (Email, Category, Exam Type, and Region or Town).",
  },
};

export default function Home() {
  const { lang } = useSettings();
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastScraped, setLastScraped] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [visibleCount, setVisibleCount] = useState(12);
  const observerTarget = useRef(null);

  // Filters
  const [filterExamType, setFilterExamType] = useState("voznja");
  const [filterTolmac, setFilterTolmac] = useState(false);
  const [filterObmocje, setFilterObmocje] = useState("");
  const [filterTown, setFilterTown] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Subscription State
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [subExamType, setSubExamType] = useState("voznja");
  const [subCategory, setSubCategory] = useState("");
  const [subRegion, setSubRegion] = useState("");
  const [subTown, setSubTown] = useState("");
  const [subError, setSubError] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subTolmac, setSubTolmac] = useState(false);

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Scroll to top listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const t = translations[lang];

  // Derived state for main filters
  const availableTowns = useMemo(() => {
    if (filterObmocje && OBMOCJE_MAP[filterObmocje]) {
      return OBMOCJE_MAP[filterObmocje];
    }
    return Object.values(OBMOCJE_MAP).flat().sort();
  }, [filterObmocje]);

  // Derived state for subscription filters
  const subAvailableTowns = useMemo(() => {
    if (subRegion && OBMOCJE_MAP[subRegion]) {
      return OBMOCJE_MAP[subRegion];
    }
    return Object.values(OBMOCJE_MAP).flat().sort();
  }, [subRegion]);

  const availableRegions = Object.keys(OBMOCJE_MAP);
  const availableCategories = CATEGORY_GROUPS.flat();

  useEffect(() => {
    fetchSlots();
  }, []);

  // Infinite Scroll Observer
  // Sync subscription filters with homepage filters when dialog opens
  useEffect(() => {
    if (subscribeOpen) {
      setSubExamType(filterExamType);
      setSubRegion(filterObmocje);
      setSubTown(filterTown);
      setSubCategory(filterCategory);
      setSubTolmac(filterTolmac);
    }
  }, [subscribeOpen]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [slots, filterExamType, filterObmocje, filterTown, filterCategory]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/slots");
      const data = await res.json();
      setSlots(data.items || []);
      setLastScraped(data.last_scraped_at);
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setLoading(false);
    }
  };

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [googleToken, setGoogleToken] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setSubError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: subscribeEmail }),
      });
      
      if (res.ok) {
        setResendCooldown(30); // 30 seconds cooldown
      } else {
        const data = await res.json();
        setSubError(data.error || "Failed to resend verification code");
      }
    } catch (error) {
      setSubError("An error occurred");
    }
  };

  const handleSubscribe = async () => {
    setSubError("");
    
    // If logged in, use user email
    const emailToUse = user ? user.email : subscribeEmail;

    // Validation
    if (!emailToUse || !subCategory || !subExamType || (!subRegion && !subTown)) {
      setSubError(t.validationError);
      return;
    }

    setSubscribing(true);
    try {
      // If logged in, subscribe directly
      if (user) {
        await performSubscription({ email: user.email });
        return;
      }

      // If Google Token is present, subscribe directly
      if (googleToken) {
        await performSubscription({ google_token: googleToken });
        return;
      }

      // If OTP not sent yet, send it
      if (!otpSent) {
        const res = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: subscribeEmail }),
        });
        
        if (res.ok) {
          setOtpSent(true);
          setResendCooldown(30);
        } else {
          const data = await res.json();
          setSubError(data.error || "Failed to send verification code");
        }
        setSubscribing(false);
        return;
      }

      // If OTP sent, verify and subscribe
      if (!otp) {
        setSubError("Please enter the verification code");
        setSubscribing(false);
        return;
      }

      await performSubscription({ otp });

    } catch (error) {
      console.error("Error subscribing:", error);
      setSubError("An error occurred");
      setSubscribing(false);
    }
  };

  const performSubscription = async (extraData = {}) => {
    const emailToUse = user ? user.email : subscribeEmail;
    
    const token = localStorage.getItem('auth_token');
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        email: emailToUse,
        filter_obmocje: subRegion ? parseInt(subRegion) : null,
        filter_town: subTown || null,
        filter_exam_type: subExamType,
        filter_categories: subCategory,
        filter_tolmac: subTolmac,
        ...extraData
      }),
    });

    if (res.ok) {
      const data = await res.json();
      
      // If we got a token, login the user
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        // We might need to refresh auth state here, but a page reload or simple state update works
        window.location.reload(); // Simple way to refresh auth state
      }

      setSubscribeSuccess(true);
      setTimeout(() => {
        setSubscribeOpen(false);
        setSubscribeSuccess(false);
        setSubscribeEmail("");
        setSubCategory("");
        setSubRegion("");
        setSubTown("");
        setOtpSent(false);
        setOtp("");
        setGoogleToken(null);
      }, 2000);
    } else {
      const data = await res.json();
      setSubError(data.error || "Subscription failed");
    }
    setSubscribing(false);
  };

  const handleGoogleSubscription = async (credentialResponse) => {
    if (credentialResponse.credential) {
      setGoogleToken(credentialResponse.credential);
      
      // Decode to get email
      try {
        const base64Url = credentialResponse.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        
        if (payload.email) {
          setSubscribeEmail(payload.email);
        }
      } catch (e) {
        console.error("Failed to decode Google token", e);
      }
    }
  };

  const clearFilters = () => {
    setFilterExamType("voznja");
    setFilterTolmac(false);
    setFilterObmocje("");
    setFilterTown("");
    setFilterCategory("");
  };

  const filteredSlots = slots.filter((slot) => {
    if (slot.places_left === 0) return false;
    if (filterExamType && slot.exam_type !== filterExamType) return false;
    if (filterExamType === "teorija" && filterTolmac && !slot.tolmac)
      return false;
    if (filterObmocje && slot.obmocje !== parseInt(filterObmocje)) return false;
    if (filterTown && slot.town !== filterTown) return false;
    if (filterCategory && !slot.categories?.includes(filterCategory))
      return false;
    return true;
  });

  const visibleSlots = filteredSlots.slice(0, visibleCount);

  const renderSlot = (slot, index) => {
    const gradientClass = "bg-gradient-to-br from-card to-muted/30 border-l-4 border-l-primary";
    
    if (viewMode === "compact") {
      return (
        <div
          key={index}
          className={`flex items-center justify-between py-2 px-3 border-b border-border hover:bg-accent/50 transition-colors ${gradientClass} rounded-md mb-1 gap-3`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 min-w-[80px] sm:min-w-[140px]">
            <span className="font-semibold text-sm">{slot.date_str}</span>
            <span className="text-muted-foreground text-xs sm:text-sm">{slot.time_str}</span>
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="font-medium text-sm truncate">{slot.town}</div>
            {ADDRESS_MAP[slot.town] && (
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">
                {ADDRESS_MAP[slot.town]}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {slot.exam_type !== "teorija" && (
              <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                {slot.categories}
              </span>
            )}
            {slot.places_left && slot.exam_type !== "voznja" && (
              <span className="text-xs sm:text-sm font-medium text-green-600 whitespace-nowrap">
                {slot.places_left} <span className="hidden sm:inline">{t.places}</span>
              </span>
            )}
          </div>
        </div>
      );
    }

    if (viewMode === "list") {
      return (
        <Card key={index} className={`hover:shadow-md transition-all duration-300 ${gradientClass}`}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                <div>
                  <div className="font-bold text-lg">{slot.date_str}</div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {slot.time_str}
                  </div>
                </div>
                <div className="border-l border-border pl-4 sm:pl-6">
                  <div className="font-medium text-foreground">
                    {slot.town}
                  </div>
                  {ADDRESS_MAP[slot.town] && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {ADDRESS_MAP[slot.town]}
                    </div>
                  )}
                </div>
              </div>
              
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                  <div className="flex items-center gap-2">
                    {slot.exam_type !== "teorija" && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        {slot.categories}
                      </span>
                    )}
                    {slot.exam_type && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                        {slot.exam_type === "voznja"
                          ? t.examTypeDriving
                          : t.examTypeTheory}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {slot.places_left && slot.exam_type !== "voznja" && (
                      <span className="text-sm font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        {t.places}: {slot.places_left}
                      </span>
                    )}
                    {slot.tolmac && (
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {t.withTranslator}
                      </span>
                    )}
                  </div>
                </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Grid view
    return (
      <Card key={index} className={`hover:shadow-lg transition-all duration-300 ${gradientClass}`}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">{slot.date_str}</span>
              <span className="text-sm font-medium text-muted-foreground bg-background/50 px-2 py-1 rounded">
                {slot.time_str}
              </span>
            </div>
            <div className="text-sm">
              <p className="font-medium text-foreground">{slot.town}</p>
              {ADDRESS_MAP[slot.town] && (
                <p className="text-muted-foreground text-xs mt-1">
                  {ADDRESS_MAP[slot.town]}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {slot.categories}
              </span>
              {slot.exam_type && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {slot.exam_type === "voznja"
                    ? t.examTypeDriving
                    : t.examTypeTheory}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
              {slot.places_left && (
                <span className="text-sm font-bold text-green-600">
                  {t.places}: {slot.places_left}
                </span>
              )}
              {slot.tolmac && (
                <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {t.withTranslator}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-10">
      <HeroSubscription
        t={t}
        onSubscribeClick={() => setSubscribeOpen(true)}
      />

      <main className="container mx-auto px-4 py-8 -mt-8 relative z-10">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <p className="text-muted-foreground">
            {filteredSlots.length} {t.slotsFound}
          </p>
          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v)}>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="compact" aria-label="Compact view">
                <AlignJustify className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            {lastScraped && (
              <p className="text-xs text-muted-foreground text-right">
                {t.lastUpdated}:<br/>
                {new Date(lastScraped).toLocaleString(
                  lang === "sl" ? "sl-SI" : "en-US"
                )}
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-none shadow-md bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <h2 className="text-lg font-semibold">{t.filterTitle}</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="sm:hidden" 
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
              <div className={`flex items-center gap-2 flex-wrap ${showFilters ? 'flex' : 'hidden sm:flex'}`}>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t.clearFilters}
                </Button>
              </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 ${showFilters ? 'grid' : 'hidden sm:grid'}`}>
              {/* Exam Type Toggle */}
              <div>
                <Label>{t.examType}</Label>
                <ToggleGroup
                  type="single"
                  value={filterExamType}
                  onValueChange={(v) => {
                    if (!v) return;
                    setFilterExamType(v);
                    if (v === "voznja") setFilterTolmac(false);
                    if (v === "teorija") setFilterCategory("");
                  }}
                  className="justify-start mt-2">
                  <ToggleGroupItem value="voznja" className="flex-1">
                    {t.examTypeDriving}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="teorija" className="flex-1">
                    {t.examTypeTheory}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Region */}
              <div>
                <Label>{t.region}</Label>
                <Select
                  value={filterObmocje || "all"}
                  onValueChange={(v) => setFilterObmocje(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.regionAll}</SelectItem>
                    <SelectItem value="1">
                      {lang === "sl" ? "Primorska/Goriška" : "Coastal/Western"}
                    </SelectItem>
                    <SelectItem value="2">
                      {lang === "sl"
                        ? "Osrednjeslovenska/Gorenjska"
                        : "Central/UpperCarniola"}
                    </SelectItem>
                    <SelectItem value="3">
                      {lang === "sl" ? "Celjska/Koroška" : "Celje/Carinthia"}
                    </SelectItem>
                    <SelectItem value="4">
                      {lang === "sl"
                        ? "Dolenjska/BelaKrajina"
                        : "LowerCarniola/WhiteCarniola"}
                    </SelectItem>
                    <SelectItem value="5">
                      {lang === "sl"
                        ? "Štajerska/Prekmurje"
                        : "Styria/Prekmurje"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Town */}
              <div>
                <Label>{t.town}</Label>
                <Select
                  value={filterTown || "all"}
                  onValueChange={(v) => setFilterTown(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.townAll}</SelectItem>
                    {availableTowns.map((town) => (
                      <SelectItem key={town} value={town}>
                        {town}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Categories with grouped display */}
              <div>
                <Label>{t.categories}</Label>
                <Select
                  value={filterExamType === "teorija" ? "all" : (filterCategory || "all")}
                  onValueChange={(v) =>
                    setFilterCategory(v === "all" ? "" : v)
                  }
                  disabled={filterExamType === "teorija"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.categoryAll}</SelectItem>
                    {CATEGORY_GROUPS.map((group, groupIndex) => (
                      <div key={groupIndex} className="flex gap-1 px-2 py-1">
                        {group.map((cat) => (
                          <SelectItem key={cat} value={cat} className="flex-1">
                            {cat}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tolmac */}
              {filterExamType === "teorija" && (
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="tolmac"
                    checked={filterTolmac}
                    onCheckedChange={setFilterTolmac}
                  />
                  <Label htmlFor="tolmac">{t.withTranslator}</Label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Slots Display */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            {t.loading}
          </div>
        ) : filteredSlots.length === 0 ? (

          <div className="text-center py-16 px-4">
            <div className="bg-muted/30 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <List className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t.noSlots}</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              {t.noSlotsDesc}
            </p>
            <Button onClick={() => setSubscribeOpen(true)}>
              {t.subscribe}
            </Button>
          </div>
        ) : (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  : viewMode === "compact"
                    ? "rounded-lg overflow-hidden"
                    : "space-y-3"
              }>
              {visibleSlots.map((slot, index) => renderSlot(slot, index))}
            </div>
            
            {/* Infinite Scroll Sentinel */}
            {visibleCount < filteredSlots.length && (
              <div ref={observerTarget} className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </main>

      {/* Subscription Dialog */}
      <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.subscribe}</DialogTitle>
            <DialogDescription>{t.subscribeDesc}</DialogDescription>
          </DialogHeader>
          {subscribeSuccess ? (
            <div className="text-center py-8 text-green-600 font-medium">
              {t.subscribeSuccess}
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {!user && (
                <>
                  <div className="flex justify-center mb-4">
                    <GoogleLogin
                      onSuccess={handleGoogleSubscription}
                      onError={() => setSubError('Google login failed')}
                      theme="filled_blue"
                      shape="pill"
                      width="100%"
                      text="continue_with"
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

                  <div className="space-y-2">
                    <Label>{t.email} <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      value={subscribeEmail}
                      onChange={(e) => setSubscribeEmail(e.target.value)}
                      placeholder="vas@email.si"
                      disabled={otpSent || !!googleToken}
                    />
                  </div>

                  {otpSent && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label>Verification Code <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="tracking-widest text-center text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Check your email for the verification code.
                      </p>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto p-0 text-muted-foreground hover:text-primary"
                          onClick={handleResendOtp}
                          disabled={resendCooldown > 0}
                        >
                          {resendCooldown > 0 
                            ? `Resend code in ${resendCooldown}s` 
                            : "Resend Code"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {user && (
                <div className="bg-muted/50 p-3 rounded-md mb-4 text-sm">
                  Subscribing as <strong>{user.email}</strong>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t.examType} <span className="text-red-500">*</span></Label>
                <ToggleGroup
                  type="single"
                  value={subExamType}
                  onValueChange={(v) => {
                    if (!v) return;
                    setSubExamType(v);
                    if (v === "voznja") setSubTolmac(false);
                  }}
                  className="justify-start">
                  <ToggleGroupItem value="voznja" className="flex-1">
                    {t.examTypeDriving}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="teorija" className="flex-1">
                    {t.examTypeTheory}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <Label>{t.region}</Label>
                <Select
                  value={subRegion || "all"}
                  onValueChange={(v) => {
                    setSubRegion(v === "all" ? "" : v);
                    setSubTown(""); // Reset town when region changes
                  }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.regionAll}</SelectItem>
                    <SelectItem value="1">
                      {lang === "sl" ? "Primorska/Goriška" : "Coastal/Western"}
                    </SelectItem>
                    <SelectItem value="2">
                      {lang === "sl"
                        ? "Osrednjeslovenska/Gorenjska"
                        : "Central/UpperCarniola"}
                    </SelectItem>
                    <SelectItem value="3">
                      {lang === "sl" ? "Celjska/Koroška" : "Celje/Carinthia"}
                    </SelectItem>
                    <SelectItem value="4">
                      {lang === "sl"
                        ? "Dolenjska/BelaKrajina"
                        : "LowerCarniola/WhiteCarniola"}
                    </SelectItem>
                    <SelectItem value="5">
                      {lang === "sl"
                        ? "Štajerska/Prekmurje"
                        : "Styria/Prekmurje"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.town}</Label>
                <Select
                  value={subTown || "all"}
                  onValueChange={(v) => setSubTown(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.townAll}</SelectItem>
                    {subAvailableTowns.map((town) => (
                      <SelectItem key={town} value={town}>
                        {town}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.categories} <span className="text-red-500">*</span></Label>
                <Select
                  value={subCategory || "all"}
                  onValueChange={(v) => setSubCategory(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.categoryAll}</SelectItem>
                    {CATEGORY_GROUPS.map((group, groupIndex) => (
                      <div key={groupIndex} className="flex gap-1 px-2 py-1">
                        {group.map((cat) => (
                          <SelectItem key={cat} value={cat} className="flex-1">
                            {cat}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {subExamType === "teorija" && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sub-tolmac"
                    checked={subTolmac}
                    onCheckedChange={setSubTolmac}
                  />
                  <Label htmlFor="sub-tolmac">{t.withTranslator}</Label>
                </div>
              )}

              {subError && (
                <div className="text-sm text-red-500 font-medium">
                  {subError}
                </div>
              )}

              <Button 
                className="w-full mt-4" 
                onClick={handleSubscribe}
                disabled={subscribing}
              >
                {subscribing ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t.loading}
                  </>
                ) : (
                  user ? t.subscribeBtn : (otpSent ? "Verify & Subscribe" : (googleToken ? t.subscribeBtn : "Send Verification Code"))
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          className="fixed bottom-8 right-8 rounded-full shadow-lg z-50 h-12 w-12"
          size="icon"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
