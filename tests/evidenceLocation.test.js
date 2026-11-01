import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { workerService } from '../src/services/workerService.js';
import { officerService } from '../src/services/officerService.js';
import { mapBackendComplaintToFrontend } from '../src/services/complaintService.js';
import { apiClient } from '../src/services/apiClient.js';

describe('Evidence Location Verification Tests (Phase A3)', () => {

  test('mapBackendComplaintToFrontend correctly extracts evidence location fields', () => {
    const backendData = {
      id: 'comp-uuid-1',
      referenceId: 'CF-2026-LOC99',
      title: 'Pothole fixed',
      status: 'RESOLUTION_SUBMITTED',
      latitude: '12.971600',
      longitude: '77.594600',
      evidence: [
        {
          id: 'ev-1',
          photoUrl: '/api/complaints/evidence/files/ev1.jpg',
          evidenceNotes: 'Patch completed',
          latitude: '12.971780',
          longitude: '77.594600',
          locationCheck: 'WITHIN_RANGE',
          distanceMeters: '19.8',
          accuracyMeters: '12.5',
          locationNote: null,
          workerName: 'Marcus Technician'
        }
      ]
    };

    const mapped = mapBackendComplaintToFrontend(backendData);
    assert.ok(mapped.resolutionEvidence);
    assert.equal(mapped.resolutionEvidence.locationCheck, 'WITHIN_RANGE');
    assert.equal(mapped.resolutionEvidence.distanceMeters, 19.8);
    assert.equal(mapped.resolutionEvidence.accuracyMeters, 12.5);
    assert.equal(mapped.resolutionEvidence.locationNote, null);
    assert.equal(mapped.resolutionEvidence.workerName, 'Marcus Technician');
  });

  test('mapBackendComplaintToFrontend maps flagged locationCheck and locationNote', () => {
    const backendData = {
      id: 'comp-uuid-2',
      referenceId: 'CF-2026-LOC98',
      title: 'Water valve replaced',
      status: 'RESOLUTION_SUBMITTED',
      latitude: '12.971600',
      longitude: '77.594600',
      evidence: [
        {
          id: 'ev-2',
          photoUrl: '/api/complaints/evidence/files/ev2.jpg',
          evidenceNotes: 'Valve replaced',
          latitude: '12.976100',
          longitude: '77.594600',
          locationCheck: 'OUT_OF_RANGE',
          distanceMeters: '500.5',
          accuracyMeters: '10.0',
          locationNote: 'Shutoff valve located 500m up-pipe at station 3',
          workerName: 'Marcus Technician'
        }
      ]
    };

    const mapped = mapBackendComplaintToFrontend(backendData);
    assert.ok(mapped.resolutionEvidence);
    assert.equal(mapped.resolutionEvidence.locationCheck, 'OUT_OF_RANGE');
    assert.equal(mapped.resolutionEvidence.distanceMeters, 500.5);
    assert.equal(mapped.resolutionEvidence.locationNote, 'Shutoff valve located 500m up-pipe at station 3');
  });

  test('workerService.submitEvidence appends locationNote and coordinates into FormData', async () => {
    const originalSubmitEvidence = apiClient.complaints.submitEvidence;
    const originalGetById = apiClient.complaints.getById;
    const originalGetHistory = apiClient.complaints.getHistory;

    let capturedFormData = null;

    try {
      apiClient.complaints.submitEvidence = async (taskId, formData) => {
        capturedFormData = formData;
        return { success: true };
      };

      apiClient.complaints.getById = async (taskId) => ({
        id: taskId,
        referenceId: 'CF-2026-00124',
        status: 'RESOLUTION_SUBMITTED'
      });

      apiClient.complaints.getHistory = async () => [];

      const dummyFile = new Blob(['sample-photo-data'], { type: 'image/jpeg' });

      await workerService.submitEvidence('comp-uuid-1', {
        notes: 'Pothole patch completed with cold-mix asphalt.',
        files: [dummyFile],
        latitude: 12.97178,
        longitude: 77.59460,
        accuracy: 15,
        locationNote: 'Work completed at pump station 500m down',
        deviceReported: true
      });

      assert.ok(capturedFormData, 'FormData must be passed to apiClient.complaints.submitEvidence');
      assert.equal(capturedFormData.get('notes'), 'Pothole patch completed with cold-mix asphalt.');
      assert.equal(capturedFormData.get('latitude'), '12.97178');
      assert.equal(capturedFormData.get('longitude'), '77.5946');
      assert.equal(capturedFormData.get('accuracy'), '15');
      assert.equal(capturedFormData.get('locationNote'), 'Work completed at pump station 500m down');
      assert.equal(capturedFormData.get('deviceReported'), 'true');
    } finally {
      apiClient.complaints.submitEvidence = originalSubmitEvidence;
      apiClient.complaints.getById = originalGetById;
      apiClient.complaints.getHistory = originalGetHistory;
    }
  });

  test('officerService.verifyResolution passes locationAcknowledgement to backend', async () => {
    const originalUpdateStatus = apiClient.complaints.updateStatus;
    let capturedPayload = null;

    try {
      apiClient.complaints.updateStatus = async (complaintId, payload) => {
        capturedPayload = payload;
        return {
          id: complaintId,
          status: 'PENDING_CITIZEN_CONFIRMATION'
        };
      };

      await officerService.verifyResolution(
        'comp-uuid-1',
        'APPROVE',
        'Inspected photo evidence; matches defect perimeter.',
        'Acknowledged pump station location discrepancy: cross-verified with municipal asset map.'
      );

      assert.ok(capturedPayload);
      assert.equal(capturedPayload.status, 'PENDING_CITIZEN_CONFIRMATION');
      assert.equal(capturedPayload.notes, 'Inspected photo evidence; matches defect perimeter.');
      assert.equal(
        capturedPayload.locationAcknowledgement,
        'Acknowledged pump station location discrepancy: cross-verified with municipal asset map.'
      );
    } finally {
      apiClient.complaints.updateStatus = originalUpdateStatus;
    }
  });

  test('Client-side Haversine calculation distance check', () => {
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180.0;
      const dLon = (lon2 - lon1) * Math.PI / 180.0;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180.0) * Math.cos(lat2 * Math.PI / 180.0) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    };

    // ~20m distance
    const dist20m = haversine(12.971600, 77.594600, 12.971780, 77.594600);
    assert.ok(dist20m >= 19.0 && dist20m <= 21.0, `Expected ~20m, got ${dist20m}`);

    // ~500m distance
    const dist500m = haversine(12.971600, 77.594600, 12.976100, 77.594600);
    assert.ok(dist500m >= 495.0 && dist500m <= 505.0, `Expected ~500m, got ${dist500m}`);

    // Exact same coordinates gives 0m
    const dist0m = haversine(12.971600, 77.594600, 12.971600, 77.594600);
    assert.equal(dist0m, 0.0);
  });
});

