export type ActivityFormState = {
  id?: string;
  date: string;
  user: string;
  type: string;
  exp: string;
  scope: string;
  comment: string;
  requestedAs?: string;
  source?: string;
}