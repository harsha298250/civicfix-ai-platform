import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { currentPersona } = useApp();

  const getDashboardPath = () => {
    switch (currentPersona.role) {
      case 'OFFICER':
        return '/officer/dashboard';
      case 'WORKER':
        return '/worker/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/citizen/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E2E7ED] shadow-sm p-8 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#137A70] flex items-center justify-center mx-auto border border-teal-100">
          <span className="material-symbols-outlined text-4xl">travel_explore</span>
        </div>

        <div>
          <span className="text-xs font-bold text-[#137A70] uppercase tracking-wider">404 Error</span>
          <h1 className="text-2xl font-bold text-[#18232F] mt-1">Page Not Found</h1>
          <p className="text-sm text-[#667384] mt-2">
            The municipal page or ticket route you are looking for does not exist or has been relocated.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-[#18232F] bg-white border border-[#E2E7ED] rounded-xl hover:bg-slate-50 transition-colors"
          >
            Go Back
          </button>
          <Link
            to={getDashboardPath()}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-[#137A70] hover:bg-[#0F625B] rounded-xl transition-colors shadow-sm"
          >
            My Dashboard
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-[#667384] hover:text-[#18232F] transition-colors"
          >
            Public Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
