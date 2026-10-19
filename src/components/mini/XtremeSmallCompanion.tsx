import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Mic,
  MicOff,
  Headphones,
  VolumeX,
  Radio,
  Sliders,
  Expand,
  LayoutDashboard
} from 'lucide-react';
import { VoiceSessionState, UserProfile } from '../../types';
import { agoraVoice } from '../../services/agora';
import { desktop } from '../../services/desktop';
import { BrandLogo } from '../brand/BrandLogo';
import {
  getPreferences,
  savePreferences,
  XtremeSmallShape,
  XtremeSmallHover
} from '../../services/preferences';

interface XtremeSmallCompanionProps {
  isOpen: boolean;
  onExpandToCompanion: () => void;
  onExpandToFullApp: () => void;
  voiceState: VoiceSessionState;
  currentUser: UserProfile;
}

export const XtremeSmallCompanion: React.FC<XtremeSmallCompanionProps> = ({
  isOpen,
  onExpandToCompanion,
  onExpandToFullApp,
  voiceState,
  currentUser,
}) => {
  const prefs = getPreferences();
  const [size, setSize] = useState<number>(prefs.xtremeSmall.size || 56);
  const [shape, setShape] = useState<XtremeSmallShape>(prefs.xtremeSmall.shape || 'rounded');
  const [opacity, setOpacity] = useState<number>(prefs.xtremeSmall.opacity || 95);
  const [hoverEffect, setHoverEffect] = useState<XtremeSmallHover>(prefs.xtremeSmall.hoverEffect || 'scale');
  const [position, setPosition] = useState(prefs.xtremeSmall.position || { x: 28, y: 72 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickControls, setShowQuickControls] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialX: 28,
    initialY: 72,
    hasMoved: false,
  });

  const resizeRef = useRef<{ startX: number; startY: number; initialSize: number }>({
    startX: 0,
    startY: 0,
    initialSize: size,
  });

  // Keep in bounds on resize or mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const maxX = Math.max(10, window.innerWidth - size - 20);
      const maxY = Math.max(10, window.innerHeight - size - 20);
      if (position.x > maxX || position.y > maxY) {
        setPosition((prev) => ({
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY),
        }));
      }
    }
  }, [size]);

  // Sync with desktop always on top
  useEffect(() => {
    if (isOpen && prefs.xtremeSmall.alwaysOnTop) {
      desktop.setAlwaysOnTop(true).catch(() => {});
    }
  }, [isOpen, prefs.xtremeSmall.alwaysOnTop]);

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      hasMoved: false,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          dragRef.current.hasMoved = true;
        }

        const maxX = window.innerWidth - size - 10;
        const maxY = window.innerHeight - size - 10;

        const nextX = Math.max(10, Math.min(maxX, dragRef.current.initialX + dx));
        const nextY = Math.max(10, Math.min(maxY, dragRef.current.initialY + dy));

        setPosition({ x: nextX, y: nextY });
      }

      if (isResizing) {
        const delta = Math.max(
          e.clientX - resizeRef.current.startX,
          e.clientY - resizeRef.current.startY
        );
        const nextSize = Math.max(40, Math.min(96, resizeRef.current.initialSize + delta));
        setSize(nextSize);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Persist position
        const currentPrefs = getPreferences();
        savePreferences({
          ...currentPrefs,
          xtremeSmall: {
            ...currentPrefs.xtremeSmall,
            position,
          },
        });
      }
      if (isResizing) {
        setIsResizing(false);
        const currentPrefs = getPreferences();
        savePreferences({
          ...currentPrefs,
          xtremeSmall: {
            ...currentPrefs.xtremeSmall,
            size,
          },
        });
      }
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, position, size]);

  if (!isOpen) return null;

  const handleClick = (e: React.MouseEvent) => {
    // If dragging actually moved the window, do not treat as click
    if (dragRef.current.hasMoved) return;
    if ((e.target as HTMLElement).closest('.no-drag')) return;

    if (prefs.xtremeSmall.clickBehavior === 'full') {
      onExpandToFullApp();
    } else {
      onExpandToCompanion();
    }
  };

  const handleToggleMute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await agoraVoice.toggleMute();
  };

  const handleToggleDeafen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await agoraVoice.toggleDeafen();
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialSize: size,
    };
  };

  // Shape class
  const shapeClass =
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'square'
      ? 'rounded-none'
      : 'rounded-2xl';

  // Hover animation class
  const hoverClass =
    hoverEffect === 'scale'
      ? 'hover:scale-105 active:scale-95'
      : hoverEffect === 'outline'
      ? 'hover:outline hover:outline-1 hover:outline-[var(--accent-primary)]'
      : '';

  const activeSpeaker = voiceState.participants.find((p) => p.isSpeaking);

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        opacity: opacity / 100,
        zIndex: 99999,
        width: `${size}px`,
        height: `${size}px`,
      }}
      className="fixed top-0 left-0 select-none group touch-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowQuickControls(false);
      }}
    >
      {/* The Core Xtreme Small Icon Window */}
      <div
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        title={
          voiceState.isConnected
            ? `LIGHT (Voice Active: ${voiceState.groupName || 'Room'}) — Click to expand`
            : 'LIGHT Xtreme Small — Click to expand'
        }
        className={`w-full h-full relative cursor-grab active:cursor-grabbing transition-transform duration-150 ${shapeClass} ${hoverClass} flex items-center justify-center overflow-hidden`}
      >
        {/* LIGHT Logo Mark — Preserves aspect ratio with zero distortion */}
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
          <BrandLogo size="custom" iconOnly />
        </div>

        {/* Resize Grip Corner */}
        <div
          onMouseDown={handleResizeStart}
          title="Drag to resize logo window"
          className="no-drag absolute bottom-0 right-0 w-3 h-3 cursor-se-resize flex items-center justify-center opacity-0 group-hover:opacity-70 transition-opacity"
        >
          <div className="w-1.5 h-1.5 border-r border-b border-slate-400 dark:border-slate-500" />
        </div>
      </div>

    </div>
  );
};
