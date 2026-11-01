import React from 'react';
import { useApp } from '../../context/AppContext';
import Breadcrumb from '../../components/common/Breadcrumb';

const AdminProfilePage = () => {
  const { currentPersona } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin Console', to: '/admin/dashboard' },
          { label: 'Security Profile', to: '/admin/profile' },
        ]}
      />

      <div className="bg-white rounded-xl border border-[#E2E7ED] shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[#E2E7ED]">
          <div className="w-20 h-20 rounded-2xl bg-purple-100 text-purple-700 font-bold text-3xl flex items-center justify-center border border-purple-200">
            {(currentPersona?.name || 'Administrator').split(' ').filter(Boolean).map((n) => n[0]).join('')}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl font-bold text-[#18232F]">{currentPersona?.name || 'Platform Administrator'}</h1>
              <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                Super Administrator
              </span>
            </div>
            <p className="text-sm text-[#667384] mt-1">{currentPersona?.email || 'admin@metro.gov'}</p>
            <p className="text-xs text-[#667384] mt-0.5">Role: System Architect & Platform Oversight</p>
          </div>
        </div>

        <div className="pt-6 space-y-6">
          <h2 className="text-base font-bold text-[#18232F]">Root Security Credentials</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E7ED]">
              <span className="text-xs text-[#667384]">Hardware Key Authentication</span>
              <p className="font-semibold text-[#18232F] mt-1">FIDO2 / WebAuthn Active</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E7ED]">
              <span className="text-xs text-[#667384]">Session Isolation</span>
              <p className="font-semibold text-[#18232F] mt-1">Zero-Trust Ephemeral TLS 1.3</p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-[#E2E7ED]">
            <span className="text-xs text-[#667384]">Session managed via Spring Security HTTP-only cookie</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Authenticated Session Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfilePage;
