/** A problem with the project's wiring or the DI config, reported to the developer verbatim. */
export class DiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiError";
  }
}
