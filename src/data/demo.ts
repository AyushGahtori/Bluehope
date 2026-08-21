import type { ProviderSummary } from "@/types/domain";
import { slugify } from "@/lib/utils";

const baseDemoProviders: ProviderSummary[] = [
  {
    id: "provider-bright-steps",
    slug: "bright-steps-speech-therapy-center",
    providerType: "institute",
    name: "Bright Steps Speech Therapy Center",
    title: "Speech and language therapy center",
    description:
      "A multi-disciplinary speech and language center helping children build communication skills in a warm, child-friendly setting.",
    services: ["speech-therapy", "language-therapy", "social-skills-training"],
    conditions: ["autism", "speech-delay", "communication-difficulties"],
    ageGroups: ["2-6 years", "7-12 years", "13-18 years"],
    languages: ["English", "Hindi", "Marathi"],
    modes: ["in_clinic", "online"],
    location: {
      formattedAddress: "Andheri West, Mumbai",
      city: "Mumbai",
      locality: "Andheri West",
      state: "Maharashtra",
      country: "India",
      coordinates: { type: "Point", coordinates: [72.8277, 19.1363] },
      publicPrecision: "exact_business",
    },
    rating: 4.8,
    reviewCount: 128,
    yearsInService: 6,
    priceRange: "medium",
    profileCompleteness: 92,
    verificationStatus: "review_ready",
    distanceKm: 1.2,
  },
  {
    id: "provider-wellvoice",
    slug: "wellvoice-speech-therapy",
    providerType: "sole_provider",
    name: "WellVoice Speech Therapy",
    title: "Independent speech therapist",
    description:
      "Individualized speech therapy, parent coaching, and language intervention for children with communication needs.",
    services: ["speech-therapy", "parent-coaching"],
    conditions: ["speech-delay", "autism", "down-syndrome"],
    ageGroups: ["2-6 years", "7-12 years"],
    languages: ["English", "Hindi"],
    modes: ["online", "home_visit"],
    location: {
      formattedAddress: "Bandra West, Mumbai",
      city: "Mumbai",
      locality: "Bandra West",
      state: "Maharashtra",
      country: "India",
      coordinates: { type: "Point", coordinates: [72.8296, 19.0607] },
      publicPrecision: "locality",
    },
    rating: 4.7,
    reviewCount: 64,
    yearsInService: 4,
    priceRange: "medium",
    profileCompleteness: 84,
    verificationStatus: "pending",
    distanceKm: 4.8,
  },
  {
    id: "provider-sensory-roots",
    slug: "sensory-roots-occupational-therapy",
    providerType: "institute",
    name: "Sensory Roots Occupational Therapy",
    title: "Occupational therapy and sensory integration",
    description:
      "Clinic-based occupational therapy for sensory processing, motor development, and daily living skills.",
    services: ["occupational-therapy", "sensory-integration"],
    conditions: ["sensory-processing", "autism", "motor-development", "dyspraxia"],
    ageGroups: ["2-6 years", "7-12 years"],
    languages: ["English", "Hindi"],
    modes: ["in_clinic"],
    location: {
      formattedAddress: "Juhu, Mumbai",
      city: "Mumbai",
      locality: "Juhu",
      state: "Maharashtra",
      country: "India",
      coordinates: { type: "Point", coordinates: [72.8265, 19.1075] },
      publicPrecision: "exact_business",
    },
    rating: 4.6,
    reviewCount: 91,
    yearsInService: 8,
    priceRange: "high",
    profileCompleteness: 88,
    verificationStatus: "review_ready",
    distanceKm: 3.1,
  },
  {
    id: "provider-learning-bridge",
    slug: "learning-bridge-special-education",
    providerType: "institute",
    name: "Learning Bridge Support School",
    title: "Inclusive school and learning support center",
    description:
      "Structured learning support for dyslexia, ADHD, and developmental learning needs with parent collaboration.",
    services: ["special-education", "learning-support"],
    conditions: ["adhd", "learning-disabilities", "dyslexia", "dysgraphia", "dyscalculia"],
    ageGroups: ["7-12 years", "13-18 years"],
    languages: ["English", "Hindi"],
    modes: ["in_clinic", "online"],
    location: {
      formattedAddress: "Powai, Mumbai",
      city: "Mumbai",
      locality: "Powai",
      state: "Maharashtra",
      country: "India",
      coordinates: { type: "Point", coordinates: [72.9081, 19.1197] },
      publicPrecision: "exact_business",
    },
    rating: 4.5,
    reviewCount: 53,
    yearsInService: 5,
    priceRange: "medium",
    profileCompleteness: 79,
    verificationStatus: "not_requested",
    distanceKm: 10.6,
  },
];

const delhiLocalities = [
  ["Saket", 77.2167, 28.5245],
  ["Dwarka", 77.046, 28.5921],
  ["Rohini", 77.1025, 28.7383],
  ["Lajpat Nagar", 77.2433, 28.5677],
  ["Vasant Kunj", 77.1552, 28.5293],
  ["Pitampura", 77.1342, 28.7033],
  ["Janakpuri", 77.0864, 28.6219],
  ["Karol Bagh", 77.19, 28.6517],
  ["Greater Kailash", 77.2425, 28.5481],
  ["Mayur Vihar", 77.2956, 28.6138],
];

