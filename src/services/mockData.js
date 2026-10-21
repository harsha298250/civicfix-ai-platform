import { COMPLAINT_STATUS } from '../constants/statusConstants';

export const INITIAL_USERS = [
  {
    id: 'usr-001',
    name: 'Alex Morgan',
    email: 'alex.m@citizen.org',
    role: 'CITIZEN',
    phone: '+91 98401 23456',
    ward: 'Ward 08, Anna Nagar',
    status: 'ACTIVE',
    trustScore: 98,
    avatar: 'AM',
    department: 'Resident Community Council',
    joinedDate: '15 Jan 2026'
  },
  {
    id: 'usr-002',
    name: 'Elena Vance',
    email: 'elena.vance@metro.gov',
    role: 'OFFICER',
    phone: '+91 94440 12345',
    ward: 'District 04 Headquarters',
    status: 'ACTIVE',
    trustScore: 100,
    avatar: 'EV',
    department: 'Central Municipal Operations',
    joinedDate: '10 Feb 2024'
  },
  {
    id: 'usr-003',
    name: 'Marcus Chen',
    email: 'marcus.chen@fieldops.gov',
    role: 'WORKER',
    phone: '+91 91760 98765',
    ward: 'Unit 4 - SDOT Road Crew',
    status: 'ACTIVE',
    trustScore: 96,
    avatar: 'MC',
    department: 'SDOT Rapid Asphalt Maintenance',
    joinedDate: '04 Mar 2025'
  },
  {
    id: 'usr-004',
    name: 'David Kalu',
    email: 'david.kalu@waterworks.gov',
    role: 'WORKER',
    phone: '+91 98840 54321',
    ward: 'Water & Sewerage Div 3',
    status: 'ACTIVE',
    trustScore: 94,
    avatar: 'DK',
    department: 'Sanitation & Pipeline Emergency',
    joinedDate: '22 Aug 2025'
  },
  {
    id: 'usr-005',
    name: 'Priya Sharma',
    email: 'priya.sharma@admin.metro.gov',
    role: 'ADMIN',
    phone: '+91 98410 87654',
    ward: 'Metropolitan IT Governance',
    status: 'ACTIVE',
    trustScore: 100,
    avatar: 'PS',
    department: 'Municipal Digital Infrastructure',
    joinedDate: '01 Nov 2023'
  },
  {
    id: 'usr-006',
    name: 'Cadet Elena Rostova',
    email: 'cadet.elena@metro.gov',
    role: 'OFFICER',
    phone: '+91 94450 67890',
    ward: 'Ward 12 South',
    status: 'PENDING_APPROVAL',
    trustScore: 80,
    avatar: 'ER',
    department: 'Junior Field Inspectorate',
    joinedDate: '11 Oct 2026'
  },
  {
    id: 'usr-007',
    name: 'Suresh Kumar',
    email: 'suresh.k@fieldops.gov',
    role: 'WORKER',
    phone: '+91 98409 11223',
    ward: 'Lighting & Power Unit 1',
    status: 'PENDING_APPROVAL',
    trustScore: 85,
    avatar: 'SK',
    department: 'High Voltage Grid Service',
    joinedDate: '12 Oct 2026'
  },
  {
    id: 'usr-008',
    name: 'Anandhi Sundaram',
    email: 'anandhi.s@citizen.org',
    role: 'CITIZEN',
    phone: '+91 97909 23456',
    ward: 'Ward 04, T. Nagar, Chennai',
    status: 'ACTIVE',
    trustScore: 94,
    avatar: 'AS',
    department: 'Resident Community Council',
    joinedDate: '18 Feb 2026'
  }
];

