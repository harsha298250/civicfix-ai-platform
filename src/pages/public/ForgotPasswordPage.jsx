import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';

export const ForgotPasswordPage = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 sm:p-6 bg-surface">
      <div className="w-full max-w-md mx-auto bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-xl border border-outline-variant/40 space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-semibold mb-3">
            <span className="material-symbols-outlined text-[16px] text-primary">info</span>
            <span>Municipal Access Notice</span>
          </div>
          <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
            {t('auth.forgotPasswordTitle', 'Password Assistance')}
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-2 leading-relaxed">
            {t(
              'auth.forgotPasswordNotice',
              'Password reset via automated email is not available in this version. In this release of the CivicFix AI platform, outbound mail services are not configured.'
            )}
          </p>
        </div>

        {/* Informational Guidance Box */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">contact_support</span>
            <div className="space-y-1">
              <strong className="text-on-surface block font-semibold">How to reset your password:</strong>
              <p className="text-on-surface-variant leading-relaxed">
                {t(
                  'auth.forgotPasswordContact',
                  'To recover or reset your account credentials, please contact the system administrator or your municipal administrative authority.'
                )}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-outline-variant/20 space-y-2 text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-secondary">person</span>
              <span>
                {t(
                  'auth.forgotPasswordCitizenNote',
                  'Residents: Contact your municipal office or administrator with your registered email address.'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-secondary">badge</span>
              <span>
                {t(
                  'auth.forgotPasswordStaffNote',
                  'Staff & Technicians: Contact your IT administrator or department supervisor for credential assistance.'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Return to Sign In */}
        <div className="pt-2 text-center">
          <Link
            to="/login"
            className="w-full h-11 rounded-xl bg-primary-container hover:bg-primary text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>{t('auth.backToSignIn', 'Return to Sign In')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
