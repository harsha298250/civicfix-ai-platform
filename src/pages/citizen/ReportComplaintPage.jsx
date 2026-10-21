import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { complaintService } from '../../services/complaintService';
import { CATEGORIES } from '../../constants/statusConstants';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { ImageUploadManager } from '../../components/common/ImageUploadManager';
import { TamilNaduLocationPicker } from '../../components/common/TamilNaduLocationPicker';
import { geolocationService } from '../../services/geolocationService';

export const ReportComplaintPage = () => {
  const navigate = useNavigate();
  const { currentUser, refreshComplaints, showToast } = useApp();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    categoryId: 'roads',
    description: '',
    priority: 'HIGH',
    address: 'Anna Salai, Near Spencer Plaza, Chennai',
    ward: 'Zone 09, Teynampet',
    landmark: '',
    coordinates: { lat: 13.0604, lng: 80.2642 },
    accuracyMeters: null,
    locationConfirmed: true,
    photos: []
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const [errors, setErrors] = useState({});

  // Geolocation state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [showGeoPrompt, setShowGeoPrompt] = useState(false);
  const [geoSuccessNote, setGeoSuccessNote] = useState('');

  // Handle location detection via navigator.geolocation
  const handleDetectLocation = async () => {
    setShowGeoPrompt(false);
    setGeoLoading(true);
    setGeoError('');
    setGeoSuccessNote('');

    try {
      const position = await geolocationService.getCurrentPosition();
      const { lat, lng, accuracyMeters } = position;

      // Reverse geocode to address
      const geoResult = await geolocationService.reverseGeocode(lat, lng);

      setFormData((prev) => ({
        ...prev,
        coordinates: { lat, lng },
        accuracyMeters: accuracyMeters || null,
        address: geoResult.streetAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        ward: geoResult.cityDistrict || prev.ward,
        locationConfirmed: true
      }));

      setGeoSuccessNote(
        `Device location locked (${accuracyMeters ? `±${accuracyMeters}m accuracy` : 'GPS active'}). Address resolved via OpenStreetMap.`
      );
      showToast('Detected your location and resolved address!', 'success');
    } catch (err) {
      console.warn('Geolocation detection failure:', err);
      setGeoError(err.message || 'Unable to retrieve device coordinates.');
      showToast('Location detection failed. You can enter your address manually.', 'warning');
    } finally {
      setGeoLoading(false);
    }
  };

  // Handle location update from Tamil Nadu map pin drag/click
  const handleMapLocationSelect = async (loc) => {
    setGeoError('');
    setGeoSuccessNote('');

    const newCoords = { lat: loc.lat, lng: loc.lng };
    setFormData((prev) => ({
      ...prev,
      coordinates: newCoords,
      accuracyMeters: null // reset device sensor accuracy since pin was manually positioned
    }));

    // Trigger reverse geocoding for new pin
    const geoResult = await geolocationService.reverseGeocode(loc.lat, loc.lng);
    if (geoResult.success && geoResult.streetAddress) {
      setFormData((prev) => ({
        ...prev,
        address: loc.address || geoResult.streetAddress,
        ward: geoResult.cityDistrict || prev.ward,
        locationConfirmed: true
      }));
    }
  };

  // Handle locating the user-typed address onto the interactive map
  const handleLocateAddressOnMap = async (customQuery) => {
    const query = typeof customQuery === 'string' ? customQuery : formData.address;
    if (!query || !query.trim()) return;
    setGeoLoading(true);
    setGeoError('');
    try {
      const loc = await geolocationService.searchLocation(query);
      if (loc && loc.lat && loc.lng) {
        setFormData((prev) => ({
          ...prev,
          coordinates: { lat: loc.lat, lng: loc.lng },
          address: loc.streetAddress || query,
          ward: loc.cityDistrict || prev.ward,
          accuracyMeters: null,
          locationConfirmed: true
        }));
        setGeoSuccessNote(`Pin & Coordinates updated: ${loc.lat.toFixed(5)}° N, ${loc.lng.toFixed(5)}° E (${loc.streetAddress || query})`);
        showToast(`Located "${loc.streetAddress || query}" on map!`, 'success');
      } else {
        showToast('Could not resolve address automatically. You can click or drag the pin on the map.', 'info');
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
    } finally {
      setGeoLoading(false);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = 'Please provide a clear title for the issue.';
      if (!formData.description.trim()) newErrors.description = 'Please describe the defect in detail.';
    }
    if (step === 3) {
      if (!formData.address.trim()) newErrors.address = 'Please provide a physical street or location.';
      if (!formData.locationConfirmed) newErrors.locationConfirmed = 'Please confirm this location before proceeding.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(3)) {
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const selectedCat = CATEGORIES.find((c) => c.id === formData.categoryId) || CATEGORIES[0];
      const photoUrls =
        formData.photos.length > 0
          ? formData.photos.map((p) => p.url)
          : ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'];

      const created = await complaintService.create({
        title: formData.title,
        category: selectedCat.name,
        categoryId: formData.categoryId,
        description: formData.description,
        priority: formData.priority,
        address: formData.address,
        ward: formData.ward,
        landmark: formData.landmark,
        coordinates: formData.coordinates,
        accuracyMeters: formData.accuracyMeters,
        photos: photoUrls,
        citizenId: currentUser.id,
        citizenName: currentUser.name,
        citizenEmail: currentUser.email
      });

      await refreshComplaints();
      setSubmittedComplaint(created);
      showToast('Complaint submitted successfully and queued for review!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Submission failed. Please check form fields.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = CATEGORIES.find((c) => c.id === formData.categoryId) || CATEGORIES[0];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: 'Citizen Portal', path: '/citizen/dashboard', icon: 'home' },
          { label: 'Complaints', path: '/citizen/complaints' },
          { label: 'Report Defect' }
        ]}
      />

      {/* Confirmation State */}
      {submittedComplaint ? (
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 shadow-sm text-center max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
            <span className="material-symbols-outlined text-[36px]">verified</span>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="font-code text-xs font-bold text-primary-container px-3 py-1 rounded-full bg-surface-container">
                TICKET #{submittedComplaint.referenceId || submittedComplaint.id}
              </span>
              {submittedComplaint.isLiveBackend ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="material-symbols-outlined text-[13px]">cloud_done</span>
                  PostgreSQL Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  Offline Demo Mode
                </span>
              )}
            </div>
            <h2 className="font-headline-sm text-2xl font-bold text-on-surface">
              Complaint Successfully Registered
            </h2>
            <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">
              Your report has been logged and queued for municipal officer triage and field inspection.
            </p>
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl text-left text-xs space-y-2 border border-outline-variant/30">
            <div className="flex justify-between py-1 border-b border-outline-variant/30">
              <span className="text-tertiary">Category</span>
              <span className="font-semibold text-on-surface">{submittedComplaint.category}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-outline-variant/30">
              <span className="text-tertiary">Location</span>
              <span className="font-semibold text-on-surface text-right max-w-xs truncate">
                {submittedComplaint.location?.address}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-outline-variant/30">
              <span className="text-tertiary">Coordinates</span>
              <span className="font-code text-on-surface">
                {submittedComplaint.location?.coordinates?.lat.toFixed(5)}° N,{' '}
                {submittedComplaint.location?.coordinates?.lng.toFixed(5)}° E
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-tertiary">Initial Status</span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container font-semibold text-primary-container">
                {submittedComplaint.status}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to={`/citizen/complaints/${submittedComplaint.id}`}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">track_changes</span>
              <span>Track Resolution Timeline</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedComplaint(null);
                setCurrentStep(1);
                setFormData({
                  title: '',
                  categoryId: 'roads',
                  description: '',
                  priority: 'HIGH',
                  address: 'Anna Salai, Chennai',
                  ward: 'Zone 09, Teynampet',
                  landmark: '',
                  coordinates: { lat: 13.0604, lng: 80.2642 },
                  accuracyMeters: null,
                  locationConfirmed: true,
                  photos: []
                });
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl transition-all"
            >
              File Another Report
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-headline-sm text-2xl font-bold text-on-surface">Report a Civic Issue</h1>
              <p className="text-body-sm text-on-surface-variant">
                Submit an infrastructure defect with authentic photographs, GPS, and detailed narrative.
              </p>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30">
            <div className="grid grid-cols-4 gap-2">
              {[
                { num: 1, label: 'Defect Details' },
                { num: 2, label: 'Photographs' },
                { num: 3, label: 'Location & Map' },
                { num: 4, label: 'Review & File' }
              ].map((s) => {
                const isActive = currentStep === s.num;
                const isPassed = currentStep > s.num;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (s.num < currentStep || validateStep(currentStep)) {
                        setCurrentStep(s.num);
                      }
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-surface-container-low border border-primary-container/40'
                        : isPassed
                        ? 'opacity-80'
                        : 'opacity-50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive
                          ? 'bg-primary-container text-white shadow-sm'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-surface-container text-tertiary'
                      }`}
                    >
                      {isPassed ? (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      ) : (
                        s.num
                      )}
                    </div>
                    <div className="min-w-0 hidden sm:block">
                      <p className="text-[10px] uppercase font-bold text-tertiary">Step {s.num}</p>
                      <p className="text-xs font-semibold text-on-surface truncate">{s.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Workspace Grid: Left Form (7 cols) + Right AI Live Triage (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Form (7 cols) */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-6">
              {/* STEP 1: Details */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-fade-in">
                  <h3 className="font-title text-base font-bold text-on-surface">Step 1: Incident Specifics</h3>

                  {/* Title */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface" htmlFor="complaint-title">
                      Issue Summary Title *
                    </label>
                    <input
                      id="complaint-title"
                      type="text"
                      required
                      placeholder="e.g. Deep asphalt pothole near bus stop"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-all"
                    />
                    {errors.title && <p className="text-xs text-error">{errors.title}</p>}
                  </div>

                  {/* Category Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-on-surface">
                      Defect Category
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, categoryId: cat.id })}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                            formData.categoryId === cat.id
                              ? 'border-primary-container bg-surface-container-low text-primary-container shadow-sm ring-1 ring-primary-container'
                              : 'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low/40 text-on-surface'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                          <span className="text-xs font-semibold leading-tight">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface" htmlFor="complaint-desc">
                      Detailed Narrative & Hazard Description *
                    </label>
                    <textarea
                      id="complaint-desc"
                      rows={4}
                      required
                      placeholder="Describe the severity, damage to vehicles, traffic impact, or risk to pedestrians..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-all"
                    />
                    {errors.description && <p className="text-xs text-error">{errors.description}</p>}
                  </div>

                  {/* Priority */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface">
                      Perceived Urgency
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-all"
                    >
                      <option value="CRITICAL">P1 - Critical Safety Hazard (Immediate)</option>
                      <option value="HIGH">P2 - High Priority (Significant Impediment)</option>
                      <option value="MEDIUM">P3 - Medium (Standard Repair Window)</option>
                      <option value="LOW">P4 - Low (Aesthetic / Routine Maintenance)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: Real Photographs and Camera Capture */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-fade-in">
                  <h3 className="font-title text-base font-bold text-on-surface">
                    Step 2: Photographic Evidence & Camera Capture
                  </h3>

                  <ImageUploadManager
                    photos={formData.photos}
                    onChange={(newPhotos) => setFormData({ ...formData, photos: newPhotos })}
                    maxPhotos={5}
                    allowSampleDemo={true}
                    label="Incident Photographs"
                    helperText="Upload real photographs from your device or capture a live photo using your camera."
                  />
                </div>
              )}

              {/* STEP 3: Real Geolocation & Tamil Nadu Map Pin */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-title text-base font-bold text-on-surface">
                      Step 3: Geolocation & Tamil Nadu Location Pin
                    </h3>

                    <button
                      type="button"
                      onClick={() => setShowGeoPrompt(true)}
                      disabled={geoLoading}
                      className="px-3 py-1.5 bg-[#137A70] hover:bg-[#0F625B] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-60 self-start"
                    >
                      <span className="material-symbols-outlined text-[16px]">my_location</span>
                      <span>{geoLoading ? 'Acquiring GPS...' : 'Use My Current Location'}</span>
                    </button>
                  </div>

                  {/* Geolocation Explanation Dialog/Card */}
                  {showGeoPrompt && (
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3 animate-fade-in">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-teal-700 text-2xl shrink-0">location_searching</span>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-teal-900">Requesting Device Geolocation</h4>
                          <p className="text-xs text-teal-800 leading-relaxed">
                            CivicFix AI uses your browser's location services to automatically pinpoint the coordinates of this defect and resolve the nearest street address. No background tracking occurs.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowGeoPrompt(false)}
                          className="px-3 py-1 text-xs text-teal-800 hover:bg-teal-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                        >
                          Allow & Detect GPS
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error state */}
                  {geoError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                        <span>{geoError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        className="text-xs font-bold text-red-800 underline hover:no-underline shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Success note */}
                  {geoSuccessNote && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                      <span>{geoSuccessNote}</span>
                    </div>
                  )}

                  {/* Interactive Tamil Nadu Map Picker */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface">
                      Geographic Pinpoint (Tamil Nadu Map)
                    </label>
                    <TamilNaduLocationPicker
                      coordinates={formData.coordinates}
                      onLocationSelect={handleMapLocationSelect}
                      accuracyMeters={formData.accuracyMeters}
                      height="260px"
                    />
                  </div>

                  {/* Address input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-on-surface" htmlFor="complaint-address">
                        Street Address / Road Cross *
                      </label>
                      <button
                        type="button"
                        onClick={handleLocateAddressOnMap}
                        disabled={geoLoading || !formData.address.trim()}
                        className="text-xs text-primary-container hover:text-primary font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[15px]">pin_drop</span>
                        <span>Locate on Map</span>
                      </button>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-tertiary text-[18px]">
                        location_on
                      </span>
                      <input
                        id="complaint-address"
                        type="text"
                        required
                        placeholder="e.g. Anna Salai, Opposite LIC Building, Chennai"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        onBlur={() => {
                          if (formData.address.trim()) {
                            handleLocateAddressOnMap(formData.address);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLocateAddressOnMap(formData.address);
                          }
                        }}
                        className="w-full pl-9 pr-24 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-outline border border-transparent focus:border-primary-container focus:bg-surface-container-lowest focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleLocateAddressOnMap(formData.address)}
                        disabled={geoLoading || !formData.address.trim()}
                        className="absolute right-2 top-2 px-2.5 py-1 rounded-lg bg-surface-container-lowest hover:bg-primary-container hover:text-white text-primary-container font-semibold text-xs border border-outline-variant/30 transition-all shadow-xs"
                      >
                        {geoLoading ? 'Finding...' : 'Plot Pin'}
                      </button>
                    </div>
                    {errors.address && <p className="text-xs text-error">{errors.address}</p>}

                    {/* Quick Locality Chips for instant pinpoint & coordinate alignment */}
                    <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-0.5">
                      <span className="text-[10px] text-tertiary font-bold uppercase tracking-wider shrink-0">
                        Quick Localities:
                      </span>
                      {[
                        'Chettipadu',
                        'Anna Nagar',
                        'T. Nagar',
                        'Velachery',
                        'Guindy',
                        'Tambaram',
                        'Coimbatore',
                        'Madurai'
                      ].map((locName) => (
                        <button
                          key={locName}
                          type="button"
                          onClick={() => handleLocateAddressOnMap(locName)}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-surface-container hover:bg-primary-container hover:text-white text-on-surface border border-outline-variant/30 transition-colors whitespace-nowrap"
                        >
                          {locName}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-on-surface" htmlFor="complaint-ward">
                        Zone / District / Ward
                      </label>
                      <input
                        id="complaint-ward"
                        type="text"
                        value={formData.ward}
                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-on-surface" htmlFor="complaint-landmark">
                        Nearby Landmark (Optional)
                      </label>
                      <input
                        id="complaint-landmark"
                        type="text"
                        placeholder="e.g. Near Metro Station Gate 2"
                        value={formData.landmark}
                        onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface"
                      />
                    </div>
                  </div>

                  {/* Coordinates & Accuracy Confirmation */}
                  <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between text-xs text-tertiary border border-outline-variant/30">
                    <span className="flex items-center gap-1.5 text-primary-container font-semibold">
                      <span className="material-symbols-outlined text-[16px]">sensors</span>
                      <span>
                        Coordinates: {formData.coordinates.lat.toFixed(5)}° N, {formData.coordinates.lng.toFixed(5)}° E
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-tertiary">
                      {formData.accuracyMeters ? `±${formData.accuracyMeters}m accuracy` : 'Manual Pinpoint'}
                    </span>
                  </div>

                  {/* Explicit User Confirmation */}
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-on-surface pt-1">
                    <input
                      type="checkbox"
                      checked={formData.locationConfirmed}
                      onChange={(e) => setFormData({ ...formData, locationConfirmed: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-[#137A70] rounded border-outline-variant focus:ring-[#137A70]"
                    />
                    <span>
                      I verify that this location matches the actual on-ground site of the reported infrastructure defect.
                    </span>
                  </label>
                  {errors.locationConfirmed && (
                    <p className="text-xs text-error">{errors.locationConfirmed}</p>
                  )}
                </div>
              )}

              {/* STEP 4: Review & Submit */}
              {currentStep === 4 && (
                <div className="space-y-5 animate-fade-in">
                  <h3 className="font-title text-base font-bold text-on-surface">Step 4: Review & Final Submission</h3>

                  <div className="p-4 rounded-xl bg-surface-container-low space-y-3 border border-outline-variant/30 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-tertiary block text-[10px] uppercase">Title</span>
                        <h4 className="font-bold text-sm text-on-surface">{formData.title || 'Untitled Defect'}</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-primary-container font-semibold">
                        {selectedCategoryObj.name}
                      </span>
                    </div>

                    <div>
                      <span className="text-tertiary block text-[10px] uppercase">Narrative</span>
                      <p className="text-on-surface-variant leading-relaxed">
                        {formData.description || 'No description provided'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/30">
                      <div>
                        <span className="text-tertiary block text-[10px] uppercase">Location</span>
                        <span className="font-semibold text-on-surface">{formData.address}</span>
                      </div>
                      <div>
                        <span className="text-tertiary block text-[10px] uppercase">Coordinates</span>
                        <span className="font-mono text-on-surface">
                          {formData.coordinates.lat.toFixed(4)}° N, {formData.coordinates.lng.toFixed(4)}° E
                        </span>
                      </div>
                    </div>

                    {/* Attached Photos Preview */}
                    <div className="pt-2 border-t border-outline-variant/30">
                      <span className="text-tertiary block text-[10px] uppercase mb-1.5">
                        Photographs Staged ({formData.photos.length})
                      </span>
                      {formData.photos.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {formData.photos.map((p, idx) => (
                            <img
                              key={idx}
                              src={p.url}
                              alt="evidence"
                              className="w-16 h-12 object-cover rounded-lg border border-outline-variant/40 shrink-0"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-tertiary italic">No photo attached (A default demonstration image will be paired).</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant space-y-1 border border-outline-variant/30">
                    <p className="font-semibold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
                      <span>Prepared for Future Backend Integration</span>
                    </p>
                    <p className="text-[11px] text-tertiary leading-relaxed">
                      Submission queues this ticket in client storage for this demo session. When the Spring Boot REST API is connected, this form will dispatch a multipart request to <code className="font-mono">POST /api/v1/complaints</code>.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container rounded-xl transition-colors"
                  >
                    ← Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-primary-container hover:bg-primary text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>Continue to Step {currentStep + 1}</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-[#137A70] hover:bg-[#0F625B] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                        <span>Registering Ticket...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        <span>Submit & Queue Complaint</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Right Side: AI Triage Simulation & Preview (5 cols) */}
            <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">neurology</span>
                  <h3 className="font-title text-sm font-bold text-on-surface">CivicFix AI Vision Insight</h3>
                </div>
                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Gemini Ready
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low space-y-2 border border-outline-variant/30 text-xs">
                <span className="text-tertiary block text-[10px] uppercase font-bold">Category Detection</span>
                <p className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary-container">
                    {selectedCategoryObj.icon}
                  </span>
                  <span>{selectedCategoryObj.name}</span>
                </p>
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full w-[94%]" />
                </div>
                <span className="text-[10px] text-tertiary block text-right font-mono">94% Confidence</span>
              </div>

              <div className="space-y-3 text-xs text-on-surface-variant">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-[16px] shrink-0 mt-0.5">
                    filter_center_focus
                  </span>
                  <p>
                    <strong className="text-on-surface">Damage Severity:</strong> Automated visual classification flags structural severity based on uploaded images.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[16px] shrink-0 mt-0.5">
                    share_location
                  </span>
                  <p>
                    <strong className="text-on-surface">Tamil Nadu Geospatial:</strong> Checks duplicate tickets within a 50m radius of your selected coordinates.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant/30">
                <span className="text-[11px] text-tertiary font-mono block">
                  Simulated Session Mode · CivicFix AI v2.8
                </span>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default ReportComplaintPage;
