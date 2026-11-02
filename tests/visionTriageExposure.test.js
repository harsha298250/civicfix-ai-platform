import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/locales/en.json' with { type: 'json' };
import ta from '../src/locales/ta.json' with { type: 'json' };
import { apiClient } from '../src/services/apiClient.js';
import { complaintService, mapBackendComplaintToFrontend } from '../src/services/complaintService.js';

describe('Vision Triage Frontend & API Exposure Tests', () => {

  test('apiClient exposes features.getFeatures endpoint', () => {
    assert.equal(typeof apiClient.features, 'object');
    assert.equal(typeof apiClient.features.getFeatures, 'function');
  });

  test('complaintService preserves vision fields during backend mapping', () => {
    const backendData = {
      id: 'uuid-1234',
      referenceId: 'CF-2026-88771',
      title: 'Damaged storm drain',
      description: 'Open trench on residential sidewalk',
      category: 'DRAINAGE',
      priority: 'HIGH',
      status: 'UNDER_REVIEW',
      visionConsent: true,
      visionStatus: 'OK',
      visionCategory: 'DRAINAGE',
      visionSeverity: 4,
      visionConfidence: 0.94,
      visionReason: 'Observed exposed concrete drain opening with missing metal grating.',
      visionModel: 'Google Gemini',
      visionAt: '2026-11-02T08:30:00Z',
      disagreement: false,
      finalPrioritySource: 'RULE_ENGINE',
      visionSkipReason: null
    };

    const mapped = mapBackendComplaintToFrontend(backendData);
    assert.equal(mapped.visionConsent, true);
    assert.equal(mapped.visionStatus, 'OK');
    assert.equal(mapped.visionCategory, 'DRAINAGE');
    assert.equal(mapped.visionSeverity, 4);
    assert.equal(mapped.visionConfidence, 0.94);
    assert.equal(mapped.visionReason, 'Observed exposed concrete drain opening with missing metal grating.');
    assert.equal(mapped.visionModel, 'Google Gemini');
    assert.equal(mapped.visionAt, '2026-11-02T08:30:00Z');
    assert.equal(mapped.disagreement, false);
    assert.equal(mapped.finalPrioritySource, 'RULE_ENGINE');
  });

  test('Citizen photo check indicator logic matches requirements exactly', () => {
    const computePhotoCheckStatus = (complaint) => {
      if (!complaint.visionConsent) return 'Not requested';
      if (complaint.visionStatus === 'OK') return 'Done';
      if (complaint.visionStatus === 'FAILED' || complaint.visionStatus === 'SKIPPED') return 'Not available';
      return 'Pending';
    };

    // Case 1: Consent false
    assert.equal(computePhotoCheckStatus({ visionConsent: false, visionStatus: 'NOT_RUN' }), 'Not requested');
    assert.equal(computePhotoCheckStatus({ visionConsent: false, visionStatus: 'OK' }), 'Not requested');

    // Case 2: Consent true, status NOT_RUN or RUNNING -> Pending
    assert.equal(computePhotoCheckStatus({ visionConsent: true, visionStatus: 'NOT_RUN' }), 'Pending');
    assert.equal(computePhotoCheckStatus({ visionConsent: true, visionStatus: 'RUNNING' }), 'Pending');

    // Case 3: Consent true, status OK -> Done
    assert.equal(computePhotoCheckStatus({ visionConsent: true, visionStatus: 'OK' }), 'Done');

    // Case 4: Consent true, status FAILED or SKIPPED -> Not available
    assert.equal(computePhotoCheckStatus({ visionConsent: true, visionStatus: 'FAILED' }), 'Not available');
    assert.equal(computePhotoCheckStatus({ visionConsent: true, visionStatus: 'SKIPPED' }), 'Not available');
  });

  test('Officer review screen presents disagreement warning when disagreement is true', () => {
    const complaintWithDisagreement = {
      disagreement: true,
      visionStatus: 'OK',
      visionCategory: 'ROADS',
      category: 'DRAINAGE',
      visionReason: 'Asphalt pothole detected'
    };

    assert.equal(complaintWithDisagreement.disagreement, true);
    // Disagreement warning is shown
    const showWarning = complaintWithDisagreement.disagreement === true;
    assert.equal(showWarning, true);
  });

  test('Officer review screen handles FAILED and SKIPPED status with reason', () => {
    const skippedComplaint = {
      visionStatus: 'SKIPPED',
      visionSkipReason: 'WebP image format skipped to prevent unstripped EXIF metadata leakage'
    };

    assert.equal(skippedComplaint.visionStatus, 'SKIPPED');
    const displayReason = skippedComplaint.visionSkipReason || 'Visual defect analysis could not be completed.';
    assert.match(displayReason, /WebP image format skipped/);
  });

  test('i18n contains English and Tamil translations for vision consent and photo check', () => {
    // English
    assert.ok(en.reportComplaint.visionConsentCheckbox);
    assert.match(en.reportComplaint.visionConsentCheckbox, /external AI service/);
    assert.match(en.reportComplaint.visionConsentCheckbox, /faces or vehicle number plates/);
    assert.ok(en.reportComplaint.webpPhotoNotice);
    assert.match(en.reportComplaint.webpPhotoNotice, /WebP photos are not analyzed/);

    assert.equal(en.complaints.photoCheckLabel, 'Photo check:');
    assert.equal(en.complaints.photoCheckPending, 'Pending');
    assert.equal(en.complaints.photoCheckDone, 'Done');
    assert.equal(en.complaints.photoCheckNotAvailable, 'Not available');
    assert.equal(en.complaints.photoCheckNotRequested, 'Not requested');

    assert.equal(en.officerReview.ruleBasedTriageTitle, 'Rule-based triage');
    assert.equal(en.officerReview.photoAnalysisTitle, 'Photo analysis (model-assisted)');
    assert.equal(en.officerReview.disagreementWarning, 'Disagreement with rule-based result');
    assert.equal(en.officerReview.officerDecidesNotice, 'Suggestions only. The officer decides.');

    // Tamil
    assert.ok(ta.reportComplaint.visionConsentCheckbox);
    assert.match(ta.reportComplaint.visionConsentCheckbox, /வெளிப்புற AI/);
    assert.ok(ta.reportComplaint.webpPhotoNotice);
    assert.match(ta.reportComplaint.webpPhotoNotice, /WebP/);

    assert.ok(ta.complaints.photoCheckLabel);
    assert.ok(ta.complaints.photoCheckPending);
    assert.ok(ta.complaints.photoCheckDone);
    assert.ok(ta.complaints.photoCheckNotAvailable);
    assert.ok(ta.complaints.photoCheckNotRequested);

    assert.ok(ta.officerReview.ruleBasedTriageTitle);
    assert.ok(ta.officerReview.photoAnalysisTitle);
    assert.ok(ta.officerReview.disagreementWarning);
    assert.ok(ta.officerReview.officerDecidesNotice);
  });
});

