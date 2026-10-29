export type Profile = {
  id: number;
  role: string;
  firebaseUid: string;
  fullName: string | null;
  email: string | null;
  status: string;
};
export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};
export type Params = Record<
  string,
  string | number | boolean | undefined | null
>;
export type RideStatus =
  | "PENDING"
  | "SEARCHING"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ARRIVING"
  | "DRIVER_ARRIVED"
  | "VEHICLE_HANDOVER"
  | "IN_PROGRESS"
  | "ARRIVED_DESTINATION"
  | "VEHICLE_RETURNED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_DRIVER_FOUND"
  | "EXPIRED";
export type Ride = {
  id: number;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  type: string;
  status: RideStatus;
  estimatedFare: number;
  finalFare: number | null;
  scheduledAt: string | null;
  createdAt: string;
};
export type GeoPoint = { lat: number | null; lng: number | null };
export type RideDetail = Ride & {
  customerId: number;
  driverId: number | null;
  vehicleId: number;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  distanceKm: number | null;
  cancelReason: string | null;
  cancelledBy: number | null;
  cancelledByRole: string | null;
  discountAmount: number | null;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  statusHistory: {
    id: number;
    fromStatus: string | null;
    toStatus: string;
    actorId: number | null;
    actorRole: string | null;
    note: string | null;
    createdAt: string;
  }[];
  handoverReports: {
    id: number;
    phase: string;
    odometer: number;
    fuelLevel: number | null;
    notes: string | null;
    confirmedByCustomer: boolean;
    createdAt: string;
    photos: { id: number; angle: string; fileUrl: string }[];
  }[];
};
export type Driver = {
  id: number;
  fullName: string | null;
  phoneNumber: string;
  email: string | null;
  status: string;
  verificationStatus: string;
  flagged: boolean;
  totalTrips: number;
  averageRating: number | null;
  acceptanceRate: number | null;
  completionRate: number | null;
  cancelRate30d: number | null;
  creditBalance: number;
  incomeBalance: number;
  createdAt: string;
};
export type DriverDocument = {
  id: number;
  driverId: number;
  documentType: string;
  documentNumber: string | null;
  secureUrl: string;
  verificationStatus: string;
  rejectionReason: string | null;
  expiresAt: string | null;
  isCurrent: boolean;
  reviewedAt: string | null;
  createdAt: string;
};
export type Skill = {
  id: number;
  vehicleType: string;
  transmission: string;
  licenseClass: string | null;
  verified: boolean;
};
export type DriverDetail = {
  driver: Driver;
  documents: DriverDocument[];
  skills: Skill[];
};
export type DocumentQueue = {
  document: DriverDocument;
  driverName: string | null;
  driverPhone: string;
};
export type Customer = {
  id: number;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  status: string;
  isFlagged: boolean;
  totalTrips: number;
  totalCancelled: number;
  cancelRate30d: number;
  averageRating: number | null;
  walletBalance: number;
  lastLoginAt: string | null;
  createdAt: string;
};
export type Vehicle = {
  id: number;
  plateNumber: string | null;
  transmissionType: string | null;
  vehicleType: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  images: { id: number; secureUrl: string }[];
};
export type CustomerDetail = Customer & {
  dateOfBirth: string | null;
  gender: string | null;
  defaultPaymentMethod: string | null;
  vehicles: Vehicle[];
  recentRides: Ride[];
};
export type WalletTransaction = {
  id: number;
  rideId: number | null;
  amount: number;
  type: string;
  status: string | null;
  description: string | null;
  walletType: string;
  balanceAfter: number | null;
  createdAt: string;
};
export type NearbyDriver = {
  driverId: number;
  distanceKm: number;
  location: GeoPoint;
};
export type ChatMessage = {
  id: number;
  senderRole: string;
  messageType: string;
  content: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  readAt: string | null;
};
export type MessagePage = {
  rideId: number;
  messages: ChatMessage[];
  hasMore: boolean;
};
export type Pricing = {
  id: number;
  baseFare: number;
  perKm: number;
  perMinuteWaiting: number;
  nightSurchargePercent: number;
  nightStart: string | null;
  nightEnd: string | null;
  returnFeeForDriver: number;
  minFare: number;
  active: boolean;
  vehicleType: string;
  createdAt: string;
  updatedAt: string;
};
export type PricingInput = Omit<Pricing, "id" | "createdAt" | "updatedAt">;
