export interface User {
  id: number;
  name: string;
  role: string;
  location: string;
  pin?: string;
  is_admin: number;
}

export interface FeedbackForm {
  reviewee_id: number | '';
  request_id?: number;
  reviewer_name: string;
  reviewer_relationship: string;
  date: string;
  scores: Record<number, number>;
  notes: Record<number, string>;
  open_ended_1: string;
  open_ended_2: string;
  open_ended_3: string;
  open_ended_4: string;
  overall_assessment: number | '';
}

export interface FeedbackRequest {
  id: number;
  requester_id: number;
  reviewer_id: number;
  requester_name?: string;
  requester_role?: string;
  reviewer_name?: string;
  reviewer_role?: string;
  status: string;
  created_at: string;
  campaign_id?: number | null;
}

export interface Feedback extends FeedbackForm {
  id: number;
  is_archived?: number;
}

export interface PulseSurvey {
  id: number;
  date: string;
  role: string;
  tenure: string;
  scores: Record<number, number>;
  open_ended_1: string;
  open_ended_2: string;
  open_ended_3: string;
  open_ended_4: string;
  enps_score: number | null;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  link: string | null;
  is_read: number;
  created_at: string;
}
