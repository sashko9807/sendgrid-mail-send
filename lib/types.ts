export type ContactsFromListParams = {
  listId: string;
};

export type SendGridExportStatusResponse = {
  id: string;
  status: "pending" | "failure" | "ready";
  created_at: string;
  updated_at: string;
  completed_at: string;
  expires_at: string;
  urls: string[];
  message?: string;
  _metadata: SendGridExportMetadata;
  contact_count: number;
};

export interface SendGridExportMetadata {
  prev: string;
  self: string;
  next: string;
  count: number;
}

export type SendGridExportResponse = {
  id: string;
  _metadata: SendGridExportMetadata;
};

export interface SendgridExportParams {
  list_ids: string[];
  file_type: "json" | "csv";
  segments?: string[];
  max_file_size?: number;
}

export interface ContactsResponse {
  contact_id: string;
  created_at: string;
  custom_fields: object;
  email: string;
  first_name?: string;
  last_name?: string;
  updated_at: string;
}

type SendGridContactList = {
  id: string;
  name: string;
  contact_count: number;
  _metadata: object;
};

export type ContactListRes = {
  result: SendGridContactList[];
  _metadata: object;
};

type MailList = {
  firstName: string;
  lastName: string;
};

export type MassMail = {
  listId: string;
  templateId: string;
  subject: string;
};

export type ContactsMap = Map<string, MailList>;
