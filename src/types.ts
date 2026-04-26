export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type PostStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  badges: string[];
  postsCount: number;
  xp: number;
  totalLikes: number;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  type: 'photo' | 'video';
  url: string;
  title: string;
  description: string;
  tags: string[];
  status: PostStatus;
  likes: number;
  commentCount: number;
  createdAt: any; // Firestore Timestamp
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: any;
}

export interface ForestBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: string;
}

export const FOREST_BADGES: ForestBadge[] = [
  { id: 'scout', name: 'Forest Scout', icon: '🌲', description: 'Submitted your first photo!', requirement: '1 post' },
  { id: 'watcher', name: 'Wildlife Watcher', icon: '🦉', description: 'Submitted 5 approved photos.', requirement: '5 posts' },
  { id: 'guardian', name: 'Nature Guardian', icon: '🦁', description: 'Active contributor with 20+ posts.', requirement: '20 posts' },
  { id: 'star', name: 'Community Star', icon: '⭐', description: 'Received 100+ total likes.', requirement: '100 likes' },
];
