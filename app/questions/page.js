'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Globe, Plus, ThumbsUp, ThumbsDown, Calendar, CheckCircle, LogIn, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { AuthDialog } from '@/components/auth-dialog';

const translations = {
  sl: {
    title: 'Vprašanja iz izpita',
    subtitle: 'Delite in odkrijte vprašanja, ki so se pojavila na teoretičnih izpitih',
    addQuestion: 'Dodaj vprašanje',
    backToSlots: 'Nazaj na termine',
    question: 'Vprašanje',
    answers: 'Odgovori',
    correctAnswers: 'Pravilni odgovori',
    examType: 'Tip izpita',
    examTypeDriving: 'Vožnja',
    examTypeTheory: 'Teorija',
    category: 'Kategorija',
    submittedBy: 'Avtor (opcijsko)',
    submit: 'Objavi vprašanje',
    loading: 'Nalaganje...',
    noQuestions: 'Še ni vprašanj. Bodite prvi, ki doda vprašanje!',
    hadThisQuestion: 'Imel sem to vprašanje',
    didntHaveThis: 'Nisem imel tega vprašanja',
    likes: 'uporabnikov imelo',
    dislikes: 'uporabnikov ni imelo',
    filterByType: 'Filtriraj po tipu',
    filterByCategory: 'Filtriraj po kategoriji',
    all: 'Vse',
    answerA: 'Odgovor A',
    answerB: 'Odgovor B',
    answerC: 'Odgovor C',
    answerD: 'Odgovor D',
    checkCorrect: 'Označi pravilne odgovore (lahko več)',
    questionAdded: 'Vprašanje uspešno dodano!',
    fillAllFields: 'Izpolnite vsa polja',
    selectCorrectAnswer: 'Izberite vsaj en pravilen odgovor',
    addedOn: 'Dodano',
    loginRequired: 'Prijava potrebna',
    loginToAdd: 'Prijavite se za dodajanje vprašanj',
    authTitle: 'Prijava / Registracija',
    authDescription: 'Prijavite se ali se registrirajte za dodajanje vprašanj',
    email: 'E-pošta',
    username: 'Uporabniško ime',
    password: 'Geslo',
    login: 'Prijava',
    register: 'Registracija',
    learning: 'Učenje',
  },
  en: {
    title: 'Exam Questions',
    subtitle: 'Share and discover questions that appeared on theory exams',
    addQuestion: 'Add Question',
    backToSlots: 'Back to Slots',
    question: 'Question',
    answers: 'Answers',
    correctAnswers: 'Correct Answers',
    examType: 'Exam Type',
    examTypeDriving: 'Driving',
    examTypeTheory: 'Theory',
    category: 'Category',
    submittedBy: 'Author (optional)',
    submit: 'Submit Question',
    loading: 'Loading...',
    noQuestions: 'No questions yet. Be the first to add one!',
    hadThisQuestion: 'I had this question',
    didntHaveThis: 'I didn\'t have this question',
    likes: 'users had this',
    dislikes: 'users didn\'t have this',
    filterByType: 'Filter by type',
    filterByCategory: 'Filter by category',
    all: 'All',
    answerA: 'Answer A',
    answerB: 'Answer B',
    answerC: 'Answer C',
    answerD: 'Answer D',
    checkCorrect: 'Mark correct answers (can be multiple)',
    questionAdded: 'Question successfully added!',
    fillAllFields: 'Fill all fields',
    selectCorrectAnswer: 'Select at least one correct answer',
    addedOn: 'Added',
    loginRequired: 'Login required',
    loginToAdd: 'Login to add questions',
    authTitle: 'Login / Register',
    authDescription: 'Login or register to add questions',
    email: 'Email',
    username: 'Username',
    password: 'Password',
    login: 'Login',
    register: 'Register',
    learning: 'Learning',
  }
};

const CATEGORIES = ['A', 'A1', 'A2', 'AM', 'B', 'B1', 'BE', 'C', 'C1', 'C1E', 'CE', 'D', 'D1', 'D1E', 'DE', 'F', 'G'];

