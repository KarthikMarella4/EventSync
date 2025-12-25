
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
