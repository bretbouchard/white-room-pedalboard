import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAudioStore } from '@/stores/audioStore';
import { saveProject, loadProject, syncProjectToCloud, loadProjectFromCloud } from '@/services/projectService';
import { mapStoreToCompositionContext, applyCompositionContextToStore } from '@/lib/composition-mapper';
import { CompositionContext } from '@/types';
import { useAppMode } from '@/hooks/useAppMode';

const FileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mode = useAppMode();

  const { currentProjectFile, setCurrentProjectFile } = useAudioStore();

  const saveMutation = useMutation({
    mutationFn: ({ filePath, compositionContext }: { filePath: string, compositionContext: Partial<CompositionContext> }) => saveProject(filePath, compositionContext),
    onSuccess: (data, variables) => {
      console.log('Project saved successfully:', data.message);
      setCurrentProjectFile(variables.filePath);
    },
    onError: (error) => {
      console.error('Failed to save project:', error);
      alert(`Error: ${error.message}`);
    },
  });

  const loadMutation = useMutation({
    mutationFn: (filePath: string) => loadProject(filePath),
    onSuccess: (data: CompositionContext, filePath: string) => {
      console.log('Project loaded successfully');
      applyCompositionContextToStore(data);
      setCurrentProjectFile(filePath);
    },
    onError: (error) => {
      console.error('Failed to load project:', error);
      alert(`Error: ${error.message}`);
    },
  });

  const syncToCloudMutation = useMutation({
    mutationFn: (compositionContext: Partial<CompositionContext>) => syncProjectToCloud(compositionContext),
    onSuccess: (data) => {
      console.log('Project synced to cloud successfully:', data.message);
      alert('Project synced to cloud!');
    },
    onError: (error) => {
      console.error('Failed to sync project to cloud:', error);
      alert(`Error: ${error.message}`);
    },
  });

  const loadFromCloudMutation = useMutation({
    mutationFn: (projectId: string) => loadProjectFromCloud(projectId),
    onSuccess: (data: CompositionContext, projectId: string) => {
      console.log('Project loaded from cloud successfully');
      applyCompositionContextToStore(data);
      setCurrentProjectFile(data.composition_id || projectId);
    },
    onError: (error) => {
      console.error('Failed to load project from cloud:', error);
      alert(`Error: ${error.message}`);
    },
  });

  useEffect(() => {
    if (currentProjectFile) {
      const title = mode === 'online' ? `Audio Agent (Cloud) - ${currentProjectFile}` : `Audio Agent - ${currentProjectFile.split('/').pop()}`;
      document.title = title;
    } else {
      document.title = mode === 'online' ? 'Audio Agent (Cloud)' : 'Audio Agent';
    }
  }, [currentProjectFile, mode]);

  // --- Local Mode Handlers ---
  const handleSave = () => {
    if (currentProjectFile && mode === 'local') {
      const context = mapStoreToCompositionContext();
      saveMutation.mutate({ filePath: currentProjectFile, compositionContext: context });
    } else {
      handleSaveAs();
    }
    setIsOpen(false);
  };

  const handleSaveAs = () => {
    const filePath = window.prompt("Enter file path to save as:", currentProjectFile || "my-project.schill");
    if (filePath) {
      const context = mapStoreToCompositionContext();
      saveMutation.mutate({ filePath, compositionContext: context });
    }
    setIsOpen(false);
  };

  const handleOpen = () => {
    fileInputRef.current?.click();
    setIsOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const pseudoPath = file.name;
      loadMutation.mutate(pseudoPath);
    }
  };

  const handleSyncToCloud = () => {
    const context = mapStoreToCompositionContext();
    syncToCloudMutation.mutate(context);
    setIsOpen(false);
  };

  // --- Cloud Mode Handlers ---
  const handleOpenFromCloud = () => {
    const projectId = window.prompt("Enter project ID to load from cloud:");
    if (projectId) {
      loadFromCloudMutation.mutate(projectId);
    }
    setIsOpen(false);
  };

  const handleSaveToCloud = () => {
    const context = mapStoreToCompositionContext();
    // In online mode, 'save' is effectively a sync
    syncToCloudMutation.mutate(context);
    setIsOpen(false);
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".schill" />
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 text-sm font-medium text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
      >
        File
      </button>

      {isOpen && (
        <div className="absolute left-0 w-48 mt-2 origin-top-left bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
          <div className="py-1">
            {mode === 'local' ? (
              <>
                <button
                  onClick={handleOpen}
                  className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                >
                  Open...
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleSaveAs}
                  disabled={saveMutation.isPending}
                  className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Save As...
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleSyncToCloud}
                  disabled={syncToCloudMutation.isPending}
                  className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {syncToCloudMutation.isPending ? 'Syncing...' : 'Sync to Cloud'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleOpenFromCloud}
                  disabled={loadFromCloudMutation.isPending}
                  className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {loadFromCloudMutation.isPending ? 'Loading...' : 'Open from Cloud...'}
                </button>
                <button
                  onClick={handleSaveToCloud}
                  disabled={syncToCloudMutation.isPending} // Re-use sync mutation
                  className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {syncToCloudMutation.isPending ? 'Saving...' : 'Save to Cloud'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileMenu;
