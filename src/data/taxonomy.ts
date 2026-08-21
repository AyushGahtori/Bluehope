import type { Condition, Service } from "@/types/domain";
import { slugify } from "@/lib/utils";

function condition(
  id: string,
  name: string,
  category: Condition["category"],
  supportAreas: string[],
): Condition {
  return {
    id,
    name,
    slug: slugify(name),
    category,
    description:
      category === "diagnosis"
        ? `${name} support area for structured discovery and family matching.`
        : `${name} help area for parent-friendly search and recommendations.`,
    active: true,
    subcategories: supportAreas.map((area, index) => ({
      id: `${id}-s${index + 1}`,
      conditionId: id,
      name: area,
      slug: slugify(area),
      description: `${area} support related to ${name}.`,
      active: true,
    })),
  };
}

export const conditions: Condition[] = [
  condition("autism", "Autism Spectrum Disorder", "diagnosis", [
    "Communication",
    "Speech",
    "Social interaction",
    "Sensory processing",
    "Behaviour",
    "Learning",
    "Emotional regulation",
    "Daily living skills",
  ]),
  condition("adhd", "ADHD", "diagnosis", [
    "Attention",
    "Behaviour management",
    "Executive functioning",
    "Learning support",
    "Emotional regulation",
    "Organization",
  ]),
  condition("speech-delay", "Speech and Language Delay", "support_need", [
    "Expressive language",
    "Receptive language",
    "Pronunciation",
    "Articulation",
    "Vocabulary",
    "Social communication",
  ]),
  condition("developmental-delay", "Developmental Delay", "support_need", [
    "Global development",
    "Motor milestones",
    "Play skills",
    "Adaptive skills",
  ]),
  condition("learning-disabilities", "Learning Disabilities", "diagnosis", [
    "Reading",
    "Writing",
    "Math",
    "Study skills",
  ]),
  condition("sensory-processing", "Sensory Processing Difficulties", "support_need", [
    "Sensory seeking",
    "Sensory avoidance",
    "Regulation",
    "Motor planning",
  ]),
  condition("cerebral-palsy", "Cerebral Palsy", "diagnosis", [
    "Physiotherapy",
    "Occupational therapy",
    "Communication",
    "Mobility",
  ]),
  condition("down-syndrome", "Down Syndrome", "diagnosis", [
    "Speech",
    "Learning",
    "Motor skills",
    "Daily living",
  ]),
  condition("hearing-impairment", "Hearing Impairment", "diagnosis", [
    "Language support",
    "Auditory training",
    "School readiness",
  ]),
  condition("visual-impairment", "Visual Impairment", "diagnosis", [
    "Orientation",
    "Learning adaptations",
    "Daily living skills",
  ]),
  condition("behavioural-difficulties", "Behavioural Difficulties", "support_need", [
    "Positive behaviour support",
    "Parent coaching",
    "Emotional regulation",
  ]),
  condition("communication-difficulties", "Communication Difficulties", "support_need", [
    "Speech clarity",
    "Social communication",
    "Alternative communication",
  ]),
  condition("dyslexia", "Dyslexia", "diagnosis", ["Reading", "Phonics", "Comprehension"]),
  condition("dysgraphia", "Dysgraphia", "diagnosis", ["Handwriting", "Writing planning"]),
  condition("dyscalculia", "Dyscalculia", "diagnosis", ["Number sense", "Math confidence"]),
  condition("dyspraxia", "Dyspraxia", "diagnosis", ["Motor planning", "Coordination"]),
  condition("motor-development", "Motor Development Difficulties", "support_need", [
    "Fine motor",
    "Gross motor",
    "Coordination",
  ]),
  condition("emotional-regulation", "Emotional Regulation Difficulties", "support_need", [
    "Coping skills",
    "Anxiety support",
    "Behaviour planning",
  ]),
  condition("feeding-difficulties", "Feeding Difficulties", "support_need", [
    "Oral motor",
    "Sensory feeding",
    "Mealtime routines",
  ]),
  condition("rare-developmental", "Rare Developmental Conditions", "diagnosis", [
    "Individualized support",
    "Family guidance",
  ]),
  condition("other-developmental", "Other Developmental Support Needs", "support_need", [
    "Assessment guidance",
    "Multi-disciplinary support",
  ]),
];

export const services: Service[] = [
  ["speech-therapy", "Speech Therapy", "therapy"],
  ["language-therapy", "Language Therapy", "therapy"],
  ["occupational-therapy", "Occupational Therapy", "therapy"],
  ["physiotherapy", "Physiotherapy", "therapy"],
  ["behaviour-therapy", "Behaviour Therapy", "therapy"],
  ["aba", "ABA", "therapy"],
  ["special-education", "Special Education", "education"],
  ["learning-support", "Learning Support", "education"],
  ["social-skills-training", "Social Skills Training", "family_support"],
  ["sensory-integration", "Sensory Integration", "therapy"],
  ["parent-coaching", "Parent Coaching", "family_support"],
  ["counselling", "Counselling", "family_support"],
  ["psychological-services", "Psychological Services", "medical"],
  ["developmental-services", "Developmental Services", "therapy"],
].map(([id, name, category]) => ({
  id,
  name,
  slug: id,
  category: category as Service["category"],
  description: `${name} services available through BlueHope discovery.`,
  active: true,
}));

export const quickCategories = [
  { id: "therapist", label: "Therapist", serviceIds: ["speech-therapy", "occupational-therapy"] },
  { id: "near-me", label: "Near Me", serviceIds: [] },
  { id: "school", label: "School", serviceIds: ["special-education"] },
  { id: "doctor", label: "Doctor", serviceIds: ["psychological-services"] },
];
