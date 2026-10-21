import React from 'react';
import { Link } from 'react-router-dom';

export const Breadcrumb = ({ items = [] }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[#667384] text-xs mb-3">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const target = item.to || item.path;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <span className="material-symbols-outlined text-[14px] text-slate-400">chevron_right</span>
            )}
            {target && !isLast ? (
              <Link
                to={target}
                className="hover:text-[#137A70] transition-colors flex items-center gap-1"
              >
                {item.icon && <span className="material-symbols-outlined text-[16px]">{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className={`flex items-center gap-1 ${isLast ? 'text-[#18232F] font-semibold' : ''}`}>
                {item.icon && <span className="material-symbols-outlined text-[16px]">{item.icon}</span>}
                <span>{item.label}</span>
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
