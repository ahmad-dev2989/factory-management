import { useEffect } from 'react';

interface ShortcutHandlers {
  onNew?: () => void;
  onSave?: () => void;
  onSearch?: () => void;
  onPrint?: () => void;
  onBackup?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, dependencies: any[] = []) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to close dialogs
      if (e.key === 'Escape') {
        if (handlers.onEscape) {
          e.preventDefault();
          handlers.onEscape();
        }
      }

      // Control/Command key shortcuts
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();

        if (key === 'n' && handlers.onNew) {
          e.preventDefault();
          handlers.onNew();
        }
        if (key === 's' && handlers.onSave) {
          e.preventDefault();
          handlers.onSave();
        }
        if (key === 'f' && handlers.onSearch) {
          e.preventDefault();
          handlers.onSearch();
        }
        if (key === 'p' && handlers.onPrint) {
          e.preventDefault();
          handlers.onPrint();
        }
        if (key === 'b' && handlers.onBackup) {
          e.preventDefault();
          handlers.onBackup();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers, ...dependencies]);
}
