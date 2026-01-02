import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
  excludeInputs?: boolean; // If true, don't trigger when typing in inputs
}

/**
 * Hook for handling keyboard shortcuts (Enter and Esc)
 * @param options Configuration options
 * @param options.onEnter Callback when Enter key is pressed (acts as Save)
 * @param options.onEscape Callback when Esc key is pressed (acts as Cancel/Back)
 * @param options.enabled Whether the shortcuts are enabled (default: true)
 * @param options.excludeInputs Whether to exclude input fields (default: true)
 */
export const useKeyboardShortcuts = ({
  onEnter,
  onEscape,
  enabled = true,
  excludeInputs = true
}: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Check if user is typing in an input, textarea, or contenteditable element
    if (excludeInputs) {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea';
      const isContentEditable = target.getAttribute('contenteditable') === 'true';
      
      // Don't trigger shortcuts when typing in inputs (unless it's a button)
      if (isInput || isContentEditable) {
        // Allow Enter in textareas only if Shift is not pressed (normal behavior)
        // For other inputs, allow Enter to trigger save
        if (tagName === 'textarea' && !event.shiftKey) {
          return; // Let textarea handle Enter normally
        }
        // For input fields, allow Enter to trigger save
        if (tagName === 'input' && event.key === 'Enter') {
          // Check if it's a button or submit input
          const inputType = (target as HTMLInputElement).type;
          if (inputType === 'button' || inputType === 'submit') {
            // Let the button handle it
            return;
          }
          // For other inputs, trigger save on Enter
          if (onEnter && event.key === 'Enter') {
            event.preventDefault();
            onEnter();
            return;
          }
        }
        return;
      }
    }

    // Handle Enter key (Save action)
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      if (onEnter) {
        event.preventDefault();
        onEnter();
      }
    }

    // Handle Escape key (Cancel/Back action)
    if (event.key === 'Escape') {
      if (onEscape) {
        event.preventDefault();
        onEscape();
      }
    }
  }, [enabled, excludeInputs, onEnter, onEscape]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);
};