const providerNames = [
  "Speech Spark Therapy",
  "Calm Steps Child Development",
  "BrightPath Special Education",
  "Little Wins Therapy",
  "Mindful Milestones",
  "HopeBridge Learning Center",
  "Sensory Nest Clinic",
  "CareCircle Therapy",
  "Language Ladder",
  "Focus Forward Support",
  "ChildFirst Development",
  "Aarambh Therapy Studio",
  "KindSteps Occupational Therapy",
  "Social Sprouts",
  "Delhi Development Hub",
  "Nurture Point Clinic",
  "Happy Words Speech Care",
  "Learning Leaf Center",
  "Steady Steps Physiotherapy",
  "Family Anchor Support",
  "Inclusive Minds School",
  "Progress Play Therapy",
  "BloomBridge Care",
  "North Star Child Therapy",
  "New Leaf Learning",
];

const soleTitles = [
  "Independent speech therapist",
  "Occupational therapist",
  "Special educator",
  "Child psychologist",
  "Behaviour therapist",
];

const instituteTitles = [
  "Child development center",
  "Multidisciplinary therapy center",
  "Inclusive learning institute",
  "Speech and occupational therapy clinic",
  "Special education support center",
];

const serviceSets = [
  ["speech-therapy", "language-therapy", "parent-coaching"],
  ["occupational-therapy", "sensory-integration", "parent-coaching"],
  ["special-education", "learning-support", "social-skills-training"],
  ["behaviour-therapy", "aba", "parent-coaching"],
  ["physiotherapy", "occupational-therapy", "developmental-services"],
  ["psychological-services", "counselling", "parent-coaching"],
];

const conditionSets = [
  ["autism", "speech-delay", "communication-difficulties"],
  ["sensory-processing", "autism", "motor-development"],
  ["adhd", "learning-disabilities", "dyslexia"],
  ["behavioural-difficulties", "emotional-regulation", "adhd"],
  ["cerebral-palsy", "motor-development", "developmental-delay"],
  ["down-syndrome", "speech-delay", "developmental-delay"],
];

const languages = [
  ["English", "Hindi"],
  ["English", "Hindi", "Punjabi"],
  ["Hindi", "English", "Urdu"],
  ["English", "Hindi", "Bengali"],
];

const modes: ProviderSummary["modes"][] = [
  ["in_clinic", "online"],
  ["online", "home_visit"],
  ["in_clinic"],
  ["in_clinic", "online", "home_visit"],
];

const delhiDemoProviders: ProviderSummary[] = Array.from({ length: 50 }, (_, index) => {
  const locality = delhiLocalities[index % delhiLocalities.length];
  const isInstitute = index % 2 === 0;
  const name = `${providerNames[index % providerNames.length]} ${index + 1}`;
  const serviceList = serviceSets[index % serviceSets.length];
  const conditionList = conditionSets[index % conditionSets.length];

  return {
    id: `delhi-demo-${index + 1}`,
    slug: slugify(name),
    providerType: isInstitute ? "institute" : "sole_provider",
    name,
    title: isInstitute ? instituteTitles[index % instituteTitles.length] : soleTitles[index % soleTitles.length],
    description: `${name} is fictional demo data for testing BlueHope search, saving, enquiry, and appointment flows in Delhi.`,
    services: serviceList,
    conditions: conditionList,
    ageGroups: index % 3 === 0 ? ["2-6 years", "7-12 years"] : ["7-12 years", "13-18 years"],
    languages: languages[index % languages.length],
    modes: modes[index % modes.length],
    location: {
      formattedAddress: `${locality[0]}, Delhi`,
      city: "Delhi",
      locality: locality[0] as string,
      state: "Delhi",
      country: "India",
      coordinates: {
        type: "Point",
        coordinates: [(locality[1] as number) + index * 0.0007, (locality[2] as number) + index * 0.0005],
      },
      publicPrecision: isInstitute ? "exact_business" : "locality",
    },
    rating: Number((4.2 + (index % 7) * 0.1).toFixed(1)),
    reviewCount: 18 + index * 3,
    yearsInService: 2 + (index % 11),
    priceRange: index % 3 === 0 ? "low" : index % 3 === 1 ? "medium" : "high",
    profileCompleteness: 68 + (index % 28),
    verificationStatus: index % 4 === 0 ? "review_ready" : index % 4 === 1 ? "pending" : "not_requested",
    distanceKm: Number((1.4 + (index % 18) * 1.35).toFixed(1)),
  };
});

export const demoProviders: ProviderSummary[] = [...baseDemoProviders, ...delhiDemoProviders];

export const demoAppointments = [
  { date: "May 14", name: "Riya Shah", service: "Speech Therapy Session", time: "04:00 PM - 05:00 PM" },
  { date: "May 15", name: "Aarav Sharma", service: "Occupational Therapy Session", time: "11:00 AM - 12:00 PM" },
];

export const demoActivities = [
  "Speech therapy session completed",
  "New message from WellVoice Speech Therapy",
  "Occupational therapy session booked",
];
