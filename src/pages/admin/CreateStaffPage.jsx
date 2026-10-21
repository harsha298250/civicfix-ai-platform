import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Breadcrumb from '../../components/common/Breadcrumb';

const CreateStaffPage = () => {
  const navigate = useNavigate();
  const { addStaffUser, showToast } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'OFFICER',
    department: 'Roads & Public Infrastructure',
    badgeId: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Full legal name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = 'Valid municipal email is required';
    if (!formData.department.trim()) newErrors.department = 'Department selection is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newUser = addStaffUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '+91 94440 00000',
        role: formData.role,
        department: formData.department,
        badgeId: formData.badgeId || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'Active',
      });

      showToast(`Provisioned new staff account for ${newUser.name} (${newUser.role})`);
      setIsSubmitting(false);
      navigate(`/admin/users/${newUser.id}`);
    }, 600);
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
            Create verified municipal credentials for Officers, Field Workers, or System Administrators.
          </p>
        </div>

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
                Authorized Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm border border-[#E2E7ED] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              >
                <option value="OFFICER">Municipal Officer (Review & Dispatch)</option>
                <option value="WORKER">Field Worker (Repairs & Evidence)</option>
                <option value="ADMIN">System Administrator (Full Oversight)</option>
              </select>
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
                <option value="Municipal IT & Platform Administration">Municipal IT & Platform Administration</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Badge / Personnel ID (Optional)
              </label>
              <input
                type="text"
                name="badgeId"
                value={formData.badgeId}
                onChange={handleChange}
                placeholder="e.g. PW-8821"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E2E7ED] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137A70]"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18232F] uppercase mb-1.5">
                Contact Phone
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
              Automated Temporary Password & Credential Handshake
            </p>
            When submitted, a secure temporary activation token will be generated. The staff member will receive an activation email with mandatory 2FA TOTP setup upon their first sign-in.
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
                  Provisioning...
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
