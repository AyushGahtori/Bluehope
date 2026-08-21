import { Schema, models, model } from "mongoose";

const geoPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point", required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const locationSchema = new Schema(
  {
    formattedAddress: String,
    city: { type: String, index: true },
    locality: { type: String, index: true },
    state: String,
    country: String,
    postalCode: String,
    coordinates: { type: geoPointSchema, index: "2dsphere" },
    publicPrecision: {
      type: String,
      enum: ["locality", "approximate", "exact_business"],
      default: "locality",
    },
  },
  { _id: false },
);

export const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, index: true },
    phone: String,
    role: { type: String, enum: ["parent", "provider", "institute", "admin"], required: true },
    displayName: String,
    onboardingStatus: { type: String, enum: ["started", "completed"], default: "started" },
  },
  { timestamps: true },
);

export const ParentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    firstName: String,
    lastName: String,
    locationPreference: locationSchema,
    activeChildId: { type: Schema.Types.ObjectId, ref: "ChildProfile" },
    privacy: {
      communityVisible: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const ChildProfileSchema = new Schema(
  {
    parentProfileId: { type: Schema.Types.ObjectId, ref: "ParentProfile", required: true, index: true },
    firstName: String,
    relationship: String,
    gender: String,
    age: Number,
    conditionIds: [{ type: Schema.Types.ObjectId, ref: "Condition" }],
    supportNeedIds: [{ type: Schema.Types.ObjectId, ref: "ConditionSubcategory" }],
  },
  { timestamps: true },
);

export const ConditionSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, enum: ["diagnosis", "support_need"], required: true },
    description: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ConditionSubcategorySchema = new Schema(
  {
    conditionId: { type: Schema.Types.ObjectId, ref: "Condition", required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    description: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ServiceSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, enum: ["therapy", "education", "medical", "family_support"], required: true },
    description: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const verificationFields = {
  verificationStatus: {
    type: String,
    enum: ["not_requested", "pending", "review_ready", "verified"],
    default: "not_requested",
  },
  verificationLevel: String,
  verificationRequestedAt: Date,
  verificationCompletedAt: Date,
  verificationSignals: [String],
  verificationNotes: String,
  verificationDocuments: [{ type: Schema.Types.ObjectId, ref: "ProviderCredential" }],
};

export const ProviderProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    displayName: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    professionalTitle: String,
    bio: String,
    philosophy: String,
    serviceIds: [{ type: Schema.Types.ObjectId, ref: "Service", index: true }],
    conditionIds: [{ type: Schema.Types.ObjectId, ref: "Condition", index: true }],
    ageGroups: [String],
    languages: [String],
    modes: [String],
    yearsInService: Number,
    approximateClientsServed: Number,
    pricing: {
      currency: String,
      minFee: Number,
      maxFee: Number,
    },
    location: locationSchema,
    profileCompleteness: { type: Number, default: 0 },
    ...verificationFields,
  },
  { timestamps: true },
);

ProviderProfileSchema.index({ "location.coordinates": "2dsphere" });
ProviderProfileSchema.index({ displayName: "text", professionalTitle: "text", bio: "text" });

export const InstituteProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    organizationName: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    organizationType: String,
    representativeName: String,
    representativeDesignation: String,
    officialEmail: String,
    officialPhone: String,
    website: String,
    foundedYear: Number,
    gstNumber: String,
    businessRegistrationNumber: String,
    locations: [locationSchema],
    serviceIds: [{ type: Schema.Types.ObjectId, ref: "Service", index: true }],
    conditionIds: [{ type: Schema.Types.ObjectId, ref: "Condition", index: true }],
    staffProviderIds: [{ type: Schema.Types.ObjectId, ref: "ProviderProfile" }],
    profileCompleteness: { type: Number, default: 0 },
    ...verificationFields,
  },
  { timestamps: true },
);

export const SavedProviderSchema = new Schema(
  {
    parentProfileId: { type: Schema.Types.ObjectId, ref: "ParentProfile", required: true, index: true },
    targetType: { type: String, enum: ["provider", "institute"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  { timestamps: true },
);

SavedProviderSchema.index({ parentProfileId: 1, targetType: 1, targetId: 1 }, { unique: true });

export const EnquirySchema = new Schema(
  {
    parentProfileId: { type: Schema.Types.ObjectId, ref: "ParentProfile", required: true, index: true },
    childProfileId: { type: Schema.Types.ObjectId, ref: "ChildProfile" },
    targetType: { type: String, enum: ["provider", "institute"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    message: String,
    status: { type: String, enum: ["new", "responded", "in_progress", "closed"], default: "new" },
  },
  { timestamps: true },
);

export const BookingSchema = new Schema(
  {
    parentProfileId: { type: Schema.Types.ObjectId, ref: "ParentProfile", required: true, index: true },
    childProfileId: { type: Schema.Types.ObjectId, ref: "ChildProfile" },
    targetType: { type: String, enum: ["provider", "institute"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    appointmentDate: Date,
    startTime: String,
    endTime: String,
    status: {
      type: String,
      enum: ["requested", "confirmed", "completed", "cancelled", "rejected", "no_show"],
      default: "requested",
    },
    notes: String,
  },
  { timestamps: true },
);

export const ReviewSchema = new Schema(
  {
    parentProfileId: { type: Schema.Types.ObjectId, ref: "ParentProfile", required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    targetType: { type: String, enum: ["provider", "institute"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    reviewText: String,
    moderationStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true },
);

export const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: String,
    title: String,
    body: String,
    readAt: Date,
  },
  { timestamps: true },
);

export const SearchHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    query: String,
    filters: Schema.Types.Mixed,
    resultCount: Number,
  },
  { timestamps: true },
);

export const UserModel = models.User || model("User", UserSchema);
export const ParentProfileModel = models.ParentProfile || model("ParentProfile", ParentProfileSchema);
export const ChildProfileModel = models.ChildProfile || model("ChildProfile", ChildProfileSchema);
export const ConditionModel = models.Condition || model("Condition", ConditionSchema);
export const ConditionSubcategoryModel =
  models.ConditionSubcategory || model("ConditionSubcategory", ConditionSubcategorySchema);
export const ServiceModel = models.Service || model("Service", ServiceSchema);
export const ProviderProfileModel = models.ProviderProfile || model("ProviderProfile", ProviderProfileSchema);
export const InstituteProfileModel = models.InstituteProfile || model("InstituteProfile", InstituteProfileSchema);
export const SavedProviderModel = models.SavedProvider || model("SavedProvider", SavedProviderSchema);
export const EnquiryModel = models.Enquiry || model("Enquiry", EnquirySchema);
export const BookingModel = models.Booking || model("Booking", BookingSchema);
export const ReviewModel = models.Review || model("Review", ReviewSchema);
export const NotificationModel = models.Notification || model("Notification", NotificationSchema);
export const SearchHistoryModel = models.SearchHistory || model("SearchHistory", SearchHistorySchema);
