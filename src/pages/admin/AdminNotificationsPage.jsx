import React from 'react';
import { useApp } from '../../context/AppContext';
import Breadcrumb from '../../components/common/Breadcrumb';

const AdminNotificationsPage = () => {
  const { notifications, markAllNotificationsRead, showToast } = useApp();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin Console', to: '/admin/dashboard' },
          { label: 'System Alerts & Notifications', to: '/admin/notifications' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18232F]">Administrator Alerts & Security Feed</h1>
          <p className="text-sm text-[#667384]">
            High-severity system warnings, credential requests, and automated SLA breach notices.
          </p>
        </div>
        <button
          onClick={() => {
            markAllNotificationsRead();
            showToast('All administrative alerts marked as acknowledged');
          }}
          className="px-4 py-2 text-sm font-semibold text-[#137A70] bg-[#E8F4F1] hover:bg-[#137A70] hover:text-white rounded-lg transition-colors shadow-sm self-start"
        >
          Acknowledge All Alerts
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E7ED] shadow-sm divide-y divide-[#E2E7ED] overflow-hidden">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`p-5 flex items-start gap-4 transition-colors ${
              !item.read ? 'bg-amber-50/30' : 'hover:bg-slate-50/60'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-[#18232F]">{item.title}</h3>
                <span className="text-xs text-[#667384] whitespace-nowrap">{item.time}</span>
              </div>
              <p className="text-sm text-[#667384] mt-1">{item.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