export default function QuestionsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState('sl');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [filterExamType, setFilterExamType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Form state
  const [questionText, setQuestionText] = useState('');
  const [answerA, setAnswerA] = useState('');
  const [answerB, setAnswerB] = useState('');
  const [answerC, setAnswerC] = useState('');
  const [answerD, setAnswerD] = useState('');
  const [correctA, setCorrectA] = useState(false);
  const [correctB, setCorrectB] = useState(false);
  const [correctC, setCorrectC] = useState(false);
  const [correctD, setCorrectD] = useState(false);
  const [examType, setExamType] = useState('teorija');
  const [category, setCategory] = useState('B');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { user, isAuthenticated, getAuthHeaders } = useAuth();
  const t = translations[lang];

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);

  // Save theme to localStorage and apply
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
    fetchQuestions();
  }, [filterExamType, filterCategory]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterExamType) params.append('exam_type', filterExamType);
      if (filterCategory) params.append('category', filterCategory);
      
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      setAuthDialogOpen(true);
      return;
    }

    if (!questionText || !answerA || !answerB || !answerC || !answerD) {
      alert(t.fillAllFields);
      return;
    }

    const correctAnswers = [];
    if (correctA) correctAnswers.push('A');
    if (correctB) correctAnswers.push('B');
    if (correctC) correctAnswers.push('C');
    if (correctD) correctAnswers.push('D');

    if (correctAnswers.length === 0) {
      alert(t.selectCorrectAnswer);
      return;
    }

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          question_text: questionText,
          answer_a: answerA,
          answer_b: answerB,
          answer_c: answerC,
          answer_d: answerD,
          correct_answers: correctAnswers.join(','),
          exam_type: examType,
          category,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setDialogOpen(false);
          setSubmitSuccess(false);
          resetForm();
          fetchQuestions();
        }, 1500);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit question');
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      alert('Failed to submit question');
    }
  };

  const resetForm = () => {
    setQuestionText('');
    setAnswerA('');
    setAnswerB('');
    setAnswerC('');
    setAnswerD('');
    setCorrectA(false);
    setCorrectB(false);
    setCorrectC(false);
    setCorrectD(false);
    setExamType('teorija');
    setCategory('B');
  };

  const handleAddQuestionClick = () => {
    if (!isAuthenticated) {
      setAuthDialogOpen(true);
    } else {
      setDialogOpen(true);
    }
  };

  const handleVote = async (questionId, voteType) => {
    try {
      const res = await fetch(`/api/questions/${questionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType }),
      });

      if (res.ok) {
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
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
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t.backToSlots}</span>
                </Button>
              </Link>
              <Link href="/learning">
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t.learning}</span>
                </Button>
              </Link>
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
        {/* Actions */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterExamType || "all"} onValueChange={(v) => setFilterExamType(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px] sm:w-[180px]">
                <SelectValue placeholder={t.filterByType} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="voznja">{t.examTypeDriving}</SelectItem>
                <SelectItem value="teorija">{t.examTypeTheory}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[120px] sm:w-[150px]">
                <SelectValue placeholder={t.filterByCategory} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAuthenticated ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.addQuestion}
                </Button>
              </DialogTrigger>
          ) : (
            <Button onClick={() => setAuthDialogOpen(true)}>
              <LogIn className="h-4 w-4 mr-2" />
              {t.loginToAdd}
            </Button>
          )}

          {isAuthenticated && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t.addQuestion}</DialogTitle>
                <DialogDescription>{t.subtitle}</DialogDescription>
              </DialogHeader>
              
              {submitSuccess ? (
                <div className="text-center py-8 text-green-600 flex flex-col items-center gap-2">
                  <CheckCircle className="h-12 w-12" />
                  <p className="text-lg font-semibold">{t.questionAdded}</p>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>{t.question}</Label>
                    <Textarea 
                      value={questionText} 
                      onChange={(e) => setQuestionText(e.target.value)}
                      rows={3}
                      placeholder="Vnesite vprašanje..."
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={correctA} onCheckedChange={setCorrectA} id="correctA" />
                      <Input 
                        value={answerA} 
                        onChange={(e) => setAnswerA(e.target.value)}
                        placeholder={t.answerA}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={correctB} onCheckedChange={setCorrectB} id="correctB" />
                      <Input 
                        value={answerB} 
                        onChange={(e) => setAnswerB(e.target.value)}
                        placeholder={t.answerB}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={correctC} onCheckedChange={setCorrectC} id="correctC" />
                      <Input 
                        value={answerC} 
                        onChange={(e) => setAnswerC(e.target.value)}
                        placeholder={t.answerC}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={correctD} onCheckedChange={setCorrectD} id="correctD" />
                      <Input 
                        value={answerD} 
                        onChange={(e) => setAnswerD(e.target.value)}
                        placeholder={t.answerD}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t.checkCorrect}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t.examType}</Label>
                      <Select value={examType} onValueChange={setExamType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="voznja">{t.examTypeDriving}</SelectItem>
                          <SelectItem value="teorija">{t.examTypeTheory}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t.category}</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>{t.submittedBy}</Label>
                    <Input 
                      value={submittedBy} 
                      onChange={(e) => setSubmittedBy(e.target.value)}
                      placeholder="Vaše ime ali vzdevek"
                    />
                  </div>

                  <Button onClick={handleSubmit} className="w-full">
                    {t.submit}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t.loading}</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t.noQuestions}</div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <Card key={q.id || index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{q.question_text}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{q.exam_type === 'voznja' ? t.examTypeDriving : t.examTypeTheory}</Badge>
                        <Badge variant="secondary">{q.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {q.submitted_by || 'Anonymous'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleVote(q.id, 'like')}
                        className="flex items-center gap-1"
                      >
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{q.likes_count || 0}</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleVote(q.id, 'dislike')}
                        className="flex items-center gap-1"
                      >
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">{q.dislikes_count || 0}</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { label: 'A', text: q.answer_a },
                      { label: 'B', text: q.answer_b },
                      { label: 'C', text: q.answer_c },
                      { label: 'D', text: q.answer_d }
                    ].map((answer) => {
                      const isCorrect = q.correct_answers?.includes(answer.label);
                      return (
                        <div 
                          key={answer.label}
                          className={`p-3 rounded-lg border ${
                            isCorrect 
                              ? 'bg-green-50 dark:bg-green-950 border-green-500' 
                              : 'bg-card border-border'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{answer.label})</span>
                            <span>{answer.text}</span>
                            {isCorrect && (
                              <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t.hadThisQuestion}</span>
                    <span>{t.didntHaveThis}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}