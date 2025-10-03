'use client';

import { useState, useEffect, useMemo } from 'react';
import { Moon, Sun, Globe, Mail, LayoutGrid, List, AlignJustify } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';

const OBMOCJE_MAP = {
  1: ["Ajdovščina", "Idrija", "Ilirska Bistrica", "Koper", "Nova Gorica", "Postojna", "Sežana", "Tolmin"],
  2: ["Domžale", "Ig", "Jesenice", "Kranj", "Ljubljana", "Vrhnika"],
  3: ["Celje", "Laško", "Ločica ob Savinji", "Ravne na Koroškem", "Slovenske Konjice", "Slovenj Gradec", "Šentjur", "Šmarje pri Jelšah", "Trbovlje", "Velenje"],
  4: ["Brežice", "Črnomelj", "Kočevje", "Krško", "Novo mesto", "Sevnica"],
  5: ["Maribor", "Murska Sobota", "Ormož", "Ptuj", "Slovenska Bistrica"],
};

const CATEGORY_GROUPS = [
  ['A', 'A1', 'A2', 'AM'],
  ['B', 'B1', 'BE'],
  ['C', 'C1', 'C1E', 'CE'],
  ['D', 'D1', 'D1E', 'DE'],
  ['F', 'G']
];

const translations = {
  sl: {
    title: 'Iskanje terminov za vozniški izpit',
    loading: 'Nalaganje...',
    noSlots: 'Ni razpoložljivih terminov',
    filterTitle: 'Filtri',
    date: 'Datum',
    time: 'Čas',
    location: 'Lokacija',
    categories: 'Kategorije',
    places: 'Prosta mesta',
    examType: 'Tip izpita',
    examTypeDriving: 'Vožnja',
    examTypeTheory: 'Teorija',
    withTranslator: 'S tolmačem',
    region: 'Območje',
    regionAll: 'Vsa območja',
    town: 'Mesto',
    townAll: 'Vsa mesta',
    clearFilters: 'Počisti filtre',
    subscribe: 'Naroči se na obvestila',
    subscribeDesc: 'Prejemajte e-poštna obvestila, ko se pojavi nov termin, ki ustreza vašim filtrom',
    email: 'E-pošta',
    subscribeBtn: 'Naroči se',
    subscribeSuccess: 'Uspešno ste se naročili na obvestila!',
    lastUpdated: 'Zadnja posodobitev',
    slotsFound: 'najdenih terminov',
    viewList: 'Seznam',
    viewGrid: 'Mreža',
    viewCompact: 'Kompaktno',
    categoryAll: 'Vse kategorije',
  },
  en: {
    title: 'Driving Exam Slot Finder',
    loading: 'Loading...',
    noSlots: 'No available slots',
    filterTitle: 'Filters',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    categories: 'Categories',
    places: 'Available places',
    examType: 'Exam type',
    examTypeDriving: 'Driving',
    examTypeTheory: 'Theory',
    withTranslator: 'With translator',
    region: 'Region',
    regionAll: 'All regions',
    town: 'Town',
    townAll: 'All towns',
    clearFilters: 'Clear filters',
    subscribe: 'Subscribe to notifications',
    subscribeDesc: 'Receive email notifications when new slots matching your filters appear',
    email: 'Email',
    subscribeBtn: 'Subscribe',
    subscribeSuccess: 'Successfully subscribed to notifications!',
    lastUpdated: 'Last updated',
    slotsFound: 'slots found',
    viewList: 'List',
    viewGrid: 'Grid',
    viewCompact: 'Compact',
    categoryAll: 'All categories',
  }
};

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState('sl');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastScraped, setLastScraped] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  
  // Filters
  const [filterExamType, setFilterExamType] = useState('voznja');
  const [filterTolmac, setFilterTolmac] = useState(false);
  const [filterObmocje, setFilterObmocje] = useState('');
  const [filterTown, setFilterTown] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Subscription
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);

  const t = translations[lang];

  // Get available towns based on selected region
  const availableTowns = useMemo(() => {
    if (!filterObmocje) {
      return [...new Set(slots.map(s => s.town).filter(Boolean))];
    }
    return OBMOCJE_MAP[parseInt(filterObmocje)] || [];
  }, [filterObmocje, slots]);

  // Reset town when region changes
  useEffect(() => {
    if (filterObmocje && filterTown) {
      const validTowns = OBMOCJE_MAP[parseInt(filterObmocje)] || [];
      if (!validTowns.includes(filterTown)) {
        setFilterTown('');
      }
    }
  }, [filterObmocje, filterTown]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/slots');
      const data = await res.json();
      setSlots(data.items || []);
      setLastScraped(data.last_scraped_at);
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: subscribeEmail,
          filter_obmocje: filterObmocje ? parseInt(filterObmocje) : null,
          filter_town: filterTown || null,
          filter_exam_type: filterExamType || null,
          filter_tolmac: filterTolmac,
          filter_categories: filterCategory || null,
        }),
      });
      
      if (res.ok) {
        setSubscribeSuccess(true);
        setTimeout(() => {
          setSubscribeOpen(false);
          setSubscribeSuccess(false);
          setSubscribeEmail('');
        }, 2000);
      }
    } catch (error) {
      console.error('Error subscribing:', error);
    }
  };

  const clearFilters = () => {
    setFilterExamType('voznja');
    setFilterTolmac(false);
    setFilterObmocje('');
    setFilterTown('');
    setFilterCategory('');
  };

  const filteredSlots = slots.filter(slot => {
    if (filterExamType && slot.exam_type !== filterExamType) return false;
    if (filterTolmac && !slot.tolmac) return false;
    if (filterObmocje && slot.obmocje !== parseInt(filterObmocje)) return false;
    if (filterTown && slot.town !== filterTown) return false;
    if (filterCategory && !slot.categories?.includes(filterCategory)) return false;
    return true;
  });

  const renderSlot = (slot, index) => {
    if (viewMode === 'compact') {
      return (
        <div key={index} className="flex items-center justify-between py-2 px-4 border-b border-border hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-6 flex-1">
            <span className="font-semibold min-w-[100px]">{slot.date_str}</span>
            <span className="text-muted-foreground min-w-[60px]">{slot.time_str}</span>
            <span className="text-sm text-muted-foreground min-w-[200px]">{slot.location}</span>
            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{slot.categories}</span>
            {slot.exam_type && (
              <span className="text-xs px-2 py-1 rounded bg-secondary/10 text-secondary-foreground">
                {slot.exam_type === 'voznja' ? t.examTypeDriving : t.examTypeTheory}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {slot.places_left && (
              <span className="text-sm font-medium text-green-600">{slot.places_left}</span>
            )}
            {slot.tolmac && (
              <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                Tolmač
              </span>
            )}
          </div>
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <div className="font-semibold text-lg">{slot.date_str}</div>
                  <div className="text-sm text-muted-foreground">{slot.time_str}</div>
                </div>
                <div className="border-l border-border pl-6">
                  <div className="text-sm text-muted-foreground">{slot.location}</div>
                  {slot.town && <div className="text-xs text-muted-foreground">{slot.town}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{slot.categories}</span>
                  {slot.exam_type && (
                    <span className="text-xs px-2 py-1 rounded bg-secondary/10 text-secondary-foreground">
                      {slot.exam_type === 'voznja' ? t.examTypeDriving : t.examTypeTheory}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {slot.places_left && (
                  <span className="text-sm font-medium text-green-600">
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
    }

    // Grid view
    return (
      <Card key={index} className="hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">{slot.date_str}</span>
              <span className="text-sm text-muted-foreground">{slot.time_str}</span>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">{slot.location}</p>
              {slot.town && <p className="text-muted-foreground">{slot.town}</p>}
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{slot.categories}</span>
              {slot.exam_type && (
                <span className="text-xs px-2 py-1 rounded bg-secondary/10 text-secondary-foreground">
                  {slot.exam_type === 'voznja' ? t.examTypeDriving : t.examTypeTheory}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              {slot.places_left && (
                <span className="text-sm font-medium text-green-600">
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLang(lang === 'sl' ? 'en' : 'sl')}>
              <Globe className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats and View Switcher */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredSlots.length} {t.slotsFound}
          </p>
          <div className="flex items-center gap-4">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v)}>
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
              <p className="text-sm text-muted-foreground">
                {t.lastUpdated}: {new Date(lastScraped).toLocaleString(lang === 'sl' ? 'sl-SI' : 'en-US')}
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t.filterTitle}</h2>
              <div className="flex items-center gap-4">
                <Dialog open={subscribeOpen} onOpenChange={setSubscribeOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      {t.subscribe}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t.subscribe}</DialogTitle>
                      <DialogDescription>{t.subscribeDesc}</DialogDescription>
                    </DialogHeader>
                    {subscribeSuccess ? (
                      <div className="text-center py-4 text-green-600">
                        {t.subscribeSuccess}
                      </div>
                    ) : (
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>{t.email}</Label>
                          <Input type="email" value={subscribeEmail} onChange={(e) => setSubscribeEmail(e.target.value)} placeholder="vas@email.si" />
                        </div>
                        <Button onClick={handleSubscribe} className="w-full">{t.subscribeBtn}</Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="sm" onClick={clearFilters}>{t.clearFilters}</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Exam Type Toggle */}
              <div>
                <Label>{t.examType}</Label>
                <ToggleGroup type="single" value={filterExamType} onValueChange={(v) => v && setFilterExamType(v)} className="justify-start mt-2">
                  <ToggleGroupItem value="voznja" className="flex-1">{t.examTypeDriving}</ToggleGroupItem>
                  <ToggleGroupItem value="teorija" className="flex-1">{t.examTypeTheory}</ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Region */}
              <div>
                <Label>{t.region}</Label>
                <Select value={filterObmocje || "all"} onValueChange={(v) => setFilterObmocje(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.regionAll}</SelectItem>
                    <SelectItem value="1">Območje 1</SelectItem>
                    <SelectItem value="2">Območje 2</SelectItem>
                    <SelectItem value="3">Območje 3</SelectItem>
                    <SelectItem value="4">Območje 4</SelectItem>
                    <SelectItem value="5">Območje 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Town */}
              <div>
                <Label>{t.town}</Label>
                <Select value={filterTown || "all"} onValueChange={(v) => setFilterTown(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.townAll}</SelectItem>
                    {availableTowns.map(town => (
                      <SelectItem key={town} value={town}>{town}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Categories with grouped display */}
              <div>
                <Label>{t.categories}</Label>
                <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.categoryAll}</SelectItem>
                    {CATEGORY_GROUPS.map((group, groupIndex) => (
                      <div key={groupIndex} className="flex gap-1 px-2 py-1">
                        {group.map(cat => (
                          <SelectItem key={cat} value={cat} className="flex-1">{cat}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tolmac */}
              <div className="flex items-center space-x-2 pt-6">
                <Switch id="tolmac" checked={filterTolmac} onCheckedChange={setFilterTolmac} />
                <Label htmlFor="tolmac">{t.withTranslator}</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slots Display */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t.loading}</div>
        ) : filteredSlots.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t.noSlots}</div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
              : viewMode === 'compact'
              ? 'border border-border rounded-lg overflow-hidden'
              : 'space-y-3'
          }>
            {filteredSlots.map((slot, index) => renderSlot(slot, index))}
          </div>
        )}
      </main>
    </div>
  );
}