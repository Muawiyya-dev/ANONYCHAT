import { useEffect, useState, useRef, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Message, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Hash, Users, Terminal as TerminalIcon, LogOut, Settings } from 'lucide-react';

interface ChatProps {
  user: any;
}

export default function Chat({ user }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      await fetchProfile();
      await fetchMessages();
      setIsDataLoaded(true);
    };
    init();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('messages_realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, async (payload) => {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some(m => m.id === payload.new.id)) return prev;
          
          // We need current profiles, but the payload only has user_id
          // Optimization: check if we already have a user in prev with this ID to avoid one query
          const existingUser = prev.find(m => m.user_id === payload.new.user_id)?.profiles;
          
          if (existingUser) {
            return [...prev, { ...payload.new, profiles: existingUser } as Message];
          }

          // Fallback to fetching profile if not found in recent messages
          fetchProfileForMessage(payload.new);
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const channel = supabase.channel('presence_users');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        // Filter unique users by ID (Supabase returns multiple presences for multiple tabs)
        const uniqueUsers = users.reduce((acc: any[], current: any) => {
          const x = acc.find(item => item.id === current.id);
          if (!x) return acc.concat([current]);
          return acc;
        }, []);
        setOnlineUsers(uniqueUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            username: profile?.username || user.email.split('@')[0],
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchProfileForMessage = async (message: any) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', message.user_id)
      .single();
    
    setMessages((prev) => {
      if (prev.some(m => m.id === message.id)) return prev;
      return [...prev, { ...message, profiles: profileData } as Message];
    });
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) setProfile(data);
      else {
        // Create profile if it doesn't exist
        const newProfile = {
          id: user.id,
          username: user.email.split('@')[0],
          color: '#00ff66',
        };
        const { error: insertError } = await supabase.from('profiles').insert(newProfile);
        if (insertError) throw insertError;
        setProfile(newProfile);
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err.message);
      setError('PROFILE_ERR: ' + err.message);
    }
  };

  const fetchMessages = async () => {
    try {
      // First attempt with join
      let { data, error: fetchError } = await supabase
        .from('messages')
        .select('*, profiles(*)')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (fetchError) {
        // Fallback: If relationship is missing in schema cache, fetch messages only 
        // and resolve profiles on the fly
        console.warn('Relationship join failed, using fallback:', fetchError.message);
        const { data: simpleData, error: simpleError } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100);
          
        if (simpleError) throw simpleError;
        
        if (simpleData) {
          setMessages(simpleData as Message[]);
          // Resolve profiles for each message asynchronously
          simpleData.forEach(m => fetchProfileForMessage(m));
        }
      } else if (data) {
        setMessages(data);
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err.message);
      setError('FETCH_ERR: ' + (err.message || 'Check RLS policies'));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert({
      content: newMessage,
      user_id: user.id,
      channel_id: 'global' // simplified for now
    });

    if (error) console.error('Error sending message:', error);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden min-h-0">
      {/* Sidebar - Channels & Users */}
      <div className="flex flex-col w-full md:w-64 gap-4">
        <div className="flex-1 flex flex-col p-4 border terminal-border rounded-lg bg-black/60 overflow-hidden">
          <div className="mb-6">
            <h3 className="text-xs font-bold text-[#00ff66] mb-4 tracking-widest uppercase neon-text">Channels</h3>
            <button className="w-full text-left px-3 py-2 border terminal-border-bright rounded-sm text-[10px] uppercase tracking-widest bg-[#00ff66]/10 flex items-center gap-2">
              <span className="w-1 h-1 bg-[#00ff66] rounded-full shadow-[0_0_5px_#00ff66]" />
              Global Chat
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-xs font-bold text-[#00ff66] mb-4 tracking-widest uppercase neon-text">Private Users</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {onlineUsers.map((u: any) => (
                <button 
                  key={u.id} 
                  className="w-full text-left px-3 py-2 border terminal-border rounded-sm text-[10px] hover:bg-[#00ff66]/5 transition-all flex items-center justify-center gap-2 group"
                >
                  <span className={`w-2 h-2 rounded-full ${u.id === user.id ? 'bg-[#00ff66]' : 'bg-red-500'} shadow-[0_0_5px_rgba(0,0,0,0.5)]`} />
                  <span className="truncate opacity-80 group-hover:opacity-100">{u.username}</span>
                </button>
              ))}
              {/* Fillers to match image aesthetic if user count is low */}
              {onlineUsers.length < 5 && Array.from({ length: 5 - onlineUsers.length }).map((_, i) => (
                <div key={`filler-${i}`} className="w-full h-8 border terminal-border opacity-20 rounded-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col border terminal-border rounded-lg bg-black/60 overflow-hidden min-h-0">
        <div className="p-4 border-b border-[#00ff66]/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#00ff66] tracking-widest uppercase neon-text">Global Chat</h2>
          {error && (
            <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-1 border border-red-500/20">
              [SYSTEM_FAIL: {error}]
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {!isDataLoaded && (
            <div className="flex items-center justify-center h-full opacity-50 uppercase text-[10px] tracking-widest">
              Reconstructing data stream...
            </div>
          )}
          {isDataLoaded && messages.length === 0 && !error && (
            <div className="flex items-center justify-center h-full opacity-30 uppercase text-[10px] tracking-widest italic text-center px-8">
              Data stream is empty. No messages detected in this sector.
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                key={m.id}
                className="p-3 border terminal-border rounded-lg bg-black/40 relative overflow-hidden group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: m.profiles?.color || '#00ff66' }}
                  >
                    {m.profiles?.username || 'SYSTEM'}
                  </span>
                  <span className="text-[9px] text-[#00ff66]/30 font-mono">
                    {new Date(m.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs leading-relaxed text-[#00ff66]/90 tracking-wide">
                  {m.content}
                </div>
                {/* Visual accent like the red line in image */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 opacity-40 group-hover:opacity-100 transition-opacity" 
                  style={{ backgroundColor: m.profiles?.color || '#00ff66' }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Fancy Input Area */}
        <form onSubmit={sendMessage} className="p-4 pt-0">
          <div className="flex gap-2">
            <div className="w-10 border terminal-border rounded-lg bg-[#00ff66]/5 flex items-center justify-center">
              <div className="w-1 h-1 bg-[#00ff66] rounded-full animate-pulse" />
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder=""
                className="w-full h-10 bg-black/80 border terminal-border rounded-lg px-4 text-[#00ff66] font-mono text-xs outline-none focus:terminal-border-bright transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-8 border terminal-border rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#00ff66]/10 transition-all text-[#00ff66]"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
