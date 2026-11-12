export class ClientHttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public retryAt?: Date,
  ) {
    super(code);
  }
}
