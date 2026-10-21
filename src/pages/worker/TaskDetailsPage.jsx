import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';

export const TaskDetailsPage = () => {
  const { taskId } = useParams();
  const { complaints } = useApp();

  const task = complaints.find(c => c.id.toLowerCase() === (taskId || '').toLowerCase());

  if (!task) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
            { label: 'Tasks', path: '/worker/tasks' },
            { label: 'Task Not Found' }
          ]}
        />
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl p-8 max-w-lg mx-auto shadow-sm border border-outline-variant/30 space-y-4">
          <span className="material-symbols-outlined text-[48px] text-tertiary">search_off</span>
          <h2 className="text-xl font-bold text-on-surface">Work Order Not Found</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Task ID #{taskId} could not be located in assigned work orders.
          </p>
          <Link
            to="/worker/tasks"
            className="inline-block px-5 py-2.5 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary shadow-sm transition-colors"
          >
            Return to Work Queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
          { label: 'Tasks', path: '/worker/tasks' },
          { label: `Specification #${task.id}` }
        ]}
      />

      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2.5 py-0.5 rounded">
                #{task.id}
              </span>
              <StatusBadge status={task.status} size="sm" />
              <PriorityBadge priority={task.priority} />
            </div>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface">{task.title}</h1>
            <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-[15px] text-tertiary">location_on</span>
              <span>{task.location?.address}</span>
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <Link
              to={`/worker/tasks/${task.id}/progress`}
              className="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-xl hover:bg-primary shadow"
            >
              Update Progress
            </Link>
          </div>
        </div>

        {/* Narrative */}
        <div className="space-y-2 text-xs">
          <span className="font-bold text-tertiary uppercase tracking-wider block">Task Specification & Hazard Context</span>
          <p className="text-on-surface text-sm leading-relaxed bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
            {task.description}
          </p>
        </div>

        {/* Equipment & Safety Protocols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-container-low space-y-2 border border-outline-variant/30">
            <span className="font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">build</span>
              <span>Required Equipment Rig</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-on-surface-variant">
              <li>Van #14 with Roller Hitch T-12</li>
              <li>Hot-Mix Bitumen Asphalt Compound</li>
              <li>Compaction Vibratory Plate Tamper</li>
              <li>Traffic Safety Cones (Min. 8 units)</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low space-y-2 border border-outline-variant/30">
            <span className="font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[18px]">shield</span>
              <span>OSHA & Safety Protocols</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-on-surface-variant">
              <li>Class 3 High-Visibility Reflective Vest</li>
              <li>Active Hazard Flashers on Service Rig</li>
              <li>Inspect underground conduits prior to tamper use</li>
              <li>Capture Before & After photographic evidence</li>
            </ul>
          </div>
        </div>

        {/* Photos */}
        {task.photos && task.photos.length > 0 && (
          <div className="space-y-2 text-xs">
            <span className="font-bold text-tertiary uppercase tracking-wider block">Intake Reference Media</span>
            <div className="grid grid-cols-2 gap-3">
              {task.photos.map((p, i) => (
                <div key={i} className="rounded-xl overflow-hidden aspect-video bg-surface-container border border-outline-variant/40">
                  <img src={p} alt="Defect" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
