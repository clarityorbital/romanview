import { useState, useCallback } from 'react';
import { Link } from 'lucide-react';

interface ShareButtonProps {
  url: string;
}

/**
 * Copy-URL-to-clipboard button with brief "Copied!" feedback.
 */
export function ShareButton({ url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: some browsers block clipboard in non-secure contexts
    }
  }, [url]);

  return (
    <button
      onClick={handleCopy}
      className="px-2.5 py-1 text-[10px] font-mono font-medium rounded-sm border transition-all duration-150 cursor-pointer bg-transparent border-roman-border text-roman-text-dim hover:text-roman-text-muted hover:border-roman-border-accent flex items-center gap-1.5"
      title="Copy shareable URL"
      aria-label="Copy shareable URL to clipboard"
    >
      <Link className="w-3 h-3" />
      <span>{copied ? 'COPIED' : 'SHARE'}</span>
    </button>
  );
}
