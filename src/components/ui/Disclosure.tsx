import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

const DisclosureContext = createContext<{
  activeId: string | null;
  setActiveId: (id: string | null) => void;
} | null>(null);

export function DisclosureGroup({ children }: Readonly<{ children: ReactNode }>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  return (
    <DisclosureContext value={{ activeId, setActiveId }}>
      <div data-disclosure-group="" className="disclosure-group">
        {children}
      </div>
    </DisclosureContext>
  );
}

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
  const [localOpen, setLocalOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const id = useId();
  const group = useContext(DisclosureContext);
  const open = group ? group.activeId === id : localOpen;
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
            if (group) group.setActiveId(open ? null : id);
            else setLocalOpen(!open);
            setVisited(true);
          }}
          onKeyDown={(event) => {
            if (!group || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            const buttons = [
              ...event.currentTarget
                .closest('[data-disclosure-group]')!
                .querySelectorAll<HTMLButtonElement>('.disclosure-trigger'),
            ];
            const index = buttons.indexOf(event.currentTarget);
            let next = index;
            if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = buttons.length - 1;
            else
              next =
                (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
            buttons[next]?.focus();
            event.preventDefault();
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
