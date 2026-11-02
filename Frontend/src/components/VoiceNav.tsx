import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function VoiceNav() {
  const nav = useNavigate();
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [rec, setRec] = useState<any>(null);

  function start() {
    if (!supported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = false;
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript.toLowerCase();
      setTranscript(t);
      if (t.includes('product')) nav('/customer');
      else if (t.includes('booking')) nav('/customer');
      else if (t.includes('account')) nav('/customer');
      else if (t.includes('notification')) nav('/customer');
      else if (t.includes('dashboard')) nav('/admin');
      else if (t.includes('home')) nav('/');
    };
    r.onend = () => setListening(false);
    r.start();
    setRec(r);
    setListening(true);
  }
  function stop() { rec?.stop(); setListening(false); }

  if (!supported) return <span className="text-xs text-[var(--muted)]">Voice not supported</span>;
  return (
    <div className="fixed bottom-4 left-4 z-40">
      <button className="btn text-xs" onClick={listening ? stop : start}>{listening ? 'Stop listening' : 'Voice nav'}</button>
      {listening && <div className="text-xs mt-1 text-green-400">Listening… {transcript}</div>}
    </div>
  );
}