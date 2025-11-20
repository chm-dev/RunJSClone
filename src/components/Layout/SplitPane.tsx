import React, { useState, useRef, useEffect } from 'react';

interface SplitPaneProps {
    left: React.ReactNode;
    right: React.ReactNode;
    initialSplit?: number; // Percentage (0-100)
}

export const SplitPane: React.FC<SplitPaneProps> = ({ left, right, initialSplit = 50 }) => {
    const [split, setSplit] = useState(initialSplit);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const newSplit = ((e.clientX - containerRect.left) / containerRect.width) * 100;

            // Clamp between 20% and 80%
            const clampedSplit = Math.min(Math.max(newSplit, 20), 80);
            setSplit(clampedSplit);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div ref={containerRef} className="flex h-full w-full relative">
            <div style={{ width: `${split}%` }} className="h-full overflow-hidden">
                {left}
            </div>

            {/* Resizer Handle */}
            <div
                className={`w-2 h-full cursor-col-resize bg-[var(--border-color)] hover:bg-[var(--accent-color)] transition-colors z-10 flex items-center justify-center ${isDragging ? 'bg-[var(--accent-color)]' : ''}`}
                onMouseDown={handleMouseDown}
                style={{ width: '4px' }}
            >
                {/* Optional: Grip dots or line */}
                <div className="w-1 h-8 bg-white/100 rounded-full" />
            </div>

            <div style={{ width: `${100 - split}%` }} className="h-full overflow-hidden">
                {right}
            </div>
        </div>
    );
};
