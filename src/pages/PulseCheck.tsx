import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PULSE_CATEGORIES } from '../constants';
import { Loader2, CheckCircle2, AlertCircle, User as UserIcon, ChevronDown } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

export default function PulseCheck() {
  const navigate = useNavigate();
  const { showDialog } = useDialog();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('pulse_check_form');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      role: '',
      tenure: '',
      scores: {} as Record<number, number>,
      open_ended_1: '',
      open_ended_2: '',
      open_ended_3: '',
      open_ended_4: '',
      enps_score: null as number | null,
    };
  });

  React.useEffect(() => {
    localStorage.setItem('pulse_check_form', JSON.stringify(formData));
  }, [formData]);

  const handleScoreChange = (questionId: number, score: number) => {
    setFormData(prev => {
      const newScores = { ...prev.scores };
      if (newScores[questionId] === score) {
        delete newScores[questionId];
      } else {
        newScores[questionId] = score;
      }
      return { ...prev, scores: newScores };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all questions have been answered
    const totalQuestions = PULSE_CATEGORIES.reduce((acc, cat) => acc + cat.questions.length, 0);
    if (Object.keys(formData.scores).length < totalQuestions) {
      setError('Please answer all the scaled questions before submitting.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (formData.enps_score === null) {
      setError('Please provide an answer for the final recommendation question.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/pulse-surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Failed to submit survey');

      localStorage.removeItem('pulse_check_form');
      showDialog('Thank you for your feedback!', 'Your responses have been recorded anonymously. Your honesty helps us build a better bakery.');
      navigate('/');
    } catch (err) {
      setError('An error occurred while submitting your survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2 uppercase tracking-tight">Team Pulse Check</h1>
        <p className="text-stone-500 italic">Quick, confidential, and your honest voice matters.</p>
      </div>

      <div className="bg-stone-100 rounded-xl p-6 mb-8 border border-stone-200">
        <ul className="space-y-2 text-sm text-stone-700">
          <li><strong className="text-stone-900">What is this?</strong> A short, anonymous survey to find out how you're really feeling about working here. No names, no judgement — just honest feedback so we can make things better together.</li>
          <li><strong className="text-stone-900">How long will it take?</strong> About 3–5 minutes.</li>
          <li><strong className="text-stone-900">How to respond:</strong> Select the option that best matches how you feel for each statement, then answer the short questions at the end.</li>
        </ul>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Optional Info */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900">Optional Information</h3>
              <p className="text-sm text-stone-500 mt-1">Only complete if you're comfortable doing so.</p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 text-stone-400">
              <UserIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-stone-900">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="block w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow bg-stone-50 focus:bg-white outline-none"
                placeholder="e.g. Barista, Head Baker"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-stone-900">How long have you worked here?</label>
              <div className="relative">
                <select
                  value={formData.tenure}
                  onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
                  className="block w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow bg-stone-50 focus:bg-white appearance-none outline-none"
                >
                  <option value="" disabled>Select your tenure...</option>
                  <option value="Less than 6 months">Less than 6 months</option>
                  <option value="6 months to 1 year">6 months to 1 year</option>
                  <option value="1-3 years">1-3 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="5+ years">5+ years</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scaled Questions */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-stone-200 bg-stone-50/80 flex justify-between items-end">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Statements</h3>
            <div className="hidden md:flex space-x-4 text-[10px] font-bold uppercase tracking-wider text-stone-500 w-[300px] justify-between px-4">
              <span className="w-10 text-center">Strongly Disagree</span>
              <span className="w-10 text-center">Disagree</span>
              <span className="w-10 text-center">Neutral</span>
              <span className="w-10 text-center">Agree</span>
              <span className="w-10 text-center">Strongly Agree</span>
            </div>
          </div>
          
          <div className="divide-y divide-stone-100">
            {PULSE_CATEGORIES.map((category) => (
              <div key={category.id} className="p-8">
                <h4 className="text-sm font-bold text-stone-800 mb-6 flex items-center">
                  {category.title}
                </h4>
                <div className="space-y-6">
                  {category.questions.map((q) => (
                    <div key={q.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <p className="text-sm text-stone-700 font-medium md:w-[calc(100%-320px)]">{q.id}. {q.text}</p>
                      
                      <div className="flex justify-between md:w-[300px] bg-stone-50 md:bg-transparent p-2 md:p-0 rounded-lg">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <label key={score} className="flex flex-col items-center cursor-pointer group">
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              value={score}
                              checked={formData.scores[q.id] === score}
                              onClick={() => handleScoreChange(q.id, score)}
                              onChange={() => {}}
                              className="sr-only"
                            />
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                              formData.scores[q.id] === score
                                ? 'border-red-600 bg-red-600 text-white shadow-md scale-110'
                                : 'border-stone-300 bg-white text-stone-300 group-hover:border-red-400'
                            }`}>
                              {score === 1 && '😡'}
                              {score === 2 && '🙁'}
                              {score === 3 && '😐'}
                              {score === 4 && '🙂'}
                              {score === 5 && '🤩'}
                            </div>
                            <span className="text-[10px] text-stone-500 mt-1 md:hidden">
                              {score === 1 && 'Strongly Disagree'}
                              {score === 5 && 'Strongly Agree'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Open Ended */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-stone-200 bg-stone-50/80">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Your Voice</h3>
            <p className="text-xs text-stone-500 mt-1">Short answers are fine — a single sentence or a few bullet points is plenty.</p>
          </div>
          <div className="p-8 space-y-8">
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-2">What's going well right now? What do you want us to keep doing?</label>
              <textarea
                rows={3}
                value={formData.open_ended_1}
                onChange={(e) => setFormData({ ...formData, open_ended_1: e.target.value })}
                className="block w-full border-stone-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-2">What's one thing that could be better about working here?</label>
              <textarea
                rows={3}
                value={formData.open_ended_2}
                onChange={(e) => setFormData({ ...formData, open_ended_2: e.target.value })}
                className="block w-full border-stone-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-2">Is there anything you'd like to see introduced or changed? (e.g., training, rotas, communication, equipment)</label>
              <textarea
                rows={3}
                value={formData.open_ended_3}
                onChange={(e) => setFormData({ ...formData, open_ended_3: e.target.value })}
                className="block w-full border-stone-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-2">Is there anything you're worried about or want to flag? (e.g., safety, workload, team issues)</label>
              <textarea
                rows={3}
                value={formData.open_ended_4}
                onChange={(e) => setFormData({ ...formData, open_ended_4: e.target.value })}
                className="block w-full border-stone-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* eNPS */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-stone-200 bg-stone-50/80">
            <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">One Final Question</h3>
          </div>
          <div className="p-8">
            <label className="block text-base font-bold text-stone-800 mb-6 text-center">
              On a scale of 0–10, how likely are you to recommend GAIL's as a place to work to a friend?
            </label>
            
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setFormData({ ...formData, enps_score: score })}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-lg font-bold transition-all duration-200 flex items-center justify-center ${
                    formData.enps_score === score
                      ? 'bg-red-600 text-white shadow-md scale-110 border-2 border-red-700'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs font-medium text-stone-500 max-w-2xl mx-auto px-2">
              <span>Not at all likely</span>
              <span>Extremely likely</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Pulse Check'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
