import { useState, useEffect, useCallback, useRef } from 'react';

export default function useAntiCheat({ onViolation, enabled = true }) {
  const [tabSwitches, setTabSwitches] = useState(0);
  const [violations, setViolations] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const warningTimeout = useRef(null);

  const addViolation = useCallback((type, detail = '') => {
    const v = { type, detail, timestamp: new Date().toISOString() };
    setViolations(prev => [...prev, v]);
    setTabSwitches(prev => type === 'tab_switch' ? prev + 1 : prev);
    setWarningMessage(
      type === 'tab_switch'
        ? 'Warning: You switched tabs! This is being recorded.'
        : type === 'copy'
        ? 'Warning: Copying is not allowed during exams!'
        : type === 'paste'
        ? 'Warning: Pasting is not allowed during exams!'
        : type === 'right_click'
        ? 'Warning: Right-click is disabled during exams!'
        : type === 'fullscreen_exit'
        ? 'Warning: Please stay in fullscreen mode!'
        : 'Warning: This action is not allowed during exams!'
    );
    setShowWarning(true);
    if (warningTimeout.current) clearTimeout(warningTimeout.current);
    warningTimeout.current = setTimeout(() => setShowWarning(false), 4000);
    onViolation?.(v);
  }, [onViolation]);

  // Tab visibility detection
  useEffect(() => {
    if (!enabled) return;
    const handleVisibility = () => {
      if (document.hidden) {
        addViolation('tab_switch', 'User switched to another tab');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, addViolation]);

  // Fullscreen change detection
  useEffect(() => {
    if (!enabled) return;
    const handleFullscreen = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        addViolation('fullscreen_exit', 'User exited fullscreen');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, [enabled, addViolation]);

  // Disable right-click
  useEffect(() => {
    if (!enabled) return;
    const handleContextMenu = (e) => {
      e.preventDefault();
      addViolation('right_click', 'User attempted right-click');
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [enabled, addViolation]);

  // Disable copy/cut
  useEffect(() => {
    if (!enabled) return;
    const handleCopy = (e) => {
      e.preventDefault();
      addViolation('copy', 'User attempted to copy');
    };
    const handleCut = (e) => {
      e.preventDefault();
      addViolation('copy', 'User attempted to cut');
    };
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
    };
  }, [enabled, addViolation]);

  // Disable paste (but allow it in input/textarea)
  useEffect(() => {
    if (!enabled) return;
    const handlePaste = (e) => {
      const tag = e.target.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        addViolation('paste', 'User attempted to paste');
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [enabled, addViolation]);

  // Disable keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+P, F12, etc.)
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      // Block: Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+P, Ctrl+S, Ctrl+A (select all)
      if (ctrl && ['c', 'v', 'u', 'p', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        addViolation('keyboard', `Blocked shortcut: Ctrl+${e.key.toUpperCase()}`);
      }
      // Block: F12 (dev tools)
      if (e.key === 'F12') {
        e.preventDefault();
        addViolation('keyboard', 'Blocked F12');
      }
      // Block: Ctrl+Shift+I/J (dev tools)
      if (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        addViolation('keyboard', 'Blocked dev tools shortcut');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, addViolation]);

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch {
      // Fullscreen may be blocked by browser
    }
  }, []);

  // Warn before leaving page
  useEffect(() => {
    if (!enabled) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);

  return {
    tabSwitches,
    violations,
    isFullscreen,
    showWarning,
    warningMessage,
    requestFullscreen,
    totalViolations: violations.length,
  };
}
