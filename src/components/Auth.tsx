import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Terminal, Lock, Mail } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
      } else if (isSignUp && data?.user && !data.session) {
        // If they get here, Supabase is still requiring confirmation
        setError('REGISTRATION_PND: A verification link was sent. You must confirm it to log in, OR disable "Confirm email" in your Supabase Auth settings.');
      }
    } catch (err: any) {
      setError('SYST_ERR: ' + (err.message || 'Unknown network error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 bg-black/80 border-2 border-[#00ff66] terminal-shadow"
      >
        <div className="flex items-center gap-3 mb-8 border-b border-[#00ff66]/30 pb-4">
          <Terminal className="text-[#00ff66] w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-tighter">ANONYCHAT::LOGIN</h1>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-[#00ff66]/60 flex items-center gap-2">
              <Mail size={12} /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-black border border-[#00ff66] text-[#00ff66] focus:ring-1 focus:ring-[#00ff66] outline-none font-mono"
              placeholder="operator@nexus.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-[#00ff66]/60 flex items-center gap-2">
              <Lock size={12} /> Access Key
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-black border border-[#00ff66] text-[#00ff66] focus:ring-1 focus:ring-[#00ff66] outline-none font-mono"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-xs bg-red-500/10 p-2 border border-red-500/30">
              ERROR: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#00ff66] text-black font-bold uppercase tracking-widest hover:bg-[#00cc55] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'INITIALIZING...' : (isSignUp ? 'ESTABLISH IDENTITY' : 'ACCESS TERMINAL')}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-[#00ff66]/20 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-[#00ff66]/60 hover:text-[#00ff66] uppercase tracking-widest"
          >
            {isSignUp ? '> BACK TO LOGIN' : '> NEW OPERATOR? REGISTER'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
