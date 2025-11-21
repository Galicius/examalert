"use client";
import Head from "next/head";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutGrid,
  List,
  AlignJustify,
  Loader2,
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

const OBMOCJE_MAP = {
  1: [
    "Ajdovščina",
    "Idrija",
    "Ilirska Bistrica",
    "Koper",
    "Nova Gorica",
    "Postojna",
    "Sežana",
    "Tolmin",
  ],
  2: ["Domžale", "Ig", "Jesenice", "Kranj", "Ljubljana", "Vrhnika"],
  3: [
    "Celje",
    "Laško",
    "Ločica ob Savinji",
    "Ravne na Koroškem",
    "Slovenske Konjice",
    "Slovenj Gradec",
    "Šentjur",
    "Šmarje pri Jelšah",
    "Trbovlje",
    "Velenje",
  ],
  4: ["Brežice", "Črnomelj", "Kočevje", "Krško", "Novo mesto", "Sevnica"],
  5: ["Maribor", "Murska Sobota", "Ormož", "Ptuj", "Slovenska Bistrica"],
};

const ADDRESS_MAP = {
  // ===== OBMOČJE 1 =====
  Ajdovščina: "Tovarniška cesta 26, Ajdovščina",
  Idrija: "Mestni trg 2, Idrija",
  "Ilirska Bistrica": "Šercerjeva cesta 17, Ilirska Bistrica",
  Koper: "Ljubljanska cesta 6, Koper",
  "Nova Gorica": "Trg Edvarda Kardelja 1, Nova Gorica",
  Postojna: "Kazarje 10 (EPIC), Postojna",
  Sežana: "Ulica Mirka Pirca 4, Sežana",
  Tolmin: "Tumov drevored 4, Tolmin",

  // ===== OBMOČJE 2 =====
  Domžale: "Ljubljanska cesta 71, Domžale",
  Ig: "Ig",
  Jesenice: "Cesta železarjev 6a, Jesenice",
  Kranj: "Kolodvorska cesta 5, Kranj",
  Ljubljana: "Cesta dveh cesarjev 176, Ljubljana",
  Vrhnika: "Vrhnika",

  // ===== OBMOČJE 3 =====
  Celje: "Cesta v Celje 14, Ljubečna",
  Laško: "Poženelova ulica 22, Laško",
  "Ločica ob Savinji": "Ločica ob Savinji 49, Ločica ob Savinji",
  "Ravne na Koroškem": "Čečovje 12a, Ravne na Koroškem",
  "Slovenske Konjice": "Tattenbachova ulica 2a, Slovenske Konjice",
  "Slovenj Gradec": "Meškova ulica 21, Slovenj Gradec",
  Šentjur: "Cesta na kmetijsko šolo 9, Šentjur",
  "Šmarje pri Jelšah": "Obrtniška ulica 4, Šmarje pri Jelšah",
  Trbovlje: "Mestni trg 4, Trbovlje",
  Velenje: "Koroška cesta 62a, Velenje",

  // ===== OBMOČJE 4 =====
  Brežice: "Izobraževalno vadbeni center, Bizeljska cesta 45, Brežice",
  Črnomelj: "Ulica Otona Župančiča 4, Črnomelj",
  Kočevje: "Cesta na stadion 7, Kočevje",
  Krško: "Žadovinek 36, Krško",
  "Novo mesto": "UE Defranceschijeva 1 (vhod z zadnje strani), Novo mesto",
  Sevnica: "Prvomajska ulica 8, Sevnica",

  // ===== OBMOČJE 5 =====
  Maribor: "Cesta k Tamu 11, Maribor",
  "Murska Sobota": "Noršinska ulica 8, Murska Sobota",
  Ormož: "Vrazova ulica 12, Ormož",
  Ptuj: "Dornavska cesta 22B, Ptuj",
  "Slovenska Bistrica": "Partizanska cesta 22, Slovenska Bistrica",
};

const CATEGORY_GROUPS = [
  ["A", "A1", "A2", "AM"],
  ["B", "B1", "BE"],
  ["C", "C1", "C1E", "CE"],
  ["D", "D1", "D1E", "DE"],
  ["F", "G"],
];

