const fs = require('fs');
const codePath = 'app/(dashboard)/dashboard/OrderManagerProvider.tsx';
let code = fs.readFileSync(codePath, 'utf8');

const base64Audio = fs.readFileSync('scratch/audio.txt', 'utf8').trim();

// 1. Remove the new Audio() from useEffect
code = code.replace(/const audio = new Audio[^\n]+\n\s+audio\.loop = true;\n\s+audioRef\.current = audio;/s, '');

// 2. Add the <audio> tag to the JSX return
const renderAudio = `      <audio ref={audioRef} src="${base64Audio}" loop preload="auto" style={{ display: 'none' }} />\n      {children}`;
code = code.replace('{children}', renderAudio);

// 3. Add global unlocker
const globalUnlock = `
  useEffect(() => {
    const unlock = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current.pause();
          document.removeEventListener('click', unlock);
          document.removeEventListener('keydown', unlock);
        }).catch(() => {});
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);
`;

code = code.replace('const acknowledgedIds = useRef<Set<string>>(new Set());\n  const audioRef = useRef<HTMLAudioElement | null>(null);', 'const acknowledgedIds = useRef<Set<string>>(new Set());\n  const audioRef = useRef<HTMLAudioElement | null>(null);\n' + globalUnlock);

fs.writeFileSync(codePath, code);
console.log("Successfully injected DOM audio and global unlocker.");
