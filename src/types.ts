export interface Profile {
  id: string;
  username: string;
  color: string;
  is_online?: boolean;
}

export interface Message {
  id: string;
  created_at: string;
  content: string;
  user_id: string;
  channel_id: string;
  profiles?: Profile;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
}
