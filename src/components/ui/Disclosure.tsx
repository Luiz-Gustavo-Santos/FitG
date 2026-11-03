import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

export function Disclosure({
  title,
  summary,
  icon: Icon,
  children,
  className = '',
  keepMounted = false,
}: Readonly<{
  title: string;
  summary?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  keepMounted?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const id = useId();
  return (
    <section className={`disclosure ${open ? 'is-open' : ''} ${className}`}>
      <h3 className="disclosure-heading">
        <button
          className="disclosure-trigger"
          type="button"
          aria-label={title}
          aria-expanded={open}
          aria-controls={`${id}-content`}
          aria-describedby={summary ? `${id}-summary` : undefined}
          onClick={() => {
            setOpen(!open);
            setVisited(true);
          }}
        >
          {Icon && <Icon className="disclosure-icon" size={21} />}
          <span className="disclosure-label">
            <span>{title}</span>
            {summary && <small id={`${id}-summary`}>{summary}</small>}
          </span>
          <ChevronDown className="disclosure-chevron" size={20} />
        </button>
      </h3>
      <div id={`${id}-content`} hidden={!open} className="disclosure-content">
        {(open || (keepMounted && visited)) && children}
      </div>
    </section>
  );
}
