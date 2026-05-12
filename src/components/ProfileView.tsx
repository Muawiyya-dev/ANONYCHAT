import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { motion } from 'motion/react';
import { User, Palette, ArrowLeft, Save } from 'lucide-react';

interface ProfileViewProps {
  user: any;
  onBack: () => void;
}

export default function ProfileView({ user, onBack }: ProfileViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [color, setColor] = useState('#00ff66');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
      setUsername(data.username);
      setColor(data.color);
    }
    setLoading(false);
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ username, color })
      .eq('id', user.id);

    if (error) console.error('Error updating profile:', error);
    else alert('PROFILE SYNCHRONIZED');
    
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-[#00ff66]">BUFFERING...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto p-8 bg-black/80 border-2 border-[#00ff66] terminal-shadow"
    >
      <div className="flex items-center justify-between mb-8 border-b border-[#00ff66]/30 pb-4">
        <div className="flex items-center gap-3">
          <User className="text-[#00ff66] w-6 h-6" />
          <h2 className="text-xl font-bold uppercase tracking-tighter">NODE_CONFIG</h2>
        </div>
        <button onClick={onBack} className="text-xs hover:text-[#00ff66] flex items-center gap-1">
          <ArrowLeft size={14} /> EXIT
        </button>
      </div>

      <form onSubmit={handleUpdate} className="space-y-8">
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.3em] text-[#00ff66]/60 font-bold">Display Identity</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-4 bg-black border border-[#00ff66] text-[#00ff66] font-mono outline-none"
            placeholder="OPERATOR_NAME"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.3em] text-[#00ff66]/60 font-bold flex items-center gap-2">
            <Palette size={14} /> UI Accent Color
          </label>
          <div className="flex gap-4 items-center">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-16 h-16 bg-transparent border-none cursor-pointer"
            />
            <div className="flex-1 font-mono text-sm opacity-60">
              HEX_VAL: {color.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-[#00ff66] text-black font-bold uppercase tracking-widest hover:bg-[#00cc55] flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? 'SAVING...' : 'WRITE TO MEMORY'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
