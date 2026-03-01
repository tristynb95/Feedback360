import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Lightbulb, User as UserIcon, Clock } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface ShowerThought {
  id: number;
  user_id: number | null;
  user_name: string | null;
  content: string;
  is_anonymous: number;
  created_at: string;
}

export default function ShowerThoughts() {
  const { user } = useAuth();
  const [thoughts, setThoughts] = useState<ShowerThought[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.is_admin) {
      fetch('/api/shower-thoughts')
        .then(res => res.json())
        .then(data => {
          setThoughts(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch shower thoughts', err);
          setLoading(false);
        });
    }
  }, [user]);

  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2 flex items-center">
            <Lightbulb className="w-8 h-8 mr-3 text-yellow-500" />
            Shower Thoughts
          </h1>
          <p className="text-stone-600">View ideas and suggestions submitted by the team.</p>
        </div>
      </div>

      {thoughts.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-4">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-stone-900 mb-1">No thoughts yet</h3>
          <p className="text-stone-500">When team members submit shower thoughts, they will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {thoughts.map(thought => (
            <div key={thought.id} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                    {thought.is_anonymous ? <UserIcon className="w-5 h-5" /> : <span className="font-bold text-sm">{thought.user_name?.charAt(0) || '?'}</span>}
                  </div>
                  <div>
                    <div className="font-bold text-stone-900">
                      {thought.is_anonymous ? 'Anonymous' : thought.user_name}
                    </div>
                    <div className="text-xs text-stone-500 flex items-center mt-0.5">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(thought.created_at).toLocaleString('en-GB')}
                    </div>
                  </div>
                </div>
                {thought.is_anonymous ? (
                  <span className="px-2.5 py-1 bg-stone-100 text-stone-600 text-xs font-medium rounded-full">
                    Anonymous
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    Identified
                  </span>
                )}
              </div>
              <div className="text-stone-800 whitespace-pre-wrap pl-13">
                {thought.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
