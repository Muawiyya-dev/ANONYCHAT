import { useEffect, useState, useRef, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Message, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Hash, Users, Terminal as TerminalIcon, LogOut, Settings } from 'lucide-react';

interface ChatProps {
  user: any;
  onLogout: () => void;
  onShowProfile: () => void;
}

export default function Chat({ user, onLogout, onShowProfile }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchMessages();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('messages_realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, async (payload) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.user_id)
          .single();
        
        const newMessage = {
          ...payload.new,
          profiles: profileData
        } as Message;
        
        setMessages((prev) => [...prev, newMessage]);
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
        setOnlineUsers(users);
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

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) setProfile(data);
      else {
        // Create profile if it doesn't exist
        const newProfile = {
          id: user.id,
          username: user.email.split('@')[0],
          color: '#00ff66',
        };
        await supabase.from('profiles').insert(newProfile);
        setProfile(newProfile);
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err.message);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*, profiles(*)')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (data) setMessages(data);
    } catch (err: any) {
      console.error('Error fetching messages:', err.message);
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
    <div className="flex h-screen max-h-screen pt-4 pb-4 gap-4 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-black/80 border border-[#00ff66] terminal-shadow">
        <div className="p-4 border-b border-[#00ff66]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TerminalIcon className="text-[#00ff66] w-5 h-5" />
            <span className="font-bold tracking-tighter">NNX_CHANNELS</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-6">
            <p className="text-[10px] text-[#00ff66]/40 uppercase tracking-[0.2em] mb-2 px-2">Global Feed</p>
            <button className="w-full flex items-center gap-2 px-3 py-2 bg-[#00ff66]/10 border border-[#00ff66]/30 text-sm">
              <Hash size={16} /> global-nexus
            </button>
          </div>

          <div>
            <p className="text-[10px] text-[#00ff66]/40 uppercase tracking-[0.2em] mb-2 px-2">Active Nodes ({onlineUsers.length})</p>
            <div className="space-y-1">
              {onlineUsers.map((u: any) => (
                <div key={u.id} className="flex items-center gap-2 px-3 py-1 text-xs opacity-80">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse" />
                  {u.username}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-[#00ff66]/30 bg-[#00ff66]/5">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-8 h-8 flex items-center justify-center border border-[#00ff66] text-xs font-bold"
              style={{ color: profile?.color || '#00ff66' }}
            >
              {profile?.username?.[0].toUpperCase() || '?'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold truncate">{profile?.username}</span>
              <span className="text-[10px] opacity-40 truncate">{user.email}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onShowProfile} className="flex-1 py-1 border border-[#00ff66]/30 hover:bg-[#00ff66] hover:text-black transition-colors">
              <Settings size={14} className="mx-auto" />
            </button>
            <button onClick={onLogout} className="flex-1 py-1 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-black transition-colors">
              <LogOut size={14} className="mx-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-black/80 border border-[#00ff66] terminal-shadow">
        <div className="p-4 border-b border-[#00ff66]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hash className="text-[#00ff66]" />
            <div>
              <h2 className="font-bold tracking-tight">GLOBAL_NEXUS_CHANNEL</h2>
              <p className="text-[10px] text-[#00ff66]/50 uppercase tracking-widest">Public Data Stream // Encrypted</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={m.id}
                className="flex flex-col gap-1 border-l-2 border-[#00ff66]/10 pl-4 py-1"
                style={{ borderLeftColor: (m.profiles?.color || '#00ff66') + '44' }}
              >
                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs font-bold uppercase tracking-tighter"
                    style={{ color: m.profiles?.color || '#00ff66' }}
                  >
                    [{m.profiles?.username || 'SYSTEM_NODE'}]
                  </span>
                  <span className="text-[9px] text-[#00ff66]/30">
                    {new Date(m.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm leading-relaxed opacity-90 break-words">{m.content}</p>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t border-[#00ff66]/30 bg-black">
          <div className="relative flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="TYPE MESSAGE > _"
              className="w-full p-4 bg-transparent border border-[#00ff66] text-[#00ff66] placeholder-[#00ff66]/20 font-mono text-sm outline-none focus:ring-1 focus:ring-[#00ff66]/50"
            />
            <button
              type="submit"
              className="absolute right-2 p-2 text-[#00ff66] hover:bg-[#00ff66] hover:text-black transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[9px] text-[#00ff66]/30 mt-2 uppercase tracking-widest flex justify-between">
            <span>READY FOR TRANSMISSION</span>
            <span>CHAR_COUNT: {newMessage.length}</span>
          </p>
        </form>
      </div>
    </div>
  );
}
