export type User = {
  id: string;
  name: string;
  email: string;
};

export type Campus = {
  id: string;
  name: string;
  description?: string;
};

export type Program = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
};

export type Discipline = {
  id: string;
  name: string;
  description?: string;
  semester: number;
  year: number;
};

export type StudentStatus =
  | "ACTIVE"
  | "CANCELED"
  | "GRADUATED"
  | "LOCKED"
  | "PENDING";

export type Student = {
  id: string;
  studentId: string;
  name?: string;
  email?: string;
  phone?: string;
  noPhone?: boolean;
  annotation?: string;
  status?: StudentStatus;
  consent?: boolean;
  emailDeliveryIssue?: boolean;
  whatsappDeliveryIssue?: boolean;
};

export type SmtpInstance = {
  id: string;
  host: string;
  port: number;
  email: string;
  authMode?: string;
  provider?: string;
  tokenExpiresAt?: string;
};

export type WhatsappInstance = {
  id: string;
  instanceName?: string;
  phone: string;
  connectionStatus?: string;
};

export type ApiMessage = {
  message?: string;
  error?: string;
};

export type ApiResponse<T> = {
  message?: string;
  data: T;
};
