import { Link } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, ArrowRight, Share2, Check, Clock, Users, Lightbulb, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useState, useEffect } from 'react';
import { User, FeedbackRequest } from '../types';
import { motion } from 'motion/react';

export default function Home() {
  const { user } = useAuth();
  const { showDialog } = useDialog();
  const [pendingRequests, setPendingRequests] = useState<FeedbackRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FeedbackRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserToRequest, setSelectedUserToRequest] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [requestingAnonymous, setRequestingAnonymous] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<number | null>(null);

  const fetchRequests = () => {
    if (user) {
      fetch(`/api/feedback-requests/pending/${user.id}`)
        .then(res => res.json())
        .then(setPendingRequests);
      fetch(`/api/feedback-requests/sent/${user.id}`)
        .then(res => res.json())
        .then(setSentRequests);
    }
  };

  useEffect(() => {
    fetchRequests();
    if (user) {
      fetch('/api/users')
        .then(res => res.json())
        .then(setUsers);
    }
  }, [user]);

  const handleSendRequest = async () => {
    if (!selectedUserToRequest) return;
    setRequesting(true);
    try {
      const res = await fetch('/api/feedback-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_id: user?.id, reviewer_id: Number(selectedUserToRequest) })
      });
      if (res.ok) {
        showDialog('Request Sent', 'Your feedback request has been sent successfully.');
        setSelectedUserToRequest('');
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send request');
      }
    } catch (e) {
      alert('Failed to send request');
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelRequest = async (id: number) => {
    try {
      const res = await fetch(`/api/feedback-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showDialog('Request Cancelled', 'The feedback request has been withdrawn.');
        fetchRequests();
      } else {
        alert('Failed to cancel request');
      }
    } catch (e) {
      alert('Failed to cancel request');
    } finally {
      setRequestToCancel(null);
    }
  };

  const handleSendAnonymousRequest = async () => {
    if (!deadline) return;
    setRequestingAnonymous(true);
    try {
      const res = await fetch('/api/anonymous-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_id: user?.id, deadline })
      });
      if (res.ok) {
        showDialog('Campaign Started', 'Anonymous 360 feedback request sent to all staff!');
        setDeadline('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send request');
      }
    } catch (e) {
      alert('Failed to send request');
    } finally {
      setRequestingAnonymous(false);
    }
  };

  const [showerThought, setShowerThought] = useState('');
  const [isAnonymousThought, setIsAnonymousThought] = useState(false);
  const [submittingThought, setSubmittingThought] = useState(false);

  const handleSendShowerThought = async () => {
    if (!showerThought.trim()) return;
    setSubmittingThought(true);
    try {
      const res = await fetch('/api/shower-thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          content: showerThought,
          is_anonymous: isAnonymousThought,
        })
      });
      if (res.ok) {
        showDialog('Thought Shared', 'Your shower thought has been sent successfully.');
        setShowerThought('');
        setIsAnonymousThought(false);
      } else {
        alert('Failed to send shower thought');
      }
    } catch (e) {
      alert('Failed to send shower thought');
    } finally {
      setSubmittingThought(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto mt-12 space-y-12"
    >
      <div className="text-center">
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl mb-4"
        >
          360° Feedback Platform
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-lg text-stone-600 max-w-2xl mx-auto"
        >
          Confidential peer, line manager, and team feedback to support growth and development at GAIL's Marlow.
        </motion.p>
      </div>

      {/* Pending Requests Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center">
          <Clock className="w-6 h-6 mr-2 text-red-600" /> Pending Requests ({pendingRequests.length})
        </h2>
        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center shadow-sm">
            <p className="text-stone-500">You have no pending feedback requests.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRequests.map(req => (
              <Link
                key={req.id}
                to={`/give-feedback?requestId=${req.id}`}
                className="group relative rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 hover:border-red-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
                      {new Date(req.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-900 mb-1">{req.requester_name}</h3>
                  <p className="text-sm text-stone-500 mb-6">{req.requester_role}</p>
                </div>
                <div className="flex items-center text-red-600 font-medium text-sm">
                  Give Feedback <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Sent Requests Section */}
      {sentRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center">
            <Share2 className="w-6 h-6 mr-2 text-blue-600" /> Sent Requests ({sentRequests.length})
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sentRequests.map(req => (
              <div
                key={req.id}
                className="group relative rounded-3xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
                      {new Date(req.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-900 mb-1">Waiting on {req.reviewer_name}</h3>
                  <p className="text-sm text-stone-500 mb-6">{req.reviewer_role}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setRequestToCancel(req.id);
                  }}
                  className="w-full inline-flex justify-center items-center rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel Request
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="grid sm:grid-cols-2 gap-6"
      >

        {requestToCancel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4 mx-auto">
                <X className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-center text-stone-900 mb-2">
                Cancel Request?
              </h3>
              <p className="text-stone-500 text-center mb-6">
                Are you sure you want to withdraw this feedback request? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setRequestToCancel(null)}
                  className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 font-medium transition-colors"
                >
                  Keep It
                </button>
                <button
                  onClick={() => handleCancelRequest(requestToCancel)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  Cancel Request
                </button>
              </div>
            </div>
          </div>
        )}

        <Link
          to="/dashboard"
          className="group relative rounded-3xl border border-stone-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 hover:border-stone-300"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 text-stone-600 mb-6 group-hover:scale-110 transition-transform">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">My Feedback</h2>
          <p className="text-stone-600 mb-6 text-sm">
            Analyse your feedback results, identify strengths, and discover areas for development.
          </p>
          <div className="flex items-center text-stone-900 font-medium text-sm">
            View insights <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-6 group-hover:scale-110 transition-transform">
            <Share2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Request Feedback</h2>
          <p className="text-stone-600 mb-6 text-sm">
            Ask a specific team member to provide feedback on your performance.
          </p>
          <div className="flex flex-col space-y-3">
            <select
              value={selectedUserToRequest}
              onChange={(e) => setSelectedUserToRequest(e.target.value)}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            >
              <option value="">Select a team member...</option>
              {users.filter(u => u.id !== user?.id).map(u => (
                <option key={u.id} value={u.id}>{u.name} - {u.role}</option>
              ))}
            </select>
            <button
              onClick={handleSendRequest}
              disabled={!selectedUserToRequest || requesting}
              className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {requesting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">360° Anonymous Request</h2>
          <p className="text-stone-600 mb-6 text-sm">
            Request anonymous feedback from the entire team. Results are hidden until the deadline.
          </p>
          <div className="flex flex-col space-y-3">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border"
            />
            <button
              onClick={handleSendAnonymousRequest}
              disabled={!deadline || requestingAnonymous}
              className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {requestingAnonymous ? 'Sending...' : 'Send to All Staff'}
            </button>
          </div>
        </div>

        {/* Shower Thoughts Section */}
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 mb-6">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Shower Thoughts</h2>
          <p className="text-stone-600 mb-6 text-sm">
            Have a random idea, suggestion, or thought? Share it with the team!
          </p>
          <div className="flex flex-col space-y-4">
            <textarea
              value={showerThought}
              onChange={(e) => setShowerThought(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              className="block w-full rounded-md border-stone-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm p-3 border resize-none"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm text-stone-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymousThought}
                  onChange={(e) => setIsAnonymousThought(e.target.checked)}
                  className="rounded border-stone-300 text-yellow-600 focus:ring-yellow-500"
                />
                <span>Send anonymously</span>
              </label>
              <button
                onClick={handleSendShowerThought}
                disabled={!showerThought.trim() || submittingThought}
                className="inline-flex justify-center items-center rounded-lg border border-transparent bg-yellow-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {submittingThought ? 'Sending...' : 'Share Thought'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