const translations = {
  sl: {
    title: "Iskanje terminov za vozniški izpit",
    loading: "Nalaganje...",
    noSlots: "Ni razpoložljivih terminov",
    filterTitle: "Filtri",
    date: "Datum",
    time: "Čas",
    location: "Lokacija",
    categories: "Kategorije",
    places: "Prosta mesta",
    examType: "Tip izpita",
    examTypeDriving: "Vožnja",
    examTypeTheory: "Teorija",
    withTranslator: "S tolmačem",
    region: "Območje",
    regionAll: "Vsa območja",
    town: "Mesto",
    townAll: "Vsa mesta",
    clearFilters: "Počisti filtre",
    subscribe: "Naroči se na obvestila",
    subscribeDesc:
      "Izpolnite spodnje podatke, da boste obveščeni o novih terminih.",
    email: "E-pošta",
    subscribeBtn: "Naroči se",
    subscribeSuccess: "Uspešno ste se naročili na obvestila!",
    lastUpdated: "Zadnja posodobitev",
    slotsFound: "najdenih terminov",
    viewList: "Seznam",
    viewGrid: "Mreža",
    viewCompact: "Kompaktno",
    categoryAll: "Vse kategorije",
    validationError: "Prosimo, izpolnite vsa obvezna polja (E-pošta, Kategorija, Tip izpita ter Območje ali Mesto).",
  },
  en: {
    title: "Driving Exam Slot Finder",
    loading: "Loading...",
    noSlots: "No available slots",
    filterTitle: "Filters",
    date: "Date",
    time: "Time",
    location: "Location",
    categories: "Categories",
    places: "Available places",
    examType: "Exam type",
    examTypeDriving: "Driving",
    examTypeTheory: "Theory",
    withTranslator: "With translator",
    region: "Region",
    regionAll: "All regions",
    town: "Town",
    townAll: "All towns",
    clearFilters: "Clear filters",
    subscribe: "Subscribe to notifications",
    subscribeDesc:
      "Fill out the details below to get notified about new slots.",
    email: "Email",
    subscribeBtn: "Subscribe",
    subscribeSuccess: "Successfully subscribed to notifications!",
    lastUpdated: "Last updated",
    slotsFound: "slots found",
    viewList: "List",
    viewGrid: "Grid",
    viewCompact: "Compact",
    categoryAll: "All categories",
    validationError: "Please fill in all required fields (Email, Category, Exam Type, and Region or Town).",
  },
};

export default function App() {
  const { lang } = useSettings();
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

  const handleSubscribe = async () => {
    setSubError("");
    
    // Validation
    if (!subscribeEmail || !subCategory || !subExamType || (!subRegion && !subTown)) {
      setSubError(t.validationError);
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: subscribeEmail,
          filter_obmocje: subRegion ? parseInt(subRegion) : null,
          filter_town: subTown || null,
          filter_exam_type: subExamType,
          filter_categories: subCategory,
          filter_tolmac: subTolmac,
        }),
      });

      if (res.ok) {
        setSubscribeSuccess(true);
        setTimeout(() => {
          setSubscribeOpen(false);
          setSubscribeSuccess(false);
          setSubscribeEmail("");
          setSubCategory("");
          setSubRegion("");
          setSubTown("");
        }, 2000);
      }
    } catch (error) {
      console.error("Error subscribing:", error);
    } finally {
      setSubscribing(false);
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
          className={`flex items-center justify-between py-3 px-4 border-b border-border hover:bg-accent/50 transition-colors ${gradientClass} rounded-md mb-2`}>
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            <span className="font-semibold min-w-[90px]">{slot.date_str}</span>
            <span className="text-muted-foreground min-w-[50px]">
              {slot.time_str}
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {slot.location}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-2">
             <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary whitespace-nowrap">
              {slot.categories}
            </span>
            {slot.places_left && (
              <span className="text-sm font-medium text-green-600 whitespace-nowrap">
                {slot.places_left}
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
                
                <div className="flex items-center gap-3">
                  {slot.places_left && (
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
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" />
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
              <h2 className="text-lg font-semibold">{t.filterTitle}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t.clearFilters}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  value={filterCategory || "all"}
                  onValueChange={(v) =>
                    setFilterCategory(v === "all" ? "" : v)
                  }>
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
          <div className="text-center py-12 text-muted-foreground">
            {t.noSlots}
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
              <div className="space-y-2">
                <Label>{t.email} <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  placeholder="vas@email.si"
                />
              </div>

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
                  t.subscribeBtn
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
