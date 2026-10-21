import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { ImageUploadManager } from '../../components/common/ImageUploadManager';
import { COMPLAINT_STATUS } from '../../constants/statusConstants';

export const SubmitEvidencePage = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { complaints, refreshComplaints, addAuditLog, showToast, currentUser } = useApp();

  const task = complaints.find((c) => c.id.toLowerCase() === (taskId || '').toLowerCase());

  const [notes, setNotes] = useState(
    'Road base excavated, loose debris cleared, hot-mix bitumen binder layered and compacted flush using 1.5-ton hydraulic roller rig. Surface cured.'
  );

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
  const [photoObjects, setPhotoObjects] = useState([
    {
      id: 'initial_proof_1',
      url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
      name: 'compaction_completed.jpg',
      sizeFormatted: '1.2 MB',
      isLocal: false,
      source: 'Initial Field Photo'
    }
  ]);
  const [gpsVerified, setGpsVerified] = useState(true);
  const [deviceCoords, setDeviceCoords] = useState(
    task.location?.coordinates || { lat: 13.0850, lng: 80.2101 }
  );
  const [gpsRefreshing, setGpsRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(task?.status === COMPLAINT_STATUS.RESOLUTION_SUBMITTED);

  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const handleRefreshGps = async () => {
    setGpsRefreshing(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setDeviceCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
            showToast(`GPS Coordinates refreshed: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`, 'success');
            setGpsRefreshing(false);
          },
          () => {
            showToast('Device GPS not responsive. Using work order coordinates.', 'warning');
            setGpsRefreshing(false);
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      }
    } catch (e) {
      setGpsRefreshing(false);
    }
  };

  if (!task) {
    return <div className="text-center py-12">Task not found.</div>;
  }

  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      alert('Please provide detailed completion notes.');
      return;
    }
    setSubmitting(true);
    try {
      const photoUrls = photoObjects.map((p) => p.url);

      // Rule: Transitions to RESOLUTION_SUBMITTED, NEVER directly to RESOLVED!
      await complaintService.submitEvidence(task.id, {
        notes,
        photos: photoUrls,
        gpsVerified,
        completionTime: '4h 12m'
      });

      addAuditLog(
        'SUBMIT_EVIDENCE',
        `Task #${task.id}`,
        `Technician ${currentUser.name} submitted repair photos and notes for verification.`
      );
      await refreshComplaints();
      setSubmittedSuccess(true);
      showToast('Repair evidence submitted! Case transitioned to RESOLUTION_SUBMITTED for Officer sign-off.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Submission failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Field Ops', path: '/worker/dashboard', icon: 'engineering' },
          { label: 'Tasks', path: '/worker/tasks' },
          { label: `Evidence #${task.id}` }
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-code text-xs font-bold bg-surface-container text-on-surface px-2 py-0.5 rounded">
              #{task.id}
            </span>
            <StatusBadge status={task.status} size="sm" />
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Repair Evidence Submission
          </h1>
          <p className="text-body-md text-sm text-on-surface-variant mt-1">
            {task.title} • {task.location?.address}
          </p>
        </div>
      </div>

      {/* Confirmation State if submitted */}
      {submittedSuccess ? (
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 shadow-sm text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]">hourglass_top</span>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800">
              STATUS: RESOLUTION_SUBMITTED
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Evidence Logged — Awaiting Municipal Officer Verification
            </h2>
            <p className="text-xs text-on-surface-variant max-w-lg mx-auto leading-relaxed">
              In accordance with municipal compliance rules, this work order will not be marked as <strong>RESOLVED</strong> until authorized Officer Elena Vance audits the photographic proof and signs the approval certificate.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low max-w-md mx-auto text-left text-xs space-y-2 border border-outline-variant/30">
            <div className="flex justify-between">
              <span className="text-tertiary">Inspection Queue:</span>
              <span className="font-semibold text-secondary">Active in Officer Queue</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Assigned Officer:</span>
              <span className="font-semibold text-on-surface">Elena Vance (Zone 4)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Location Coordinates:</span>
              <span className="font-mono text-emerald-700">
                {task.location?.coordinates?.lat.toFixed(4)}° N, {task.location?.coordinates?.lng.toFixed(4)}° E
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/worker/dashboard"
              className="px-5 py-2.5 rounded-xl bg-primary-container text-white text-xs font-semibold shadow hover:bg-primary"
            >
              Back to My Dashboard
            </Link>
            <Link
              to={`/officer/verifications/${task.id}`}
              className="px-5 py-2.5 rounded-xl bg-secondary text-white text-xs font-semibold shadow hover:bg-secondary-container flex items-center gap-1.5"
            >
              <span>Switch to Officer Verification View</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Form view */
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 space-y-6">
          <div className="p-4 rounded-xl bg-surface-container-low flex items-start gap-3 border border-outline-variant/30 text-xs">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">policy</span>
            <div>
              <strong className="block text-on-surface font-semibold">Strict Verification Boundary</strong>
              <p className="text-on-surface-variant leading-relaxed">
                Submitting this form transitions the ticket to <strong>RESOLUTION_SUBMITTED</strong>. It will NOT automatically resolve the ticket. Only authorized municipal officer inspection completes final resolution.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitEvidence} className="space-y-5">
            {/* Completion Description */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-on-surface">
                Repair Completion Narrative & Engineering Notes *
              </label>
              <textarea
                rows={4}
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detail procedures carried out, compaction density, curing time, and tools used..."
                className="w-full p-3.5 bg-surface-container-low rounded-xl text-xs text-on-surface border border-transparent focus:border-primary-container focus:outline-none"
              />
            </div>

            {/* Photo Proof Upload with Camera */}
            <div className="space-y-2">
              <ImageUploadManager
                photos={photoObjects}
                onChange={setPhotoObjects}
                maxPhotos={5}
                allowSampleDemo={true}
                label="Repair Completion Photographic Proof *"
                helperText="Take live camera pictures of the repaired defect or choose from phone storage."
              />
            </div>

            {/* Geotag Certification */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-on-surface">
                <input
                  type="checkbox"
                  checked={gpsVerified}
                  onChange={(e) => setGpsVerified(e.target.checked)}
                  className="rounded text-primary-container"
                />
                <span>
                  Geotag Stamp: Attach current device coordinates (
                  {deviceCoords?.lat ? Number(deviceCoords.lat).toFixed(4) : (task.location?.coordinates?.lat?.toFixed(4) || '13.0850')}° N,{' '}
                  {deviceCoords?.lng ? Number(deviceCoords.lng).toFixed(4) : (task.location?.coordinates?.lng?.toFixed(4) || '80.2101')}° E)
                </span>
              </label>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleRefreshGps}
                  disabled={gpsRefreshing}
                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-[11px] font-semibold text-on-surface transition-colors flex items-center gap-1 border border-outline-variant/30"
                >
                  <span className={`material-symbols-outlined text-[13px] text-primary-container ${gpsRefreshing ? 'animate-spin' : ''}`}>
                    my_location
                  </span>
                  <span>{gpsRefreshing ? 'Acquiring...' : 'Refresh GPS'}</span>
                </button>
                <span className="font-mono text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  GPS Linked
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30">
              <Link
                to={`/worker/tasks/${task.id}/progress`}
                className="text-xs text-tertiary hover:text-on-surface font-semibold"
              >
                Back to Progress Notes
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-secondary hover:bg-secondary-container text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    <span>Submitting Evidence...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    <span>Submit Repair Proof for Verification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SubmitEvidencePage;
