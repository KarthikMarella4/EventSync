
export type Screen = 'home' | 'dashboard' | 'create' | 'gallery' | 'profile' | 'explore';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  occupation?: string;
  isAuthenticated: boolean;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  imageUrl: string;
  category: string;
  distance?: string;
  attendeesCount?: number;
  attendeesAvatars?: string[];
  status?: 'going' | 'waitlist' | 'invited' | 'hosted';
  creatorId?: string;
  googleCalendarEventId?: string;
}

export interface Photo {
  id: string;
  url: string;
  user: {
    handle: string;
    avatar?: string;
    initials?: string;
    color?: string;
  };
  isFavorite?: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO string
  isCompleted: boolean;
  reminderTime?: string; // ISO string
  createdAt: string;
}

export type NotificationType = 'reminder' | 'invite' | 'update' | 'photo';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}
