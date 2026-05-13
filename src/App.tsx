/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, configStatus } from './lib/supabase';
import MatrixBackground from './components/MatrixBackground';
import Auth from './components/Auth';
import Chat from './components/Chat';
import ProfileView from './components/ProfileView';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'chat' | 'profile'>('chat');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsInitialized(true);
      return;
    }

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (err: any) {
        if (err.message?.includes('fetch')) {
          setError('FAILED_TO_FETCH: Connection to Supabase node timed out or host unreachable. Check your VITE_SUPABASE_URL.');
        } else {
          setError(err.message);
        }
      } finally {
        setIsInitialized(true);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-[#00ff66] font-mono">
        <div className="animate-pulse tracking-[0.5em] text-sm">LOADING_TERMINAL...</div>
      </div>
    );
  }

  const renderConfigError = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 bg-black border-2 border-red-500 terminal-shadow">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-red-500/30">
          <AlertCircle className="text-red-500 w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tighter text-red-500 uppercase">System Error</h1>
        </div>
        <p className="text-sm border-l-2 border-red-500/30 pl-4 mb-8 leading-relaxed">
          The terminal is unable to establish an uplink. Configuration variables are missing or invalid.
        </p>
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-widest text-[#00ff66]/60">Protocol Status Check:</p>
          <div className="text-xs font-mono bg-red-500/10 p-4 border border-red-500/20 space-y-2">
            <div className={configStatus.hasUrl ? 'opacity-40' : 'text-red-500'}>
              [{configStatus.hasUrl ? 'OK' : '!!'}] VITE_SUPABASE_URL
            </div>
            <div className={configStatus.hasKey ? 'opacity-40' : 'text-red-500'}>
              [{configStatus.hasKey ? 'OK' : '!!'}] VITE_SUPABASE_ANON_KEY
            </div>
            {!configStatus.isUrlValid && configStatus.hasUrl && (
              <div className="text-red-500 bg-red-500/10 p-2 mt-2">
                [ERR] URL_FORMAT_INVALID: Ensure the URL starts with https://
              </div>
            )}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-[#00ff66] text-black font-bold uppercase tracking-widest text-xs hover:bg-[#00cc55]"
          >
            RE-CHECK CONNECTION
          </button>
          <p className="text-[10px] text-[#00ff66]/40 leading-relaxed italic border-t border-[#00ff66]/10 pt-4">
            If you just added these to the Secrets panel, you must click RE-CHECK or Refresh your browser.
            Check the SUPABASE_SETUP.md for instructions.
          </p>
        </div>
      </div>
    </div>
  );

  const renderFetchError = () => (
    <div className="flex items-center justify-center min-h-screen text-red-500">
      <div className="w-full max-w-lg p-8 bg-black border border-red-500">
        <h2 className="font-bold mb-4 uppercase">Network Failure</h2>
        <div className="text-xs bg-red-500/10 p-4 border border-red-500/30 font-mono mb-4">
          {error}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-2 bg-red-500 text-black font-bold uppercase text-xs"
        >
          REBOOT_SYSTEM
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-[#00ff66] font-mono selection:bg-[#00ff66] selection:text-black">
      <MatrixBackground />
      <div className="scanline" />
      
      <main className="container mx-auto px-4 h-screen relative z-10 flex flex-col">
        {!isSupabaseConfigured ? (
          renderConfigError()
        ) : error ? (
          renderFetchError()
        ) : !session ? (
          <Auth />
        ) : (
          <div className="flex-1 flex flex-col py-4 gap-4">
            {/* Header Navigation */}
            <div className="space-y-2">
              <button 
                onClick={() => setView('chat')}
                className={`w-full py-2 border rounded-sm transition-all uppercase text-xs tracking-[0.3em] font-bold ${view === 'chat' ? 'terminal-border-bright bg-[#00ff66]/10' : 'terminal-border opacity-60 hover:opacity-100'}`}
              >
                CHAT
              </button>
              <button 
                onClick={() => setView('profile')}
                className={`w-full py-2 border rounded-sm transition-all uppercase text-xs tracking-[0.3em] font-bold ${view === 'profile' ? 'terminal-border-bright bg-[#00ff66]/10' : 'terminal-border opacity-60 hover:opacity-100'}`}
              >
                PROFILE
              </button>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="w-full py-2 border terminal-border opacity-60 hover:opacity-100 hover:bg-red-500/10 hover:border-red-500 hover:text-red-500 rounded-sm transition-all uppercase text-xs tracking-[0.3em] font-bold"
              >
                LOGOUT
              </button>
            </div>

            {view === 'chat' ? (
              <Chat 
                user={session.user} 
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <ProfileView 
                  user={session.user} 
                  onBack={() => setView('chat')} 
                />
              </div>
            )}
          </div>
        )}
      </main>

      {!session && (
        <div className="fixed bottom-4 left-4 right-4 text-[9px] text-[#00ff66]/20 uppercase tracking-[0.4em] flex justify-between pointer-events-none">
          <span>{isSupabaseConfigured ? 'SECURE_CONNECTION_ESTABLISHED' : 'CONNECTION_OFFLINE'}</span>
          <span>v1.0.4-LTS</span>
        </div>
      )}
    </div>
  );
}
