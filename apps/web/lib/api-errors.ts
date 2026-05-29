export type FastApiErrorShape = {
  code: string;
  message: string;
  details: Record<string, unknown>;
};

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details: Record<string, unknown>;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details ?? {};
  }
}

