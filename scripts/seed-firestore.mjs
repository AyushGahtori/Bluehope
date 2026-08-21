import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, GeoPoint, getFirestore } from "firebase-admin/firestore";

const required = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing Firebase Admin env: ${missing.join(", ")}`);
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    storageBucket:
      process.env.FIREBASE_ADMIN_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();

const now = FieldValue.serverTimestamp();

const conditions = [
  ["autism-spectrum-disorder", "Autism Spectrum Disorder", "Autism support"],
  ["adhd", "ADHD", "Attention and regulation support"],
  ["speech-language-delay", "Speech and Language Delay", "Speech and language delay"],
  ["developmental-delay", "Developmental Delay", "Developmental delay"],
  ["learning-disabilities", "Learning Disabilities", "Learning support"],
  ["sensory-processing", "Sensory Processing Difficulties", "Sensory support"],
  ["cerebral-palsy", "Cerebral Palsy", "Motor support"],
  ["down-syndrome", "Down Syndrome", "Developmental support"],
  ["dyslexia", "Dyslexia", "Reading support"],
  ["emotional-regulation", "Emotional Regulation Difficulties", "Emotional regulation"],
];

const services = [
  ["speech-therapy", "Speech Therapy", "therapy"],
  ["occupational-therapy", "Occupational Therapy", "therapy"],
  ["physiotherapy", "Physiotherapy", "therapy"],
  ["behaviour-therapy", "Behaviour Therapy", "therapy"],
  ["aba-therapy", "ABA Therapy", "therapy"],
  ["special-education", "Special Education", "education"],
  ["learning-support", "Learning Support", "education"],
  ["sensory-integration", "Sensory Integration", "therapy"],
  ["psychological-support", "Psychological Support", "medical"],
  ["parent-coaching", "Parent Coaching", "family_support"],
  ["social-skills-training", "Social Skills Training", "therapy"],
  ["early-intervention", "Early Intervention", "therapy"],
];

const localities = [
  ["saket", "Saket", 28.5245, 77.2066],
  ["dwarka", "Dwarka", 28.5921, 77.046],
  ["rohini", "Rohini", 28.7396, 77.0897],
  ["pitampura", "Pitampura", 28.7033, 77.1324],
  ["vasant-kunj", "Vasant Kunj", 28.5203, 77.1586],
  ["lajpat-nagar", "Lajpat Nagar", 28.5677, 77.2433],
  ["mayur-vihar", "Mayur Vihar", 28.6086, 77.2954],
  ["janakpuri", "Janakpuri", 28.6219, 77.0878],
  ["green-park", "Green Park", 28.5582, 77.2044],
  ["preet-vihar", "Preet Vihar", 28.6415, 77.2951],
];

const providerNames = [
  "Bright Steps Therapy",
  "CareBridge Child Development",
  "SpeechNest Delhi",
  "HopeSprout Learning",
  "Little Wins Clinic",
  "Mindful Milestones",
  "AblePath Support",
  "WellVoice Therapy",
  "BloomBridge Center",
  "SkillSpring Specialists",
];

function ratingSummary(index) {
  const average = Number((4.2 + (index % 7) * 0.1).toFixed(1));
  return {
    average,
    total: 24 + index * 3,
    distribution: { "1": 1, "2": 2, "3": 4, "4": 10 + index, "5": 18 + index * 2 },
  };
}

function listingFor(index) {
  const locality = localities[index % localities.length];
  const isInstitute = index % 2 === 0;
  const serviceIds = [services[index % services.length][0], services[(index + 3) % services.length][0]];
  const conditionIds = [
    conditions[index % conditions.length][0],
    conditions[(index + 2) % conditions.length][0],
  ];
  const listingId = `demo-delhi-${String(index + 1).padStart(2, "0")}`;
  const title = `${providerNames[index % providerNames.length]} ${locality[1]}`;

  return {
    listingId,
    ownerUid: `demo-owner-${listingId}`,
    ownerType: isInstitute ? "institution" : "soleProvider",
    sourceCollection: isInstitute ? "institutionProfiles" : "providerProfiles",
    sourceId: listingId,
    title,
    slug: listingId,
    shortDescription: `${title} offers child-focused developmental support in ${locality[1]}, Delhi.`,
    serviceIds,
    conditionIds,
    ageGroups: ["2-6", "7-12", "13-18"],
    primaryAgeGroup: index % 3 === 0 ? "2-6" : index % 3 === 1 ? "7-12" : "13-18",
    languages: ["English", "Hindi"],
    location: {
      geo: new GeoPoint(locality[2], locality[3]),
      formattedAddress: `${locality[1]}, New Delhi, Delhi, India`,
      city: "Delhi",
      locality: locality[1],
      state: "Delhi",
      country: "India",
      publicPrecision: "locality",
    },
    city: "Delhi",
    locality: locality[1],
    state: "Delhi",
    geohashPrefix5: `demo${index % 10}`,
    availabilityFlags: {
      clinic: true,
      online: index % 3 !== 0,
      homeVisit: index % 4 === 0,
    },
    pricingSummary: {
      minFee: 900 + (index % 5) * 200,
      maxFee: 1800 + (index % 5) * 250,
      currency: "INR",
    },
    ratingSummary: ratingSummary(index),
    rating: ratingSummary(index).average,
    totalReviews: ratingSummary(index).total,
    verificationStatus: index % 5 === 0 ? "pending" : "verified",
    profileStatus: "active",
    searchTokens: title.toLowerCase().split(/\s+/),
    searchKeywords: [
      title.toLowerCase(),
      ...serviceIds,
      ...conditionIds,
      locality[1].toLowerCase(),
      "delhi",
    ],
    rankingFeatures: {
      relevanceBoost: 1,
      profileCompleteness: 80 + (index % 20),
      popularityScore: 40 + index,
      trustScore: index % 5 === 0 ? 55 : 80,
    },
    demo: true,
    updatedAt: now,
    createdAt: now,
  };
}

async function setMany(collection, entries) {
  const batch = db.batch();
  entries.forEach(([id, data]) => {
    batch.set(db.collection(collection).doc(id), data, { merge: true });
  });
  await batch.commit();
}

await setMany(
  "conditions",
  conditions.map(([id, label, parentFriendlyLabel], sortOrder) => [
    id,
    {
      id,
      slug: id,
      label,
      parentFriendlyLabel,
      category: "developmental_support",
      aliases: [],
      active: true,
      sortOrder,
      demo: true,
      createdAt: now,
      updatedAt: now,
    },
  ]),
);

await setMany(
  "services",
  services.map(([id, label, category], sortOrder) => [
    id,
    {
      id,
      slug: id,
      label,
      parentFriendlyLabel: label,
      category,
      aliases: [],
      active: true,
      sortOrder,
      demo: true,
      createdAt: now,
      updatedAt: now,
    },
  ]),
);

const listings = Array.from({ length: 50 }, (_, index) => listingFor(index));
await setMany("listings", listings.map((listing) => [listing.listingId, listing]));
await setMany("searchListings", listings.map((listing) => [listing.listingId, listing]));

console.log(`Seeded ${conditions.length} conditions, ${services.length} services, and ${listings.length} demo Delhi listings.`);
