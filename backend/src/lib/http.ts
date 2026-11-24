export class HttpError extends Error {
  /** `details` are extra safe, non-secret fields merged into the JSON body (e.g. which cart lines changed). */
  constructor(public status: number, message: string, public code = "error", public fields?: Record<string, string[]>, public details?: Record<string, unknown>) { super(message); }
}
