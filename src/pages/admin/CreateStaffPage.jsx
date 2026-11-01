import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { adminService } from '../../services/adminService';
import Breadcrumb from '../../components/common/Breadcrumb';

const CreateStaffPage = () => {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'OFFICER',
    department: 'Roads & Public Infrastructure',
    temporaryPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, temporaryPassword: pwd }));
    if (errors.temporaryPassword) {
      setErrors((prev) => ({ ...prev, temporaryPassword: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Full legal name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = 'Valid municipal email is required';
    if (!formData.department.trim()) newErrors.department = 'Department selection is required';
    if (!formData.temporaryPassword || formData.temporaryPassword.length < 8) {
      newErrors.temporaryPassword = 'Temporary password must be at least 8 characters';
    }
    if (formData.role !== 'OFFICER' && formData.role !== 'WORKER') {
      newErrors.role = 'Authorized staff role must be OFFICER or WORKER';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const newUser = await adminService.createStaff({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        role: formData.role,
        department: formData.department,
        temporaryPassword: formData.temporaryPassword
      });

      showToast(`Provisioned new staff account for ${newUser.name} (${newUser.role}) in PostgreSQL`, 'success');
      navigate(`/admin/users/${newUser.id}`);
    } catch (err) {
      console.error('Failed to create staff account:', err);
      setServerError(err?.message || 'Failed to provision staff account. Please verify input.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin Console', to: '/admin/dashboard' },
          { label: 'User Directory', to: '/admin/users' },
          { label: 'Provision Staff', to: '/admin/users/new' },
        ]}
      />

      <div className="bg-white rounded-xl border border-[#E2E7ED] shadow-sm p-6 sm:p-8">
        <div className="border-b border-[#E2E7ED] pb-5 mb-6">
          <h1 className="text-2xl font-bold text-[#18232F] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#137A70] text-3xl">badge</span>
            Provision Official Staff Account
          </h1>
          <p className="text-sm text-[#667384] mt-1">
            Create verified municipal credentials for Officers or Field Workers with a validated temporary password.
          </p>
        </div>

        {serverError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs font-semibold">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Full Legal Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Officer Nathan Vance"
                className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70] ${
                  errors.name ? 'border-[#C63F48]' : 'border-[#E2E7ED]'
                }`}
              />
              {errors.name && <p className="text-xs text-[#C63F48] mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Official Municipal Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nathan.vance@metro.gov"
                className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70] ${
                  errors.email ? 'border-[#C63F48]' : 'border-[#E2E7ED]'
                }`}
              />
              {errors.email && <p className="text-xs text-[#C63F48] mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Authorized Staff Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E2E7ED] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              >
                <option value="OFFICER">Municipal Officer (Review & Dispatch)</option>
                <option value="WORKER">Field Worker (Repairs & Evidence)</option>
              </select>
              {errors.role && <p className="text-xs text-[#C63F48] mt-1">{errors.role}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Assigned Department *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E2E7ED] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              >
                <option value="Roads & Public Infrastructure">Roads & Public Infrastructure</option>
                <option value="Public Works & Sanitation">Public Works & Sanitation</option>
                <option value="Water Supply & Sewage Management">Water Supply & Sewage Management</option>
                <option value="Municipal Traffic & Electrical">Municipal Traffic & Electrical</option>
                <option value="Parks & Urban Environment">Parks & Urban Environment</option>
                <option value="Health & Vector Control">Health & Vector Control</option>
              </select>
              {errors.department && <p className="text-xs text-[#C63F48] mt-1">{errors.department}</p>}
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#18232F] uppercase">
                  Temporary Activation Password * (min. 8 characters)
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-xs text-[#137A70] hover:underline font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                  Generate Strong Password
                </button>
              </div>
              <input
                type="text"
                name="temporaryPassword"
                value={formData.temporaryPassword}
                onChange={handleChange}
                placeholder="Temporary secure password (e.g. SecureStaff@2026)"
                className={`w-full px-3.5 py-2.5 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70] ${
                  errors.temporaryPassword ? 'border-[#C63F48]' : 'border-[#E2E7ED]'
                }`}
              />
              {errors.temporaryPassword && (
                <p className="text-xs text-[#C63F48] mt-1">{errors.temporaryPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Contact Phone (Optional)
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 94440 12345"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              />
            </div>
          </div>

          <div className="bg-[#E8F4F1] border border-[#137A70]/30 rounded-lg p-4 text-xs text-[#137A70]">
            <p className="font-semibold flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              PostgreSQL Credential Hashing & Audit Record
            </p>
            When submitted, credentials are encrypted via BCrypt and securely stored in the PostgreSQL database. An immutable security audit log event is recorded with the administrator's ID.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E7ED]">
            <Link
              to="/admin/users"
              className="px-5 py-2.5 text-sm font-semibold text-[#667384] hover:text-[#18232F] border border-[#E2E7ED] rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#137A70] hover:bg-[#0F625B] rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Provisioning in PostgreSQL...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Create & Issue Credentials
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStaffPage;
