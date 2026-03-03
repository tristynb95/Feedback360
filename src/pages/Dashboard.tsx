import React, { useState, useEffect } from 'react';
import { User, Feedback } from '../types';
import { CATEGORIES } from '../constants';
import { Loader2, User as UserIcon, TrendingUp, TrendingDown, MessageSquare, Trash2, ChevronDown, ChevronUp, Archive, ArchiveRestore } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | '' | 'all'>(currentUser?.id || '');
  const [adminTab, setAdminTab] = useState<'my_feedback' | 'team_feedback' | 'team_aggregate' | 'pulse_surveys'>('my_feedback');
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [pulseSurveys, setPulseSurveys] = useState<any[]>([]);
  const [anonymousCampaigns, setAnonymousCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(currentUser?.is_admin ? true : false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'individual'>('summary');
  const [expandedFeedback, setExpandedFeedback] = useState<number | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<{ id: number; step: 1 | 2 } | null>(null);
  const [confirmEndCampaignId, setConfirmEndCampaignId] = useState<number | null>(null);
  const [selectedSelfAssessmentId, setSelectedSelfAssessmentId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterReviewer, setFilterReviewer] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (currentUser?.is_admin) {
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          setUsers(data);
          setLoading(false);
        });
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetch(`/api/anonymous-campaigns/${currentUser.id}`)
        .then(res => res.json())
        .then(setAnonymousCampaigns);
    }
  }, [currentUser]);

  useEffect(() => {
    if (adminTab === 'pulse_surveys') {
      setLoadingFeedback(true);
      fetch('/api/pulse-surveys')
        .then((res) => res.json())
        .then((data) => {
          setPulseSurveys(data);
          setLoadingFeedback(false);
        });
    } else if (selectedUserId) {
      setLoadingFeedback(true);
      const url = selectedUserId === 'all' ? '/api/feedback-all' : `/api/feedback/${selectedUserId}`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          setFeedback(data);
          const selfAssessments = data.filter((f: Feedback) => !f.is_archived && f.reviewer_relationship === 'Self');
          if (selfAssessments.length > 0) {
            setSelectedSelfAssessmentId(selfAssessments[0].id);
          } else {
            setSelectedSelfAssessmentId(null);
          }
          setLoadingFeedback(false);
        });
    } else {
      setFeedback([]);
    }
  }, [selectedUserId, adminTab]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  // Calculate Aggregates
  const calculateAverages = () => {
    let activeFeedback = feedback.filter(f => !f.is_archived && f.reviewer_relationship !== 'Self');

    if (filterMonth !== 'all') {
      activeFeedback = activeFeedback.filter(f => f.date.substring(0, 7) === filterMonth);
    }
    if (filterReviewer !== 'all') {
      activeFeedback = activeFeedback.filter(f => f.reviewer_name === filterReviewer);
    }
    if (filterRole !== 'all') {
      activeFeedback = activeFeedback.filter(f => f.reviewer_relationship === filterRole);
    }

    const selfAssessmentFeedback = selectedSelfAssessmentId 
      ? feedback.find(f => f.id === selectedSelfAssessmentId)
      : feedback.find(f => !f.is_archived && f.reviewer_relationship === 'Self');
    
    if (activeFeedback.length === 0 && !selfAssessmentFeedback) return null;

    const categoryScores: Record<string, { total: number; count: number }> = {};
    const questionScores: Record<number, { total: number; count: number }> = {};
    let overallTotal = 0;
    let overallCount = 0;

    const selfCategoryScores: Record<string, { total: number; count: number }> = {};

    CATEGORIES.forEach((cat) => {
      categoryScores[cat.id] = { total: 0, count: 0 };
      selfCategoryScores[cat.id] = { total: 0, count: 0 };
      cat.questions.forEach((q) => {
        questionScores[q.id] = { total: 0, count: 0 };
      });
    });

    activeFeedback.forEach((f) => {
      if (f.overall_assessment) {
        overallTotal += Number(f.overall_assessment);
        overallCount++;
      }

      Object.entries(f.scores).forEach(([qIdStr, score]) => {
        const qId = Number(qIdStr);
        if (questionScores[qId]) {
          questionScores[qId].total += Number(score);
          questionScores[qId].count++;
        }
      });
    });

    if (selfAssessmentFeedback) {
      Object.entries(selfAssessmentFeedback.scores).forEach(([qIdStr, score]) => {
        const qId = Number(qIdStr);
        const cat = CATEGORIES.find(c => c.questions.some(q => q.id === qId));
        if (cat) {
          selfCategoryScores[cat.id].total += Number(score);
          selfCategoryScores[cat.id].count++;
        }
      });
    }

    CATEGORIES.forEach((cat) => {
      cat.questions.forEach((q) => {
        if (questionScores[q.id].count > 0) {
          categoryScores[cat.id].total += questionScores[q.id].total / questionScores[q.id].count;
          categoryScores[cat.id].count++;
        }
      });
    });

    const radarData = CATEGORIES.map((cat) => {
      let catTotal = 0;
      let catCount = 0;
      cat.questions.forEach(q => {
        if (questionScores[q.id] && questionScores[q.id].count > 0) {
          catTotal += questionScores[q.id].total / questionScores[q.id].count;
          catCount++;
        }
      });
      
      const selfScore = selfCategoryScores[cat.id].count > 0 
        ? Number((selfCategoryScores[cat.id].total / selfCategoryScores[cat.id].count).toFixed(1)) 
        : null;

      return {
        subject: cat.title.split(' ')[0], // Shorten for radar chart
        fullTitle: cat.title,
        score: catCount > 0 ? Number((catTotal / catCount).toFixed(1)) : 0,
        selfScore: selfScore !== null ? selfScore : 0,
        fullMark: 4,
      };
    });

    // Find top strengths and areas for improvement
    const allQuestionAverages = Object.entries(questionScores)
      .filter(([_, data]) => data.count > 0)
      .map(([id, data]) => ({
        id: Number(id),
        score: data.total / data.count,
      }))
      .sort((a, b) => b.score - a.score);

    const topStrengths = allQuestionAverages.slice(0, 3).map(qa => {
      const q = CATEGORIES.flatMap(c => c.questions).find(q => q.id === qa.id);
      return { ...q, score: qa.score };
    });

    const areasForImprovement = allQuestionAverages.slice(-3).reverse().map(qa => {
      const q = CATEGORIES.flatMap(c => c.questions).find(q => q.id === qa.id);
      return { ...q, score: qa.score };
    });

    // Calculate Progress Data
    let progressFeedback = feedback.filter(f => !f.is_archived);
    if (filterReviewer !== 'all') {
      progressFeedback = progressFeedback.filter(f => f.reviewer_name === filterReviewer || f.reviewer_relationship === 'Self');
    }
    if (filterRole !== 'all') {
      progressFeedback = progressFeedback.filter(f => f.reviewer_relationship === filterRole || f.reviewer_relationship === 'Self');
    }

    const progressByMonth: Record<string, { peerTotal: number; peerCount: number; selfTotal: number; selfCount: number }> = {};

    progressFeedback.forEach(f => {
      const month = f.date.substring(0, 7);
      if (!progressByMonth[month]) {
        progressByMonth[month] = { peerTotal: 0, peerCount: 0, selfTotal: 0, selfCount: 0 };
      }
      
      if (f.overall_assessment) {
        if (f.reviewer_relationship === 'Self') {
          progressByMonth[month].selfTotal += Number(f.overall_assessment);
          progressByMonth[month].selfCount++;
        } else {
          progressByMonth[month].peerTotal += Number(f.overall_assessment);
          progressByMonth[month].peerCount++;
        }
      }
    });

    const progressData = Object.entries(progressByMonth)
      .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
      .map(([month, data]) => {
        const date = new Date(month + '-01');
        return {
          month: date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          peerScore: data.peerCount > 0 ? Number((data.peerTotal / data.peerCount).toFixed(1)) : null,
          selfScore: data.selfCount > 0 ? Number((data.selfTotal / data.selfCount).toFixed(1)) : null,
        };
      });

    return {
      radarData,
      overallAverage: overallCount > 0 ? (overallTotal / overallCount).toFixed(1) : 'N/A',
      topStrengths,
      areasForImprovement,
      totalReviews: activeFeedback.length,
      hasPeerFeedback: activeFeedback.length > 0,
      hasSelfFeedback: !!selfAssessmentFeedback,
      progressData,
    };
  };

  const stats = calculateAverages();

  const handleDeleteFeedback = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback(prev => prev.filter(f => f.id !== id));
      } else {
        alert('Failed to delete feedback');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
    } finally {
      setDeletingId(null);
      setDeletePrompt(null);
    }
  };

  const handleArchiveFeedback = async (id: number, currentStatus: boolean) => {
    setArchivingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: !currentStatus }),
      });
      if (res.ok) {
        setFeedback(prev => prev.map(f => f.id === id ? { ...f, is_archived: currentStatus ? 0 : 1 } : f));
      } else {
        alert('Failed to update feedback archive status');
      }
    } catch (error) {
      console.error('Error archiving feedback:', error);
    } finally {
      setArchivingId(null);
    }
  };

  const handleEndCampaignEarly = async (id: number) => {
    try {
      const res = await fetch(`/api/anonymous-campaigns/${id}/end`, { method: 'PATCH' });
      if (res.ok) {
        setConfirmEndCampaignId(null);
        // Refresh campaigns and feedback
        if (currentUser) {
          fetch(`/api/anonymous-campaigns/${currentUser.id}`)
            .then(res => res.json())
            .then(setAnonymousCampaigns);
          
          if (selectedUserId) {
            setLoadingFeedback(true);
            const url = selectedUserId === 'all' ? '/api/feedback-all' : `/api/feedback/${selectedUserId}`;
            fetch(url)
              .then((res) => res.json())
              .then((data) => {
                setFeedback(data);
                setLoadingFeedback(false);
              });
          }
        }
      } else {
        alert('Failed to end campaign early');
      }
    } catch (error) {
      console.error('Error ending campaign:', error);
    }
  };

  const availableMonths = Array.from(new Set(feedback.filter(f => !f.is_archived && f.reviewer_relationship !== 'Self').map(f => f.date.substring(0, 7)))).sort().reverse();
  const availableReviewers = Array.from(new Set(feedback.filter(f => !f.is_archived && f.reviewer_relationship !== 'Self').map(f => f.reviewer_name))).sort();
  const availableRoles = Array.from(new Set(feedback.filter(f => !f.is_archived && f.reviewer_relationship !== 'Self').map(f => f.reviewer_relationship))).sort();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto"
    >
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            {currentUser?.is_admin ? 'Feedback Dashboard' : 'My Feedback'}
          </h1>
          <p className="text-stone-600">Analyze 360° feedback results and identify development areas.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {currentUser?.is_admin && selectedUserId && selectedUserId !== 'all' && (
            <div className="flex bg-stone-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'summary' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setViewMode('individual')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'individual' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                Individual
              </button>
            </div>
          )}

          {currentUser?.is_admin && adminTab === 'team_feedback' && (
            <div className="w-full sm:w-64">
              <label className="sr-only">Select Team Member</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-stone-400" />
                </div>
                <select
                  value={selectedUserId === 'all' ? '' : selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                  className="block w-full pl-10 pr-3 py-2 border border-stone-300 rounded-md leading-5 bg-white shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                >
                  <option value="">Select a team member...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} - {u.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {currentUser?.is_admin && (
        <div className="mb-8 border-b border-stone-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setAdminTab('my_feedback');
                setSelectedUserId(currentUser.id);
                setViewMode('summary');
              }}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                adminTab === 'my_feedback'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
              }`}
            >
              My Feedback
            </button>
            <button
              onClick={() => {
                setAdminTab('team_feedback');
                setSelectedUserId('');
                setViewMode('summary');
              }}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                adminTab === 'team_feedback'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
              }`}
            >
              Team Feedback
            </button>
            <button
              onClick={() => {
                setAdminTab('team_aggregate');
                setSelectedUserId('all');
                setViewMode('summary');
              }}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                adminTab === 'team_aggregate'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
              }`}
            >
              Team Aggregate
            </button>
            <button
              onClick={() => {
                setAdminTab('pulse_surveys');
                setSelectedUserId('');
              }}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                adminTab === 'pulse_surveys'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
              }`}
            >
              Pulse Surveys
            </button>
          </nav>
        </div>
      )}

      {adminTab === 'pulse_surveys' ? (
        loadingFeedback ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-stone-200 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
          </div>
        ) : pulseSurveys.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-sm">
            <h3 className="text-lg font-medium text-stone-900 mb-1">No pulse surveys available</h3>
            <p className="text-stone-500">The team hasn't submitted any pulse surveys yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-200 to-stone-300"></div>
              <div className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Total Submissions</div>
              <div className="text-6xl font-black text-stone-800 tracking-tight">{pulseSurveys.length}</div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-stone-200 bg-stone-50/80">
                <h3 className="text-lg font-bold text-stone-900">Recent Pulse Surveys</h3>
              </div>
              <div className="divide-y divide-stone-100">
                {pulseSurveys.map((survey, i) => (
                  <div key={i} className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm font-bold text-stone-900">{new Date(survey.date).toLocaleDateString('en-GB')}</div>
                      <div className="flex space-x-2">
                        {survey.role && <div className="text-xs font-medium text-stone-600 bg-stone-100 px-2 py-1 rounded-md">{survey.role}</div>}
                        {survey.tenure && <div className="text-xs font-medium text-stone-600 bg-stone-100 px-2 py-1 rounded-md">{survey.tenure}</div>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {survey.open_ended_1 && (
                        <div>
                          <div className="text-xs font-bold text-stone-500 uppercase mb-1">Going Well</div>
                          <p className="text-sm text-stone-700">"{survey.open_ended_1}"</p>
                        </div>
                      )}
                      {survey.open_ended_2 && (
                        <div>
                          <div className="text-xs font-bold text-stone-500 uppercase mb-1">Could Be Better</div>
                          <p className="text-sm text-stone-700">"{survey.open_ended_2}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : !selectedUserId ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-4">
            <UserIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-stone-900 mb-1">No team member selected</h3>
          <p className="text-stone-500">Select a team member from the dropdown above to view their feedback dashboard.</p>
        </div>
      ) : loadingFeedback ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-stone-200 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
        </div>
      ) : feedback.length === 0 ? (
        <div className="space-y-6">
          {adminTab === 'my_feedback' && anonymousCampaigns.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-stone-900 mb-4">My 360° Anonymous Campaigns</h3>
              <div className="space-y-4">
                {anonymousCampaigns.map(campaign => {
                  const today = new Date().toISOString().split('T')[0];
                  const isExpired = campaign.deadline < today;
                  return (
                    <div key={campaign.id} className="border border-stone-200 rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-stone-900">Deadline: {new Date(campaign.deadline).toLocaleDateString('en-GB')}</div>
                        <div className="text-xs text-stone-500 mt-1">
                          {isExpired ? 'Campaign ended. Feedback is now visible below.' : `${campaign.completed_requests} of ${campaign.total_requests} completed`}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {!isExpired && (
                          confirmEndCampaignId === campaign.id ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEndCampaignEarly(campaign.id)}
                                className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded transition-colors"
                              >
                                Confirm End
                              </button>
                              <button
                                onClick={() => setConfirmEndCampaignId(null)}
                                className="text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmEndCampaignId(campaign.id)}
                              className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                            >
                              End Early
                            </button>
                          )
                        )}
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isExpired ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                          {isExpired ? 'Completed' : 'In Progress'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-1">No feedback available</h3>
            <p className="text-stone-500">
              {selectedUserId === 'all' ? "The team hasn't received any feedback yet." : "This team member hasn't received any feedback yet."}
            </p>
          </div>
        </div>
      ) : viewMode === 'summary' ? (
        stats ? (
          <div className="space-y-6">
            {adminTab === 'my_feedback' && anonymousCampaigns.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-stone-900 mb-4">My 360° Anonymous Campaigns</h3>
                <div className="space-y-4">
                  {anonymousCampaigns.map(campaign => {
                    const today = new Date().toISOString().split('T')[0];
                    const isExpired = campaign.deadline < today;
                    return (
                      <div key={campaign.id} className="border border-stone-200 rounded-xl p-4 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-bold text-stone-900">Deadline: {new Date(campaign.deadline).toLocaleDateString('en-GB')}</div>
                          <div className="text-xs text-stone-500 mt-1">
                            {isExpired ? 'Campaign ended. Feedback is now visible below.' : `${campaign.completed_requests} of ${campaign.total_requests} completed`}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {!isExpired && (
                            confirmEndCampaignId === campaign.id ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEndCampaignEarly(campaign.id)}
                                  className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded transition-colors"
                                >
                                  Confirm End
                                </button>
                                <button
                                  onClick={() => setConfirmEndCampaignId(null)}
                                  className="text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmEndCampaignId(campaign.id)}
                                className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                              >
                                End Early
                              </button>
                            )
                          )}
                          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isExpired ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                            {isExpired ? 'Completed' : 'In Progress'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Advanced Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-6"
            >
              <h3 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wider">Advanced Filters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Month</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border bg-stone-50"
                  >
                    <option value="all">All Months</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Reviewer</label>
                  <select
                    value={filterReviewer}
                    onChange={(e) => setFilterReviewer(e.target.value)}
                    className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border bg-stone-50"
                  >
                    <option value="all">All Reviewers</option>
                    {availableReviewers.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Reviewer Role</label>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="block w-full rounded-md border-stone-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border bg-stone-50"
                  >
                    <option value="all">All Roles</option>
                    {availableRoles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Top Stats Row */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-200 to-stone-300"></div>
                <div className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Total Reviews</div>
                <div className="text-6xl font-black text-stone-800 tracking-tight">{stats.totalReviews}</div>
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-orange-400"></div>
                <div className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Overall Assessment</div>
                <div className="text-6xl font-black text-red-600 tracking-tight">{stats.overallAverage}</div>
                <div className="text-sm font-medium text-stone-400 mt-2">out of 4.0</div>
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-200 to-stone-300"></div>
                <div className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Reviewer Breakdown</div>
                <div className="space-y-3">
                  {Object.entries(
                    feedback
                      .filter(f => !f.is_archived && f.reviewer_relationship !== 'Self')
                      .filter(f => filterMonth === 'all' || f.date.substring(0, 7) === filterMonth)
                      .filter(f => filterReviewer === 'all' || f.reviewer_name === filterReviewer)
                      .filter(f => filterRole === 'all' || f.reviewer_relationship === filterRole)
                      .reduce((acc, curr) => {
                        acc[curr.reviewer_relationship] = (acc[curr.reviewer_relationship] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                  ).map(([rel, count]) => (
                    <div key={rel} className="flex justify-between items-center text-sm">
                      <span className="text-stone-600 font-medium">{rel}</span>
                      <span className="font-bold bg-stone-100 px-2.5 py-1 rounded-md text-stone-700">{count}</span>
                    </div>
                  ))}
                  {feedback
                    .filter(f => !f.is_archived && f.reviewer_relationship !== 'Self')
                    .filter(f => filterMonth === 'all' || f.date.substring(0, 7) === filterMonth)
                    .filter(f => filterReviewer === 'all' || f.reviewer_name === filterReviewer)
                    .filter(f => filterRole === 'all' || f.reviewer_relationship === filterRole)
                    .length === 0 && (
                    <div className="text-sm text-stone-500 italic">No peer reviews yet</div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="space-y-6"
            >
              {/* Radar Chart */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h3 className="text-lg font-bold text-stone-900 flex items-center">
                    <span className="w-2 h-6 bg-red-500 rounded-full mr-3"></span>
                    Competency Overview
                  </h3>
                  {feedback.filter(f => !f.is_archived && f.reviewer_relationship === 'Self').length > 0 && (
                    <div className="relative w-full sm:w-auto">
                      <select
                        value={selectedSelfAssessmentId || ''}
                        onChange={(e) => setSelectedSelfAssessmentId(Number(e.target.value))}
                        className="appearance-none w-full sm:w-auto bg-stone-50 border border-stone-200 text-stone-700 py-1.5 pl-3 pr-8 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm font-medium transition-colors cursor-pointer hover:bg-stone-100"
                      >
                        <option value="" disabled>Select Self-Assessment</option>
                        {feedback
                          .filter(f => !f.is_archived && f.reviewer_relationship === 'Self')
                          .map(f => (
                            <option key={f.id} value={f.id}>
                              Self-Assessment ({new Date(f.date).toLocaleDateString('en-GB')})
                            </option>
                          ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-full h-[400px] sm:h-[500px] -ml-4 sm:ml-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.radarData}>
                      <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#57534e', fontSize: 11, fontWeight: 500 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 4]} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                      {stats.hasPeerFeedback ? (
                        <Radar
                          name="Peer Score"
                          dataKey="score"
                          stroke="#dc2626"
                          strokeWidth={2}
                          fill="#ef4444"
                          fillOpacity={0.4}
                        />
                      ) : null}
                      {stats.hasSelfFeedback ? (
                        <Radar
                          name="Self Score"
                          dataKey="selfScore"
                          stroke="#2563eb"
                          strokeWidth={2}
                          fill="#3b82f6"
                          fillOpacity={0.4}
                        />
                      ) : null}
                      <Tooltip 
                        formatter={(value: number, name: string) => [value, name]}
                        labelFormatter={(label) => stats.radarData.find(d => d.subject === label)?.fullTitle || label}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-4 border border-emerald-100">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-900">Top Strengths</h3>
                  </div>
                  <div className="space-y-5">
                    {stats.topStrengths.map((q, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-stone-700 pr-4">{q?.text}</p>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                            {q?.score.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${((q?.score || 0) / 4) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                    {stats.topStrengths.length === 0 && (
                      <div className="text-sm text-stone-500 italic">Not enough peer feedback yet.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mr-4 border border-orange-100">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-900">Areas for Improvement</h3>
                  </div>
                  <div className="space-y-5">
                    {stats.areasForImprovement.map((q, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-stone-700 pr-4">{q?.text}</p>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-100 text-orange-800 whitespace-nowrap">
                            {q?.score.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1.5">
                          <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${((q?.score || 0) / 4) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                    {stats.areasForImprovement.length === 0 && (
                      <div className="text-sm text-stone-500 italic">Not enough peer feedback yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Progress Over Time */}
            {stats.progressData && stats.progressData.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
              >
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mr-4 border border-blue-100">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">Progress Over Time</h3>
                </div>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.progressData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fill: '#57534e', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 4]} tick={{ fill: '#57534e', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="peerScore" name="Peer Score" stroke="#dc2626" strokeWidth={3} dot={{ r: 4, fill: '#dc2626' }} activeDot={{ r: 6 }} connectNulls />
                      <Line type="monotone" dataKey="selfScore" name="Self Score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Open Ended Feedback */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
            >
              <div className="px-8 py-5 border-b border-stone-200 bg-stone-50/80">
                <h3 className="text-lg font-bold text-stone-900 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-3 text-stone-400" />
                  Open-Ended Feedback
                </h3>
              </div>
              <div className="divide-y divide-stone-100">
                {[
                  { key: 'open_ended_1', title: 'What does this person do particularly well? What are their key strengths?' },
                  { key: 'open_ended_2', title: 'What is one area where this person could improve or develop further?' },
                  { key: 'open_ended_3', title: 'Can you share a specific example of when this person positively impacted the team, a customer, or the bakery\'s performance?' },
                  { key: 'open_ended_4', title: 'Is there anything else you would like to share about working with this person?' },
                ].map((section) => (
                  <div key={section.key} className="p-8">
                    <h4 className="text-sm font-bold text-stone-800 mb-6">{section.title}</h4>
                    <div className="space-y-4">
                      {feedback
                        .filter(f => !f.is_archived)
                        .filter(f => filterMonth === 'all' || f.date.substring(0, 7) === filterMonth)
                        .filter(f => filterReviewer === 'all' || f.reviewer_name === filterReviewer)
                        .filter(f => filterRole === 'all' || f.reviewer_relationship === filterRole)
                        .map((f, i) => {
                        const text = f[section.key as keyof Feedback];
                        if (!text) return null;
                        return (
                          <div key={i} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative">
                            <div className="absolute top-5 right-5 flex space-x-2">
                              {selectedUserId === 'all' && (
                                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-1 rounded-md">
                                  For: {users.find(u => u.id === f.reviewee_id)?.name || 'Unknown'}
                                </div>
                              )}
                              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-1 rounded-md">
                                {f.reviewer_relationship}
                              </div>
                            </div>
                            <p className="text-stone-600 text-sm leading-relaxed pr-24">"{text}"</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-4">
              <Archive className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-1">All feedback is archived</h3>
            <p className="text-stone-500">Switch to the Individual view to see archived feedback.</p>
          </div>
        )
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-4"
        >
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-900 mb-6">Individual Feedback Responses</h3>
              <div className="space-y-4">
                {feedback
                  .filter(f => filterMonth === 'all' || f.date.substring(0, 7) === filterMonth)
                  .filter(f => filterReviewer === 'all' || f.reviewer_name === filterReviewer)
                  .filter(f => filterRole === 'all' || f.reviewer_relationship === filterRole)
                  .map((f) => (
                  <div key={f.id} className={`border ${f.is_archived ? 'border-stone-200 opacity-60 bg-stone-50' : 'border-stone-200 bg-white'} rounded-xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md`}>
                    <div 
                      className={`px-5 py-4 flex items-center justify-between cursor-pointer transition-colors ${f.is_archived ? 'hover:bg-stone-100' : 'hover:bg-stone-50'}`}
                      onClick={() => setExpandedFeedback(expandedFeedback === f.id ? null : f.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-bold text-stone-900 flex items-center">
                          {f.reviewer_name}
                          {f.is_archived ? <span className="ml-3 text-[10px] font-bold uppercase tracking-wider bg-stone-200 text-stone-500 px-2 py-0.5 rounded-md">Archived</span> : null}
                        </div>
                        <div className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md">{f.reviewer_relationship}</div>
                        <div className="text-xs font-medium text-stone-400">{new Date(f.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveFeedback(f.id, !!f.is_archived);
                          }}
                          disabled={archivingId === f.id}
                          className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-full transition-colors"
                          title={f.is_archived ? "Restore this response" : "Archive this response (exclude from summary)"}
                        >
                          {archivingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : f.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletePrompt({ id: f.id, step: 1 });
                          }}
                          disabled={deletingId === f.id}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Permanently delete this response"
                        >
                          {deletingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                        <div className="w-px h-6 bg-stone-200 mx-1"></div>
                        <div className="p-1">
                          {expandedFeedback === f.id ? <ChevronUp className="w-5 h-5 text-stone-400" /> : <ChevronDown className="w-5 h-5 text-stone-400" />}
                        </div>
                      </div>
                    </div>
                    {expandedFeedback === f.id && (
                      <div className="p-6 bg-stone-50/50 border-t border-stone-100 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-4">Competency Scores</h4>
                            <div className="space-y-4">
                              {CATEGORIES.map(cat => (
                                <div key={cat.id} className="space-y-2">
                                  <div className="text-xs font-bold text-stone-800 border-b border-stone-100 pb-1">{cat.title}</div>
                                  {cat.questions.map(q => (
                                    <div key={q.id} className="flex justify-between items-center text-xs pl-2 py-0.5">
                                      <span className="text-stone-600 pr-4">{q.text}</span>
                                      <span className="font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">{f.scores[q.id] || '-'}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Overall Assessment</h4>
                              <div className="text-3xl font-black text-red-600">{f.overall_assessment || '-'} <span className="text-sm text-stone-400 font-medium">/ 4.0</span></div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-4">Written Notes</h4>
                              <div className="space-y-2">
                                {CATEGORIES.map(cat => f.notes[cat.id] && (
                                  <div key={cat.id} className="text-xs">
                                    <span className="font-semibold text-stone-700">{cat.title}: </span>
                                    <span className="text-stone-600 italic">"{f.notes[cat.id]}"</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-stone-100">
                          <h4 className="text-xs font-bold text-stone-500 uppercase mb-3">Open-Ended Responses</h4>
                          <div className="space-y-4">
                            {[
                              { key: 'open_ended_1', title: 'Strengths' },
                              { key: 'open_ended_2', title: 'Improvements' },
                              { key: 'open_ended_3', title: 'Example' },
                              { key: 'open_ended_4', title: 'Other' },
                            ].map(section => f[section.key as keyof Feedback] && (
                              <div key={section.key}>
                                <div className="text-xs font-semibold text-stone-700 mb-1">{section.title}</div>
                                <p className="text-sm text-stone-600 italic bg-stone-50 p-3 rounded border border-stone-100">"{f[section.key as keyof Feedback]}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
      )}

      {deletePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-stone-900 mb-2">
              {deletePrompt.step === 1 ? 'Delete Feedback?' : 'Permanent Deletion Warning'}
            </h3>
            <p className="text-stone-500 text-center mb-6">
              {deletePrompt.step === 1 
                ? 'Are you sure you want to delete this specific feedback response?' 
                : 'WARNING: This action is permanent and cannot be undone. Are you absolutely sure?'}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeletePrompt(null)}
                className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deletePrompt.step === 1) {
                    setDeletePrompt({ id: deletePrompt.id, step: 2 });
                  } else {
                    handleDeleteFeedback(deletePrompt.id);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                {deletePrompt.step === 1 ? 'Yes, Delete' : 'Yes, Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
