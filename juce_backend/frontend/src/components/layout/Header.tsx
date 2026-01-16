import FileMenu from './FileMenu';
import AuthBar from '../auth/AuthBar';
import { useAppMode } from '@/hooks/useAppMode';

const CloudIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const Header = () => {
  const mode = useAppMode();
  const isOnline = mode === 'online';

  const headerBg = isOnline ? 'bg-blue-900' : 'bg-gray-900';

  return (
    <header className={`flex items-center justify-between w-full p-2 text-white shadow-md ${headerBg}`}>
      <div className="flex items-center gap-4">
        {isOnline && <CloudIcon />}
        <h1 className="text-lg font-bold">Audio Agent {isOnline ? '(Cloud)' : ''}</h1>
        <FileMenu />
      </div>
      <div>
        <AuthBar />
      </div>
    </header>
  );
};

export default Header;
