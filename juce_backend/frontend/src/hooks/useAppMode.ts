export const useAppMode = (): 'online' | 'local' => {
  const mode = import.meta.env.VITE_APP_MODE || 'local';
  return mode === 'online' ? 'online' : 'local';
};
