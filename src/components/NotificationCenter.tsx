import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function NotificationCenter({ placement = 'bottom-right' }: { placement?: 'bottom-right' | 'right-bottom' | 'top-right' | 'top-center' }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user || !user.id) return;
    try {
      const res = await fetch(`/api/notifications/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      } else {
        console.error('Failed to fetch notifications', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || !user.id) return;
    try {
      await fetch(`/api/notifications/read-all/${user.id}`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className={cn(
          "absolute bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden z-50 animate-in fade-in duration-200 w-80 sm:w-96",
          placement === 'bottom-right' && "right-0 mt-2 slide-in-from-top-2",
          placement === 'right-bottom' && "left-full ml-2 bottom-0 slide-in-from-left-2",
          placement === 'top-right' && "right-0 bottom-full mb-2 slide-in-from-bottom-2",
          placement === 'top-center' && "left-1/2 -translate-x-1/2 bottom-full mb-2 slide-in-from-bottom-2"
        )}>
          <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
            <h3 className="font-semibold text-stone-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors flex items-center"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                <Bell className="w-8 h-8 mx-auto mb-3 text-stone-300" />
                <p className="text-sm">You have no notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 transition-colors hover:bg-stone-50",
                      !notification.is_read ? "bg-stone-50/50" : ""
                    )}
                    onClick={() => {
                      if (!notification.is_read) markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                  >
                    {notification.link ? (
                      <Link to={notification.link} className="block">
                        <NotificationContent notification={notification} />
                      </Link>
                    ) : (
                      <div className="cursor-default">
                        <NotificationContent notification={notification} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationContent({ notification }: { notification: Notification }) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        "w-2 h-2 mt-2 rounded-full flex-shrink-0",
        !notification.is_read ? "bg-red-500" : "bg-transparent"
      )} />
      <div>
        <p className={cn(
          "text-sm",
          !notification.is_read ? "font-medium text-stone-900" : "text-stone-600"
        )}>
          {notification.message}
        </p>
        <p className="text-xs text-stone-400 mt-1 flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {new Date(notification.created_at).toLocaleString('en-GB')}
        </p>
      </div>
    </div>
  );
}