export const INITIAL_COMPLAINTS = [
  {
    id: 'CF-2026-00124',
    title: 'Large pothole near bus stop',
    category: 'Roads & Potholes',
    categoryId: 'roads',
    description: 'Deep cavity in asphalt right before Anna Nagar bus stop shelter. Poses severe collision hazard for buses and two-wheelers, with exposed rebar and broken bitumen chunks scattered across the lane.',
    status: COMPLAINT_STATUS.IN_PROGRESS,
    priority: 'CRITICAL',
    location: {
      address: 'Pine Boulevard & 2nd Main, Anna Nagar Transit Hub',
      ward: 'Ward 08',
      district: 'District 4',
      coordinates: { lat: 13.0850, lng: 80.2101 },
      landmark: 'Opposite State Library Bus Shelter'
    },
    citizen: {
      id: 'usr-001',
      name: 'Alex Morgan',
      email: 'alex.m@citizen.org',
      trustScore: 98
    },
    assignedWorker: {
      id: 'usr-003',
      name: 'Marcus Chen',
      unit: 'SDOT Rapid Asphalt Unit 4',
      assignedDate: '2026-10-10T10:30:00Z',
      estimatedCompletion: '2026-10-14'
    },
    progressPercent: 65,
    progressNotes: [
      {
        timestamp: '2026-10-10T11:45:00Z',
        author: 'Marcus Chen',
        note: 'Site safety perimeter established with high-vis cones. Bitumen debris removed.'
      },
      {
        timestamp: '2026-10-11T09:15:00Z',
        author: 'Marcus Chen',
        note: 'Sub-base aggregate compacted with roller rig T-12. Awaiting final binder emulsion coat.'
      }
    ],
    aiTriage: {
      confidence: 98.4,
      detectedIssue: 'Severe Road Surface Cavity (Depth > 12cm)',
      hazardScore: 'P1 - High Traffic Collision Risk',
      clusterCount: 3,
      duplicateIds: ['#CF-2026-00118', '#CF-2026-00095'],
      suggestedDept: 'Public Works & Highways',
      slaHoursRemaining: 18
    },
    resolutionEvidence: {
      notes: 'Road base cleared, hot-mix asphalt filled and compacted using 1.5-ton hydraulic roller. Sealant cure completed.',
      photos: [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=600&q=80'
      ],
      gpsVerified: true,
      submittedDate: '2026-10-12T14:20:00Z',
      completionTime: '4h 12m'
    },
    photos: [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
    ],
    createdAt: '2026-10-10T09:14:00Z',
    updatedAt: '2026-10-12T14:20:00Z'
  },
  {
    id: 'CF-2026-00125',
    title: 'High-pressure water main rupture causing street flooding',
    category: 'Water & Sanitation Leakage',
    categoryId: 'water',
    description: 'Treated drinking water pipe ruptured underneath pedestrian pathway. Water pooling over 40 feet across the road, reducing vehicle movement to single file.',
    status: COMPLAINT_STATUS.UNDER_REVIEW,
    priority: 'HIGH',
    location: {
      address: '7th Avenue cross street, Ward 08',
      ward: 'Ward 08',
      district: 'District 4',
      coordinates: { lat: 13.0872, lng: 80.2134 },
      landmark: 'Near Community Health Centre'
    },
    citizen: {
      id: 'usr-001',
      name: 'Alex Morgan',
      email: 'alex.m@citizen.org',
      trustScore: 98
    },
    assignedWorker: null,
    progressPercent: 0,
    progressNotes: [],
    aiTriage: {
      confidence: 96.2,
      detectedIssue: 'Underground Pipeline Rupture / Flooding',
      hazardScore: 'P2 - Infrastructure Degradation Risk',
      clusterCount: 1,
      duplicateIds: [],
      suggestedDept: 'Water Supply & Sewerage Board',
      slaHoursRemaining: 12
    },
    resolutionEvidence: null,
    photos: [
      'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80'
    ],
    createdAt: '2026-10-11T08:30:00Z',
    updatedAt: '2026-10-11T08:30:00Z'
  },
  {
    id: 'CF-2026-00126',
    title: 'Multiple streetlights completely dark along school zone',
    category: 'Streetlights & Electrical',
    categoryId: 'lighting',
    description: 'Series of 5 consecutive LED street fixtures failing to illuminate from 6:30 PM onwards. Crosswalk and school perimeter completely pitch black.',
    status: COMPLAINT_STATUS.ASSIGNED,
    priority: 'MEDIUM',
    location: {
      address: 'Maple Avenue, Block 3, District 4',
      ward: 'Ward 04',
      district: 'District 4',
      coordinates: { lat: 13.0821, lng: 80.2078 },
      landmark: 'St. Jude School East Gate'
    },
    citizen: {
      id: 'usr-001',
      name: 'Alex Morgan',
      email: 'alex.m@citizen.org',
      trustScore: 98
    },
    assignedWorker: {
      id: 'usr-007',
      name: 'Suresh Kumar',
      unit: 'High Voltage Grid Service',
      assignedDate: '2026-10-11T16:00:00Z',
      estimatedCompletion: '2026-10-15'
    },
    progressPercent: 20,
    progressNotes: [
      {
        timestamp: '2026-10-12T10:00:00Z',
        author: 'Suresh Kumar',
        note: 'Feeder pillar inspected. Fuse burnout detected on Circuit Phase 2.'
      }
    ],
    aiTriage: {
      confidence: 94.7,
      detectedIssue: 'Circuit Breaker Trip / Driver Unit Failure',
      hazardScore: 'P3 - Public Pedestrian Visibility',
      clusterCount: 1,
      duplicateIds: [],
      suggestedDept: 'Municipal Energy & Lighting',
      slaHoursRemaining: 36
    },
    resolutionEvidence: null,
    photos: [],
    createdAt: '2026-10-11T15:20:00Z',
    updatedAt: '2026-10-12T10:00:00Z'
  },
  {
    id: 'CF-2026-00127',
    title: 'Overflowing commercial waste bin obstructing sidewalk',
    category: 'Solid Waste & Illegal Dumping',
    categoryId: 'waste',
    description: 'Bulk municipal compactor dumpster overflowing into the cycle lane. Bio-waste and cardboard boxes obstructing pedestrian pathway for 3 consecutive days.',
    status: COMPLAINT_STATUS.RESOLUTION_SUBMITTED,
    priority: 'HIGH',
    location: {
      address: 'Central Market Road, Sector 12',
      ward: 'Ward 08',
      district: 'District 4',
      coordinates: { lat: 13.0894, lng: 80.2155 },
      landmark: 'Behind Metro Supermarket'
    },
    citizen: {
      id: 'usr-001',
      name: 'Alex Morgan',
      email: 'alex.m@citizen.org',
      trustScore: 98
    },
    assignedWorker: {
      id: 'usr-004',
      name: 'David Kalu',
      unit: 'Sanitation & Pipeline Emergency',
      assignedDate: '2026-10-10T14:00:00Z',
      estimatedCompletion: '2026-10-12'
    },
    progressPercent: 100,
    progressNotes: [
      {
        timestamp: '2026-10-12T07:30:00Z',
        author: 'David Kalu',
        note: 'Waste compactor truck dispatched. 2.4 metric tons cleared.'
      }
    ],
    aiTriage: {
      confidence: 97.1,
      detectedIssue: 'Commercial Solid Waste Accumulation',
      hazardScore: 'P2 - Sanitation & Pedestrian Obstruction',
      clusterCount: 2,
      duplicateIds: ['#CF-2026-00115'],
      suggestedDept: 'Sanitation & Environment',
      slaHoursRemaining: 6
    },
    resolutionEvidence: {
      notes: 'Dumpster emptied, perimeter sanitized with disinfectant wash, sidewalk fully cleared.',
      photos: [
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80'
      ],
      gpsVerified: true,
      submittedDate: '2026-10-12T11:45:00Z',
      completionTime: '2h 15m'
    },
    photos: [
      'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80'
    ],
    createdAt: '2026-10-09T18:00:00Z',
    updatedAt: '2026-10-12T11:45:00Z'
  },
  {
    id: 'CF-2026-00120',
    title: 'Collapsed stormwater drain cover on pedestrian walkway',
    category: 'Roads & Potholes',
    categoryId: 'roads',
    description: 'Concrete inspection lid cracked in half and fallen into 5-foot drain shaft. Extremely dangerous for evening joggers and blind pedestrians.',
    status: COMPLAINT_STATUS.RESOLVED,
    priority: 'CRITICAL',
    location: {
      address: 'Park Road Promenade, Anna Nagar West',
      ward: 'Ward 08',
      district: 'District 4',
      coordinates: { lat: 13.0835, lng: 80.2089 },
      landmark: 'Next to Children Recreation Ground'
    },
    citizen: {
      id: 'usr-008',
      name: 'Anandhi Sundaram',
      email: 'anandhi.s@citizen.org',
      trustScore: 94
    },
    assignedWorker: {
      id: 'usr-003',
      name: 'Marcus Chen',
      unit: 'SDOT Rapid Asphalt Unit 4',
      assignedDate: '2026-10-08T09:00:00Z',
      estimatedCompletion: '2026-10-09'
    },
    progressPercent: 100,
    progressNotes: [
      {
        timestamp: '2026-10-08T14:00:00Z',
        author: 'Marcus Chen',
        note: 'Reinforced cast iron grate installed and anchored into foundation.'
      }
    ],
    aiTriage: {
      confidence: 99.1,
      detectedIssue: 'Open Drain Shaft / Fall Hazard',
      hazardScore: 'P1 - Life Safety Risk',
      clusterCount: 4,
      duplicateIds: [],
      suggestedDept: 'Public Works & Highways',
      slaHoursRemaining: 0
    },
    resolutionEvidence: {
      notes: 'Heavy duty ductile iron cover sealed with epoxy mortar. Level checked against walkway pavement.',
      photos: [
        'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80'
      ],
      gpsVerified: true,
      submittedDate: '2026-10-09T16:00:00Z',
      completionTime: '1d 7h'
    },
    verificationMeta: {
      verifiedBy: 'Elena Vance',
      officerNotes: 'Inspected on-site photographic evidence and verified telemetry. High quality cast iron fit confirmed.',
      approvedAt: '2026-10-10T10:15:00Z'
    },
    photos: [],
    createdAt: '2026-10-08T07:15:00Z',
    updatedAt: '2026-10-10T10:15:00Z'
  },
  {
    id: 'CF-2026-00119',
    title: 'Dangerous leaning tree branch threatening power lines',
    category: 'Public Parks & Tree Hazards',
    categoryId: 'parks',
    description: 'Heavy banyan limb fractured after storm and resting on overhead secondary electrical feed. Sparking noticed in high wind.',
    status: COMPLAINT_STATUS.SUBMITTED,
    priority: 'HIGH',
    location: {
      address: 'Oakwood Avenue & 4th Street',
      ward: 'Ward 06',
      district: 'District 4',
      coordinates: { lat: 13.0811, lng: 80.2142 },
      landmark: 'Corner of Post Office'
    },
    citizen: {
      id: 'usr-008',
      name: 'Anandhi Sundaram',
      email: 'anandhi.s@citizen.org',
      trustScore: 94
    },
    assignedWorker: null,
    progressPercent: 0,
    progressNotes: [],
    aiTriage: {
      confidence: 95.8,
      detectedIssue: 'Overhanging Broken Branch on Power Infrastructure',
      hazardScore: 'P2 - Electrical Fire & Outage Risk',
      clusterCount: 1,
      duplicateIds: [],
      suggestedDept: 'Horticulture & Urban Forestry',
      slaHoursRemaining: 24
    },
    resolutionEvidence: null,
    photos: [],
    createdAt: '2026-10-12T17:00:00Z',
    updatedAt: '2026-10-12T17:00:00Z'
  },
  {
    id: 'CF-2026-00128',
    title: 'Damaged storm drain culvert on Cross Cut Road',
    category: 'Roads & Potholes',
    categoryId: 'roads',
    description: 'Cracked concrete slab over roadside drainage canal near Gandhipuram junction, creating bottleneck for heavy traffic.',
    status: COMPLAINT_STATUS.UNDER_REVIEW,
    priority: 'HIGH',
    location: {
      address: 'Cross Cut Road, Gandhipuram, Coimbatore',
      ward: 'Central Zone, Ward 24',
      district: 'Coimbatore District',
      coordinates: { lat: 11.0183, lng: 76.9634 },
      landmark: 'Near City Central Bus Terminus'
    },
    citizen: {
      id: 'usr-008',
      name: 'Anandhi Sundaram',
      email: 'anandhi.s@citizen.org',
      trustScore: 94
    },
    assignedWorker: null,
    progressPercent: 0,
    progressNotes: [],
    aiTriage: {
      confidence: 96.4,
      detectedIssue: 'Structural Culvert Slab Failure',
      hazardScore: 'P2 - Roadway Collapse Precursor',
      clusterCount: 1,
      duplicateIds: [],
      suggestedDept: 'Coimbatore Municipal Corporation Highways',
      slaHoursRemaining: 30
    },
    resolutionEvidence: null,
    photos: [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
    ],
    createdAt: '2026-10-12T11:20:00Z',
    updatedAt: '2026-10-12T11:20:00Z'
  },
  {
    id: 'CF-2026-00129',
    title: 'Major pipeline joint leakage near KK Nagar ring road',
    category: 'Water & Sanitation Leakage',
    categoryId: 'water',
    description: 'Subterranean distribution pipe spurting water onto arterial ring road. Loss of pressure reported in adjoining residential sector.',
    status: COMPLAINT_STATUS.ASSIGNED,
    priority: 'CRITICAL',
    location: {
      address: 'KK Nagar Main Road, Madurai',
      ward: 'Ward 42, East Zone',
      district: 'Madurai District',
      coordinates: { lat: 9.9328, lng: 78.1456 },
      landmark: 'Opposite District Court Complex'
    },
    citizen: {
      id: 'usr-001',
      name: 'Alex Morgan',
      email: 'alex.m@citizen.org',
      trustScore: 98
    },
    assignedWorker: {
      id: 'usr-004',
      name: 'David Kalu',
      unit: 'Sanitation & Pipeline Emergency',
      assignedDate: '2026-10-12T14:00:00Z',
      estimatedCompletion: '2026-10-15'
    },
    progressPercent: 35,
    progressNotes: [
      {
        timestamp: '2026-10-12T15:30:00Z',
        author: 'David Kalu',
        note: 'Excavation begun. Leak isolated to 200mm flange joint.'
      }
    ],
    aiTriage: {
      confidence: 97.9,
      detectedIssue: 'Arterial Water Main Flange Burst',
      hazardScore: 'P1 - High Resource Depletion & Erosion',
      clusterCount: 2,
      duplicateIds: [],
      suggestedDept: 'TWAD & Madurai Corporation Water Works',
      slaHoursRemaining: 14
    },
    resolutionEvidence: null,
    photos: [
      'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80'
    ],
    createdAt: '2026-10-12T12:00:00Z',
    updatedAt: '2026-10-12T15:30:00Z'
  },
  {
    id: 'CF-2026-00130',
    title: 'Street lighting failure across Thillai Nagar 11th Cross',
    category: 'Streetlights & Electrical',
    categoryId: 'lighting',
    description: 'Complete blackout of 8 high-mast sodium lamps along main shopping street, posing severe theft and vehicular risk.',
    status: COMPLAINT_STATUS.SUBMITTED,
    priority: 'MEDIUM',
    location: {
      address: '11th Cross Street, Thillai Nagar, Tiruchirappalli',
      ward: 'Ward 18, Golden Rock Zone',
      district: 'Tiruchirappalli District',
      coordinates: { lat: 10.8286, lng: 78.6865 },
      landmark: 'Near Shastri Hall'
    },
    citizen: {
      id: 'usr-008',
      name: 'Anandhi Sundaram',
      email: 'anandhi.s@citizen.org',
      trustScore: 94
    },
    assignedWorker: null,
    progressPercent: 0,
    progressNotes: [],
    aiTriage: {
      confidence: 93.5,
      detectedIssue: 'Transformer Feeder Fuse Trip',
      hazardScore: 'P3 - Public Lighting Outage',
      clusterCount: 1,
      duplicateIds: [],
      suggestedDept: 'TANGEDCO & Tiruchirappalli Electrical Div',
      slaHoursRemaining: 48
    },
    resolutionEvidence: null,
    photos: [],
    createdAt: '2026-10-13T09:00:00Z',
    updatedAt: '2026-10-13T09:00:00Z'
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    role: 'CITIZEN',
    title: 'Work Order In Progress',
    message: 'Your report #CF-2026-00124 (Large pothole near bus stop) is now 65% complete by SDOT Unit 4.',
    time: '2 hours ago',
    read: false,
    type: 'STATUS_UPDATE',
    referenceId: 'CF-2026-00124'
  },
  {
    id: 'notif-2',
    role: 'CITIZEN',
    title: 'Resolution Verified & Closed',
    message: 'Report #CF-2026-00120 (Collapsed stormwater drain cover) was inspected and approved by Officer Vance.',
    time: '2 days ago',
    read: true,
    type: 'RESOLUTION',
    referenceId: 'CF-2026-00120'
  },
  {
    id: 'notif-3',
    role: 'OFFICER',
    title: 'New Resolution Awaiting Verification',
    message: 'Field crew submitted repair proof for #CF-2026-00127 (Commercial waste bin). Verification window closes in 4 hours.',
    time: '1 hour ago',
    read: false,
    type: 'VERIFICATION_REQUIRED',
    referenceId: 'CF-2026-00127'
  },
  {
    id: 'notif-4',
    role: 'OFFICER',
    title: 'High Hazard Intake Alert',
    message: 'New Critical P1 ticket #CF-2026-00125 filed in Ward 08 (High-pressure water main rupture). Immediate assignment required.',
    time: '3 hours ago',
    read: false,
    type: 'NEW_COMPLAINT',
    referenceId: 'CF-2026-00125'
  },
  {
    id: 'notif-5',
    role: 'WORKER',
    title: 'New Task Dispatched',
    message: 'You have been assigned to #CF-2026-00124 (Large pothole near bus stop). Target completion: 14 Oct 2026.',
    time: '2 days ago',
    read: true,
    type: 'TASK_ASSIGNED',
    referenceId: 'CF-2026-00124'
  },
  {
    id: 'notif-6',
    role: 'ADMIN',
    title: 'Staff Accounts Pending Vetting',
    message: '2 municipal personnel accounts are pending administrative credential approval.',
    time: '30 mins ago',
    read: false,
    type: 'ADMIN_ALERT',
    referenceId: 'usr-006'
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'aud-901',
    timestamp: '2026-10-12T14:20:00Z',
    actor: 'Marcus Chen (Field Tech #FW-882)',
    action: 'SUBMIT_EVIDENCE',
    target: 'Ticket #CF-2026-00124',
    details: 'Submitted GPS-geotagged repair photos and completion report for verification.',
    ip: '172.16.4.102',
    status: 'SUCCESS'
  },
  {
    id: 'aud-902',
    timestamp: '2026-10-11T16:00:00Z',
    actor: 'Elena Vance (Officer #MO-04)',
    action: 'DISPATCH_WORKER',
    target: 'Ticket #CF-2026-00126',
    details: 'Dispatched Suresh Kumar (Electrical Unit 1) with 48h SLA expectation.',
    ip: '10.200.12.44',
    status: 'SUCCESS'
  },
  {
    id: 'aud-903',
    timestamp: '2026-10-10T10:15:00Z',
    actor: 'Elena Vance (Officer #MO-04)',
    action: 'APPROVE_RESOLUTION',
    target: 'Ticket #CF-2026-00120',
    details: 'Verified cast-iron drain cover installation; transitioned status to RESOLVED.',
    ip: '10.200.12.44',
    status: 'SUCCESS'
  },
  {
    id: 'aud-904',
    timestamp: '2026-10-09T08:30:00Z',
    actor: 'Priya Sharma (Platform Admin)',
    action: 'RBAC_ROLE_UPDATE',
    target: 'User #usr-003 (Marcus Chen)',
    details: 'Elevated role permissions to Field Lead Technician with mobile dispatch rights.',
    ip: '192.168.1.15',
    status: 'SUCCESS'
  }
];
