import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants';
import { User, FeedbackForm, FeedbackRequest } from '../types';
import { cn } from '../lib/utils';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

export default function SelfAssessment() {
  const { user: currentUser } = useAuth();
  const { showDialog } = useDialog();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FeedbackForm>(() => {
    const saved = localStorage.getItem(`self_assessment_${currentUser?.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      reviewee_id: currentUser?.id || '',
      request_id: undefined,
      reviewer_name: currentUser?.name || '',
      reviewer_relationship: 'Self',
      date: new Date().toISOString().split('T')[0],
      scores: {},
      notes: {},
      open_ended_1: '',
      open_ended_2: '',
      open_ended_3: '',
      open_ended_4: '',
      overall_assessment: '',
    };
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`self_assessment_${currentUser.id}`, JSON.stringify(form));
    }
  }, [form, currentUser]);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let totalFields = 0;
    let filledFields = 0;

    // Reviewer details (if not anonymous)
    totalFields += 2;
    if (form.reviewer_name) filledFields++;
    if (form.reviewer_relationship) filledFields++;

    // Date
    totalFields += 1;
    if (form.date) filledFields++;

    // Scaled questions
    CATEGORIES.forEach(cat => {
      cat.questions.forEach(q => {
        totalFields += 1;
        if (form.scores[q.id]) filledFields++;
      });
    });

    // Open ended (3 required)
    totalFields += 3;
    if (form.open_ended_1) filledFields++;
    if (form.open_ended_2) filledFields++;
    if (form.open_ended_3) filledFields++;

    // Overall assessment
    totalFields += 1;
    if (form.overall_assessment) filledFields++;

    setProgress(Math.round((filledFields / totalFields) * 100));
  }, [form, request]);

  const handleScoreChange = (questionId: number, score: number) => {
    setForm((prev) => {
      const newScores = { ...prev.scores };
      if (newScores[questionId] === score) {
        delete newScores[questionId];
      } else {
        newScores[questionId] = score;
      }
      return { ...prev, scores: newScores };
    });
  };

  const handleNoteChange = (questionId: number, note: string) => {
    setForm((prev) => ({
      ...prev,
      notes: { ...prev.notes, [questionId]: note },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        if (currentUser) {
          localStorage.removeItem(`self_assessment_${currentUser.id}`);
        }
        showDialog('Self-Assessment Submitted', 'Your self-assessment has been saved. You can now compare it with your feedback on the dashboard.');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to submit self-assessment', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto mt-12 bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
        <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-4">Not Logged In</h2>
        <p className="text-stone-600 mb-8">
          You must be logged in to complete a self-assessment.
        </p>
        <Link 
          to="/login" 
          className="inline-flex justify-center items-center rounded-lg border border-transparent bg-stone-900 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-stone-800 transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-8 border-b border-stone-200 pb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Self-Assessment Form</h1>
        <p className="text-stone-600">Reflect on your own performance and identify areas for growth.</p>
      </div>

      {/* Sticky Progress Bar */}
      <div className="sticky top-[64px] z-20 bg-stone-50/95 backdrop-blur-sm py-4 border-b border-stone-200 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-bold text-stone-900">Completion Progress</span>
          <span className="text-sm font-medium text-stone-500">{progress}%</span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-red-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Header Information */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Person Being Reviewed</label>
            <div className="mt-1 p-2 bg-stone-50 rounded-md border border-stone-200 text-stone-900 font-medium">
              {currentUser.name} ({currentUser.role})
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
            />
          </div>
        </section>

        {/* Scale Legend */}
        <section className="bg-stone-100 p-6 rounded-xl border border-stone-200">
          <h3 className="text-sm font-semibold text-stone-900 mb-4 uppercase tracking-wider">Rating Scale</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="font-bold text-red-700 mb-1">1 — Needs Development</div>
              <div className="text-xs text-stone-600">Consistently below the expected standard.</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="font-bold text-orange-600 mb-1">2 — Developing</div>
              <div className="text-xs text-stone-600">Sometimes meets the standard but not yet consistent.</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="font-bold text-emerald-600 mb-1">3 — Meets Expectations</div>
              <div className="text-xs text-stone-600">Reliably performs to GAIL's standard.</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="font-bold text-blue-600 mb-1">4 — Exceeds Expectations</div>
              <div className="text-xs text-stone-600">Role model; consistently goes above and beyond.</div>
            </div>
          </div>
        </section>

        {/* Competencies */}
        <div className="space-y-8">
          {CATEGORIES.map((category) => (
            <section key={category.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
                <h2 className="text-lg font-bold text-stone-900">{category.title}</h2>
              </div>
              <div className="divide-y divide-stone-200">
                {category.questions.map((q) => (
                  <div key={q.id} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 hover:bg-stone-50 transition-colors">
                    <div className="lg:col-span-6">
                      <p className="text-sm text-stone-900 font-medium">
                        <span className="text-stone-500 mr-2">{q.id}.</span>
                        {q.text}
                      </p>
                    </div>
                    <div className="lg:col-span-3 flex items-center justify-between sm:justify-start sm:space-x-4">
                      {[1, 2, 3, 4].map((score) => (
                        <label key={score} className="flex flex-col items-center cursor-pointer group">
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={score}
                            required
                            checked={form.scores[q.id] === score}
                            onClick={() => handleScoreChange(q.id, score)}
                            onChange={() => {}}
                            className="sr-only"
                          />
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                            form.scores[q.id] === score
                              ? "border-red-600 bg-red-600 text-white shadow-md scale-110"
                              : "border-stone-300 bg-white text-stone-500 group-hover:border-red-400 group-hover:text-red-500"
                          )}>
                            <span className="font-semibold">{score}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="lg:col-span-3">
                      <textarea
                        rows={2}
                        placeholder="Notes / Examples (optional)"
                        value={form.notes[q.id] || ''}
                        onChange={(e) => handleNoteChange(q.id, e.target.value)}
                        className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Open-Ended Feedback */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-6">
          <h2 className="text-xl font-bold text-stone-900 mb-6">Open-Ended Feedback</h2>
          
          <div>
            <label className="block text-sm font-medium text-stone-900 mb-2">
              1. What do you do particularly well? What are your key strengths?
            </label>
            <textarea
              required
              rows={4}
              value={form.open_ended_1}
              onChange={(e) => setForm({ ...form, open_ended_1: e.target.value })}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-3 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-900 mb-2">
              2. What is one area where you could improve or develop further?
            </label>
            <textarea
              required
              rows={4}
              value={form.open_ended_2}
              onChange={(e) => setForm({ ...form, open_ended_2: e.target.value })}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-3 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-900 mb-2">
              3. Can you share a specific example of when you positively impacted the team, a customer, or the bakery's performance?
            </label>
            <textarea
              required
              rows={4}
              value={form.open_ended_3}
              onChange={(e) => setForm({ ...form, open_ended_3: e.target.value })}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-3 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-900 mb-2">
              4. Is there anything else you would like to share about your performance?
            </label>
            <textarea
              rows={3}
              value={form.open_ended_4}
              onChange={(e) => setForm({ ...form, open_ended_4: e.target.value })}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-3 border"
            />
          </div>
        </section>

        {/* Overall Assessment */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
          <h2 className="text-xl font-bold text-stone-900 mb-6">Overall Assessment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { val: 1, label: 'Needs Development' },
              { val: 2, label: 'Developing' },
              { val: 3, label: 'Meets Expectations' },
              { val: 4, label: 'Exceeds Expectations' },
            ].map((opt) => (
              <label
                key={opt.val}
                className={cn(
                  "relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-all",
                  form.overall_assessment === opt.val
                    ? "border-red-600 ring-2 ring-red-600 bg-red-50"
                    : "border-stone-300 bg-white hover:bg-stone-50"
                )}
              >
                <input
                  type="radio"
                  name="overall_assessment"
                  value={opt.val}
                  required
                  checked={form.overall_assessment === opt.val}
                  onClick={() => setForm({ ...form, overall_assessment: form.overall_assessment === opt.val ? '' : opt.val })}
                  onChange={() => {}}
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className={cn(
                      "block text-sm font-medium",
                      form.overall_assessment === opt.val ? "text-red-900" : "text-stone-900"
                    )}>
                      {opt.val} — {opt.label}
                    </span>
                  </span>
                </span>
                <CheckCircle2
                  className={cn(
                    "h-5 w-5",
                    form.overall_assessment === opt.val ? "text-red-600" : "invisible"
                  )}
                  aria-hidden="true"
                />
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 px-8 py-4 text-lg font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Self-Assessment'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
