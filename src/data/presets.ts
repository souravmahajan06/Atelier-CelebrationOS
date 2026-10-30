import { EventPlan } from '../types/planner';

export const PRESET_PLANS: EventPlan[] = [
  {
    id: 'tight-budget-family-celebration',
    name: 'Family Milestone & Reunion ($6,500 USD Plan)',
    currency: 'USD',
    personaTag: 'Focused Persona: Budget-Conscious Multi-Generational Family Host (USD)',
    isOnboardingComplete: true,
    onboarding: {
      occasion: 'Parents’ 40th Anniversary & Family Reunion Supper',
      budget: 6500,
      guestCount: 65,
      eventDate: '2027-01-24',
      experienceStyle: 'Warm, food-focused, community-hall family feast with zero hidden vendor markups',
      mustHaves: [
        'Authentic family-style hot dinner with low-sodium senior dishes',
        'Ground-floor wheelchair-accessible hall with free parking',
        'BYO wine & beverage privilege (zero corkage fee)',
        'Candid family portrait hour'
      ],
      audienceNotes:
        '65 family members: 11 grandparents/seniors (ages 72–85, 2 using walkers, sensitive to loud echoes and stairs), 40 adults, and 14 kids under 12.'
    },
    budgetBuckets: [
      {
        id: 'b-venue',
        category: 'Venue & Spatial',
        allocated: 1350,
        committed: 1350,
        priority: 'Protected Must-Have',
        rationale: 'Civic Botanical Pavilion buyout allowing outside catering and BYO beverages with zero service surcharge.',
        items: [
          {
            id: 'v-1',
            name: 'Civic Botanical Pavilion 8-Hour Saturday Rental',
            cost: 1100,
            isMustHave: true,
            notes: 'Includes tables, 80 padded chairs, ADA ramp, and adjacent 40-car lot'
          },
          {
            id: 'v-2',
            name: 'Refundable Cleaning & Security Deposit Allocation',
            cost: 250,
            isMustHave: true,
            notes: 'Avoids $450 mandatory venue teardown penalty'
          }
        ]
      },
      {
        id: 'b-catering',
        category: 'Catering & Beverage',
        allocated: 3100,
        committed: 1200,
        priority: 'Protected Must-Have',
        rationale: 'Core priority: High-quality family-style Mediterranean & roast supper + wholesale BYO beverage program.',
        items: [
          {
            id: 'c-1',
            name: 'Hearth & Table Family-Style Plated Platters (65 Guests)',
            cost: 2450,
            isMustHave: true,
            notes: 'All-inclusive drop-off + 2 chafing servers; includes low-sodium herb salmon for seniors'
          },
          {
            id: 'c-2',
            name: 'Wholesale Wine, Sparkling Cider & Espresso Station (BYO)',
            cost: 650,
            isMustHave: true,
            notes: 'Saves $1,400 compared to venue per-drink bar packages'
          }
        ]
      },
      {
        id: 'b-decor',
        category: 'Decor, Florals & Stationery',
        allocated: 650,
        committed: 200,
        priority: 'Flexible',
        rationale: 'Potted herb centerpieces guests take home + digital invitations (printed large-font cards for 11 seniors only).',
        items: [
          {
            id: 'd-1',
            name: 'Potted Rosemary, Olive & Lavender Table Vessels (10 Tables)',
            cost: 380,
            isMustHave: false,
            notes: 'Doubles as take-home family favors; zero cut-flower waste'
          },
          {
            id: 'd-2',
            name: 'Large-Print Senior Invitations + Warm Café String Lighting',
            cost: 270,
            isMustHave: false,
            notes: 'Digital RSVP for 54 guests; printed keepsake mailers for 11 senior relatives'
          }
        ]
      },
      {
        id: 'b-photo-music',
        category: 'Photography & Sound',
        allocated: 950,
        committed: 400,
        priority: 'High Impact',
        rationale: '3-hour focused portrait & toast photography + wireless lapel mic for family speeches.',
        items: [
          {
            id: 'pm-1',
            name: 'Documentary Photographer — 3-Hour Golden Hour & Toast Package',
            cost: 750,
            isMustHave: true,
            notes: 'Covers multi-gen group portraits (4:30–5:30 PM) and dinner toasts'
          },
          {
            id: 'pm-2',
            name: 'Portable Directional PA Speaker & 2 Wireless Speech Microphones',
            cost: 200,
            isMustHave: true,
            notes: 'Clear speech projection for grandparents without booming bass'
          }
        ]
      },
      {
        id: 'b-logistics',
        category: 'Accessibility & Family Logistics',
        allocated: 450,
        committed: 150,
        priority: 'High Impact',
        rationale: 'Kids activity table supervisor + rideshare door-to-door vouchers for grandparents.',
        items: [
          {
            id: 'l-1',
            name: 'Door-to-Door Rideshare Vouchers for 5 Senior Households',
            cost: 250,
            isMustHave: true,
            notes: 'Eliminates night driving for older family members'
          },
          {
            id: 'l-2',
            name: 'Kids Craft & Board Game Table Kit (14 Children)',
            cost: 200,
            isMustHave: false,
            notes: 'Keeps cousins engaged during anniversary speeches'
          }
        ]
      }
    ],
    activeTradeOffId: null,
    tradeOffScenarios: [
      {
        id: 'to-tight-cut-1000',
        title: 'Scenario A: Absorb -$1,000 Budget Cut ($5,500 Cap) While Preserving Food Quality',
        triggerDescription: 'Budget decreased from $6,500 to $5,500 (-15.4%)',
        targetTotalBudget: 5500,
        netSavings: 1000,
        experienceTradeOffSummary:
          'Protects 100% of the hot family-style menu and senior accessibility. Achieves $1,000 savings by switching from 10-table linen/herb rentals to long butcher-paper & market greenery runners (-$380), condensing professional photography to a 90-minute portrait + cake-cutting session (-$300), and organizing designated cousin carpools for senior relatives instead of commercial rideshare vouchers (-$320).',
        preservedMustHaves: [
          'Full 65-guest hot Mediterranean & roast supper',
          'Step-free Civic Botanical Pavilion',
          'Dedicated multi-generational family portraits'
        ],
        adjustments: [
          {
            category: 'Decor, Florals & Stationery',
            previousAllocated: 650,
            newAllocated: 270,
            delta: -380,
            actionSummary: 'Replace individual table floral vessels with kraft menu runners, citrus bowls & tea lights'
          },
          {
            category: 'Photography & Sound',
            previousAllocated: 950,
            newAllocated: 650,
            delta: -300,
            actionSummary: 'Book 90-minute portrait & toast mini-session; use family digital album QR code for candid table photos'
          },
          {
            category: 'Accessibility & Family Logistics',
            previousAllocated: 450,
            newAllocated: 130,
            delta: -320,
            actionSummary: 'Assign 4 adult family members as dedicated door-to-door chauffeurs for grandparents'
          }
        ]
      }
    ],
    vendorQuotes: [
      {
        id: 'vq-cater-1',
        vendorName: 'Hearth & Table Family Kitchen (Recommended)',
        category: 'Catering & Beverage',
        linkedBucketCategory: 'Catering & Beverage',
        headlineQuote: 2250,
        hiddenCharges: [
          {
            label: 'Warming Chafers & Compostable Bamboo Dinnerware',
            estimatedAmount: 200,
            clauseNote: 'Optional flat-rate equipment bundle; zero % service fee on drop-off + 2 buffet attendants'
          }
        ],
        trueLandedCost: 2450,
        inclusions: [
          '3 hot entrées (including low-sodium herb salmon for seniors)',
          '4 seasonal family-style sides & warm flatbreads',
          '2 on-site attendants for 4 hours to replenish platters & clear tables',
          'Zero corkage or cake-cutting fees'
        ],
        missingExclusions: ['Beverages & ice (handled via your $650 BYO wholesale program)'],
        contractRedFlags: 'None — transparent flat-fee staffing rather than a 22% mandatory administrative surcharge.',
        negotiationTip: 'Ask to include complimentary kids’ mac-and-cheese tray for the 14 children under 12 if deposit is paid 45 days out.',
        isSelected: true
      },
      {
        id: 'vq-cater-2',
        vendorName: 'Grand Marquise Full-Service Banquets',
        category: 'Catering & Beverage',
        linkedBucketCategory: 'Catering & Beverage',
        headlineQuote: 2100,
        hiddenCharges: [
          {
            label: '22% Mandatory "Administrative & Production Fee"',
            estimatedAmount: 462,
            clauseNote: 'Clause 7b: Does NOT count as staff gratuity; applied to food and rentals'
          },
          {
            label: '18% Mandatory Staff Gratuity',
            estimatedAmount: 378,
            clauseNote: 'Automatically billed on pre-tax total'
          },
          {
            label: 'Outside Dessert / Cake-Cutting Fee ($3.50/guest)',
            estimatedAmount: 228,
            clauseNote: 'Charged if family brings a bakery anniversary cake'
          },
          {
            label: 'BYO Corkage Surcharge ($18/bottle est. 24 bottles)',
            estimatedAmount: 432,
            clauseNote: 'Penalizes bringing your own wholesale wine'
          }
        ],
        trueLandedCost: 3600,
        inclusions: [
          '2 plated entrée choices',
          'Standard white polyester linens & china rental',
          'Uniformed waitstaff'
        ],
        missingExclusions: ['Dietary/low-sodium custom prep costs extra'],
        contractRedFlags:
          'Deceptive $2,100 headline quote balloons by +71% ($1,500 in hidden fees, corkage, and cake-cutting penalties) to $3,600.',
        negotiationTip: 'Avoid unless they waive corkage and cake-cutting fees in writing.',
        isSelected: false
      }
    ],
    timelineTasks: [
      {
        id: 'T-01',
        title: 'Lock Civic Botanical Pavilion & Confirm Open-Caterer / BYO Clause',
        category: 'Venue & Spatial',
        priority: 'Critical',
        originalDueDate: '2026-11-10',
        dueDate: '2026-11-10',
        delayedByDays: 0,
        status: 'Completed',
        dependsOn: [],
        dependencyRule: 'Foundational milestone: Venue must be booked before catering lock-in or invitation dispatch.',
        audienceTailoring: 'Verified zero-step ramp from parking lot and ground-floor accessible restrooms.',
        owner: 'Family Host'
      },
      {
        id: 'T-02',
        title: 'Audit Catering Quotes & Sign Hearth & Table Flat-Fee Contract',
        category: 'Catering & Beverage',
        priority: 'Critical',
        originalDueDate: '2026-11-24',
        dueDate: '2026-11-24',
        delayedByDays: 0,
        status: 'In Progress',
        dependsOn: ['T-01'],
        dependencyRule: 'Depends on T-01: Caterer requires confirmed venue kitchen warming access rules.',
        audienceTailoring: 'Locked in low-sodium herb salmon platter for 11 senior relatives & kids tray.',
        owner: 'Culinary Lead'
      },
      {
        id: 'T-03',
        title: 'Send Digital RSVPs & Mail 11 Large-Print Senior Keepsake Invitations',
        category: 'Decor, Florals & Stationery',
        priority: 'High',
        originalDueDate: '2026-12-02',
        dueDate: '2026-12-02',
        delayedByDays: 0,
        status: 'Pending',
        dependsOn: ['T-01'],
        dependencyRule: 'Depends on T-01: Venue address, parking map, and timing must be locked before sending invitations.',
        audienceTailoring: 'Send digital invites to 54 younger guests and printed 14pt cards to 11 seniors.',
        owner: 'Family Host'
      },
      {
        id: 'T-04',
        title: 'Finalize Guest Headcount, Allergy Ledger & Grandparent Ride Assignments',
        category: 'Accessibility & Family Logistics',
        priority: 'Critical',
        originalDueDate: '2027-01-05',
        dueDate: '2027-01-05',
        delayedByDays: 0,
        status: 'Pending',
        dependsOn: ['T-03'],
        dependencyRule: 'Depends on T-03: Requires RSVP responses before locking final catering tray quantities.',
        audienceTailoring: 'Pair each senior household with a designated rideshare voucher or cousin pickup time.',
        owner: 'Logistics Lead'
      }
    ],
    cascadeLogs: [],
    personalizationRules: [
      {
        id: 'pers-tb-1',
        segment: '11 Grandparents & Seniors (Ages 72–85)',
        category: 'Accessibility',
        observation: '2 relatives use rollator walkers; several dislike standing in long buffet lines or walking from distant parking.',
        recommendation: 'Use family-style platters served directly to Senior Tables 1 & 2 (so seniors never stand in a buffet line) and reserve the 5 closest front-door parking stalls.',
        linkedTaskId: 'T-04',
        estimatedCostImpact: 0,
        applied: true
      },
      {
        id: 'pers-tb-3',
        segment: '14 Children Under Age 12',
        category: 'Culinary & Dietary',
        observation: 'Kids get restless during 45-minute anniversary speeches.',
        recommendation: 'Set up an adjacent "Cousins’ Table" with early-served kids’ pasta/sliders and quiet tabletop activity kits during family toasts.',
        linkedTaskId: 'T-04',
        estimatedCostImpact: 200,
        applied: true
      }
    ]
  },
  {
    id: 'indian-family-celebration-inr',
    name: '25th Silver Jubilee Family Sangeet & Dinner (₹3,50,000 INR Plan)',
    currency: 'INR',
    personaTag: 'Focused Persona: Indian Multi-Generational Family Celebration (INR ₹)',
    isOnboardingComplete: true,
    onboarding: {
      occasion: 'Parents’ 25th Silver Jubilee Anniversary & Family Dinner',
      budget: 350000,
      guestCount: 120,
      eventDate: '2027-02-14',
      experienceStyle: 'Warm, traditional & food-focused multi-generational banquet with live chaat & thali',
      mustHaves: [
        'Live North & South Indian buffet + Jain & low-spice senior counter',
        'Ground-floor banquet lawn/hall with lift & wheelchair access for Dada-Dadi/Nana-Nani',
        'Candid photography + traditional marigold & warm diya decor'
      ],
      audienceNotes:
        '120 family members: 18 senior elders (requiring Jain / low-oil / low-sodium food & sofas near stage), 80 adults, and 22 kids.'
    },
    budgetBuckets: [
      {
        id: 'inr-venue',
        category: 'Venue & Spatial',
        allocated: 85000,
        committed: 50000,
        priority: 'Protected Must-Have',
        rationale: 'Ground-floor AC banquet hall + covered lawn with step-free ramp, valet parking, and power backup.',
        items: [
          {
            id: 'iv-1',
            name: 'Heritage Courtyard Ground-Floor Banquet Buyout (6 Hours)',
            cost: 70000,
            isMustHave: true,
            notes: 'Includes 120 banquet chairs, VIP sofa seating for elders, and generator backup'
          },
          {
            id: 'iv-2',
            name: 'Dedicated Green Room & Rest Lounge for Senior Family Members',
            cost: 15000,
            isMustHave: true,
            notes: 'Attached ground-floor room with washroom so elders can rest comfortably'
          }
        ]
      },
      {
        id: 'inr-catering',
        category: 'Catering & Beverage',
        allocated: 165000,
        committed: 60000,
        priority: 'Protected Must-Have',
        rationale: 'Core priority: Royal vegetarian & regional feast (₹1,375/plate for 120 guests) with dedicated table service for elders.',
        items: [
          {
            id: 'ic-1',
            name: 'Full-Course Regional Dinner Buffet & Live Chaat Counter (120 Pax)',
            cost: 138000,
            isMustHave: true,
            notes: '₹1,150/plate all-inclusive; includes dedicated Jain & low-spice counter'
          },
          {
            id: 'ic-2',
            name: 'Welcome Thandai, Fresh Fruit Mocktail Bar & Masala Chai Station',
            cost: 27000,
            isMustHave: true,
            notes: 'Served directly to senior sofa tables during arrival'
          }
        ]
      },
      {
        id: 'inr-decor',
        category: 'Decor, Florals & Stationery',
        allocated: 42000,
        committed: 15000,
        priority: 'Flexible',
        rationale: 'Fresh genda phool (marigold), jasmine drapes, warm fairy lights & WhatsApp e-invites.',
        items: [
          {
            id: 'id-1',
            name: 'Fresh Marigold & Jasmine Stage Backdrop + Warm Entrance Lighting',
            cost: 34000,
            isMustHave: false,
            notes: 'Uses local seasonal flowers instead of expensive imported orchids'
          },
          {
            id: 'id-2',
            name: 'WhatsApp Video Invite + 20 Printed Kankotri Cards for Elders',
            cost: 8000,
            isMustHave: false,
            notes: 'Saves ₹25,000 on full print runs'
          }
        ]
      },
      {
        id: 'inr-photo',
        category: 'Photography & Sound',
        allocated: 38000,
        committed: 15000,
        priority: 'High Impact',
        rationale: 'Candid + traditional family group photography and pleasant acoustic sound system.',
        items: [
          {
            id: 'ip-1',
            name: 'Candid + Traditional Photographer & Hardcover Family Album',
            cost: 28000,
            isMustHave: true,
            notes: 'Dedicated 45-minute family group portrait session before dinner'
          },
          {
            id: 'ip-2',
            name: 'Acoustic Sound Setup & 2 Cordless Mics for Family Speeches',
            cost: 10000,
            isMustHave: true,
            notes: 'Speakers angled away from senior sofa lounge'
          }
        ]
      },
      {
        id: 'inr-logistics',
        category: 'Accessibility & Family Logistics',
        allocated: 20000,
        committed: 5000,
        priority: 'High Impact',
        rationale: 'Chauffeured Innova cabs for grandparents and return sweet boxes.',
        items: [
          {
            id: 'il-1',
            name: '3 Dedicated Innova Cabs for Senior Relatives Pickup & Drop',
            cost: 12000,
            isMustHave: true,
            notes: 'Door-to-door comfort for elders'
          },
          {
            id: 'il-2',
            name: 'Artisanal Dry-Fruit Mithai Return Favor Boxes',
            cost: 8000,
            isMustHave: false,
            notes: '1 box per family household'
          }
        ]
      }
    ],
    activeTradeOffId: null,
    tradeOffScenarios: [
      {
        id: 'inr-to-1',
        title: 'Save ₹50,000 (Bring Budget to ₹3,00,000) Without Touching Food Quality',
        triggerDescription: 'Budget decreased from ₹3,50,000 to ₹3,00,000',
        targetTotalBudget: 300000,
        netSavings: 50000,
        experienceTradeOffSummary:
          'Keeps the entire 120-guest royal dinner & Jain counter untouched. Saves ₹50,000 by switching from custom floral stage structures to traditional brass lamps & marigold garlands (-₹20,000), shifting to a Sunday afternoon lunch slot (-₹20,000 venue savings), and using digital photo delivery (-₹10,000).',
        preservedMustHaves: [
          '120-guest full buffet + Jain/low-spice senior counter',
          'Ground-floor accessible hall with VIP elder sofas',
          'Candid family photography'
        ],
        adjustments: [
          {
            category: 'Venue & Spatial',
            previousAllocated: 85000,
            newAllocated: 65000,
            delta: -20000,
            actionSummary: 'Book daytime Sunday Luncheon slot (12:00 PM – 4:30 PM) at discounted tariff'
          },
          {
            category: 'Decor, Florals & Stationery',
            previousAllocated: 42000,
            newAllocated: 22000,
            delta: -20000,
            actionSummary: 'Use ethnic fabric drapes + brass diyas instead of heavy floral trusses'
          },
          {
            category: 'Photography & Sound',
            previousAllocated: 38000,
            newAllocated: 28000,
            delta: -10000,
            actionSummary: 'Deliver high-res cloud gallery first; print album later'
          }
        ]
      }
    ],
    vendorQuotes: [
      {
        id: 'vq-inr-1',
        vendorName: 'Annapurna Royal Rasoi Caterers (Recommended)',
        category: 'Catering & Beverage',
        linkedBucketCategory: 'Catering & Beverage',
        headlineQuote: 155000,
        hiddenCharges: [
          {
            label: ' Bone-China Crockery & Dedicated Table Waiters for Elders',
            estimatedAmount: 10000,
            clauseNote: 'Flat fee; includes 4 waiters assigned exclusively to serve senior tables'
          }
        ],
        trueLandedCost: 165000,
        inclusions: [
          '120 plates (4 starters, 2 live chaat counters, 5 main courses, 3 desserts)',
          'Separate pure Jain & low-spice counter at zero extra charge',
          'RO drinking water & welcome thandai included'
        ],
        missingExclusions: ['Coffee machine rental (optional ₹3,500)'],
        contractRedFlags: 'None — all-inclusive per-plate rate with no hidden service charge.',
        negotiationTip: 'Ask for 10 complimentary plates buffer for children under 8.',
        isSelected: true
      },
      {
        id: 'vq-inr-2',
        vendorName: 'Imperial Grand Banquet Catering',
        category: 'Catering & Beverage',
        linkedBucketCategory: 'Catering & Beverage',
        headlineQuote: 144000,
        hiddenCharges: [
          {
            label: '15% Mandatory Service & Kitchen Fuel Surcharge',
            estimatedAmount: 21600,
            clauseNote: 'Added on top of base plate price'
          },
          {
            label: 'Live Counter Stalls & Chafing Fuel Extra',
            estimatedAmount: 18000,
            clauseNote: 'Charges ₹9,000 per live counter structure'
          },
          {
            label: 'Separate Jain Counter Setup Charge',
            estimatedAmount: 12000,
            clauseNote: 'Extra fee for separate utensils and chef'
          }
        ],
        trueLandedCost: 195600,
        inclusions: ['Standard buffet setup for 120 guests'],
        missingExclusions: ['Welcome drinks & live counters billed extra'],
        contractRedFlags:
          'Advertised ₹1,200/plate (₹1,44,000) jumps to ₹1,95,600 once 15% service surcharge, live stall fees, and Jain kitchen charges are added.',
        negotiationTip: 'Do not sign unless live stall charges and Jain counter fees are waived.',
        isSelected: false
      }
    ],
    timelineTasks: [
      {
        id: 'T-01',
        title: 'Book Ground-Floor Banquet Hall & Verify Generator / Lift Access',
        category: 'Venue & Spatial',
        priority: 'Critical',
        originalDueDate: '2026-11-15',
        dueDate: '2026-11-15',
        delayedByDays: 0,
        status: 'Completed',
        dependsOn: [],
        dependencyRule: 'Foundational step: Venue must be confirmed before caterer tasting or sending invitations.',
        audienceTailoring: 'Confirmed ground-floor entry and 6 plush sofas reserved for Dada-Dadi & elders.',
        owner: 'Family Host'
      },
      {
        id: 'T-02',
        title: 'Finalize Annapurna Royal Rasoi Menu & Jain / Low-Spice Tasting',
        category: 'Catering & Beverage',
        priority: 'Critical',
        originalDueDate: '2026-12-01',
        dueDate: '2026-12-01',
        delayedByDays: 0,
        status: 'In Progress',
        dependsOn: ['T-01'],
        dependencyRule: 'Depends on T-01: Kitchen layout at venue must be confirmed first.',
        audienceTailoring: 'Dedicated table-service waiters assigned so elders do not stand in buffet queues.',
        owner: 'Culinary Lead'
      },
      {
        id: 'T-03',
        title: 'Send WhatsApp Invites & Deliver 20 Printed Cards to Senior Relatives',
        category: 'Decor, Florals & Stationery',
        priority: 'High',
        originalDueDate: '2026-12-15',
        dueDate: '2026-12-15',
        delayedByDays: 0,
        status: 'Pending',
        dependsOn: ['T-01'],
        dependencyRule: 'Depends on T-01: Venue map and timing must be locked before sending invites.',
        audienceTailoring: 'Personal phone call + printed card for 20 elder households.',
        owner: 'Family Host'
      },
      {
        id: 'T-04',
        title: 'Lock Final 120 Guest Plate Count & Innova Cab Roster',
        category: 'Accessibility & Family Logistics',
        priority: 'Critical',
        originalDueDate: '2027-01-25',
        dueDate: '2027-01-25',
        delayedByDays: 0,
        status: 'Pending',
        dependsOn: ['T-02', 'T-03'],
        dependencyRule: 'Depends on T-02 & T-03: Final RSVP count required 20 days before event.',
        audienceTailoring: 'Share driver phone numbers with senior family members 48 hours prior.',
        owner: 'Logistics Lead'
      }
    ],
    cascadeLogs: [],
    personalizationRules: [
      {
        id: 'pers-inr-1',
        segment: '18 Senior Elders (Dada-Dadi, Nana-Nani & Senior Uncles/Aunts)',
        category: 'Accessibility',
        observation: 'Standing in crowded buffet lines or sitting near loud DJ speakers causes discomfort.',
        recommendation: 'Arrange VIP sofa cluster 30ft away from speakers and assign 4 waiters to serve hot rotis and starters directly to their seats.',
        linkedTaskId: 'T-02',
        estimatedCostImpact: 10000,
        applied: true
      }
    ]
  },
  {
    id: 'blank-onboarding-intake',
    name: 'New Event Plan (Guided Q&A Setup)',
    currency: 'USD',
    personaTag: 'Zero-Assumption Onboarding Intake',
    isOnboardingComplete: false,
    onboarding: {
      occasion: '',
      budget: null,
      guestCount: null,
      eventDate: '',
      experienceStyle: '',
      mustHaves: [],
      audienceNotes: ''
    },
    budgetBuckets: [],
    activeTradeOffId: null,
    tradeOffScenarios: [],
    vendorQuotes: [],
    timelineTasks: [],
    cascadeLogs: [],
    personalizationRules: []
  }
];
