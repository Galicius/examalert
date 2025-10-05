'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, LogOut, Plus, X, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const CATEGORIES = ['A', 'A1', 'A2', 'AM', 'B', 'B1', 'BE', 'C', 'C1', 'C1E', 'CE', 'D', 'D1', 'D1E', 'DE', 'F', 'G'];

export default function AdminQuestions() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    question_text: '',
    answer_a: '',
    answer_b: '',
    answer_c: '',
    answer_d: '',
    correct_answers: '',
    exam_type: 'teorija',
    category: 'B',
  });

  useEffect(() => {
    verifyAdmin();
  }, []);

  useEffect(() => {
    if (username) {
      fetchQuestions();
    }
  }, [username]);

  const verifyAdmin = async () => {
    const token = localStorage.getItem('admin_token');
    const storedUsername = localStorage.getItem('admin_username');

    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const res = await fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_username');
        router.push('/admin/login');
        return;
      }

      setUsername(storedUsername || 'Admin');
    } catch (error) {
      router.push('/admin/login');
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/questions');
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    router.push('/admin/login');
  };

  const handleDelete = async (questionId) => {
    const token = localStorage.getItem('admin_token');

    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchQuestions();
      } else {
        alert('Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Error deleting question');
    }
  };

  const handleEditClick = (question) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      answer_a: question.answer_a,
      answer_b: question.answer_b,
      answer_c: question.answer_c,
      answer_d: question.answer_d,
      correct_answers: question.correct_answers,
      exam_type: question.exam_type,
      category: question.category,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem('admin_token');

    try {
      const res = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setEditDialogOpen(false);
        setEditingQuestion(null);
        fetchQuestions();
      } else {
        alert('Failed to update question');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Error updating question');
    }
  };

  const getCorrectAnswersArray = (correctAnswers) => {
    if (!correctAnswers) return [];
    return correctAnswers.split(',').map(a => a.trim());
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage exam questions</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {username}</span>
            <Button variant="outline" onClick={() => router.push('/')}>
              View Site
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="mb-6">
          <p className="text-lg font-semibold">Total Questions: {questions.length}</p>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No questions yet</div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => {
              const correctAnswers = getCorrectAnswersArray(q.correct_answers);
              
              return (
                <Card key={q.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{q.question_text}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge variant="outline">{q.exam_type}</Badge>
                          <Badge variant="secondary">{q.category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            By: {q.submitted_by || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ID: {q.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4 text-green-600" />
                            <span>{q.likes_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsDown className="h-4 w-4 text-red-600" />
                            <span>{q.dislikes_count || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(q)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the question.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(q.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                        const isCorrect = correctAnswers.includes(answer.label);
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
                                <Check className="h-4 w-4 text-green-600 ml-auto" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Make changes to the question below</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label>Question</Label>
              <Textarea
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Answer A</Label>
                <Input
                  value={formData.answer_a}
                  onChange={(e) => setFormData({ ...formData, answer_a: e.target.value })}
                />
              </div>
              <div>
                <Label>Answer B</Label>
                <Input
                  value={formData.answer_b}
                  onChange={(e) => setFormData({ ...formData, answer_b: e.target.value })}
                />
              </div>
              <div>
                <Label>Answer C</Label>
                <Input
                  value={formData.answer_c}
                  onChange={(e) => setFormData({ ...formData, answer_c: e.target.value })}
                />
              </div>
              <div>
                <Label>Answer D</Label>
                <Input
                  value={formData.answer_d}
                  onChange={(e) => setFormData({ ...formData, answer_d: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Correct Answers (comma-separated, e.g., A,B)</Label>
              <Input
                value={formData.correct_answers}
                onChange={(e) => setFormData({ ...formData, correct_answers: e.target.value })}
                placeholder="A,B"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Exam Type</Label>
                <Select
                  value={formData.exam_type}
                  onValueChange={(v) => setFormData({ ...formData, exam_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voznja">Driving</SelectItem>
                    <SelectItem value="teorija">Theory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
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

            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdate} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}