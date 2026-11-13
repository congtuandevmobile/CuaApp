/** One use case = one thing the app can do, with one `execute`. Presentation never talks to infrastructure directly. */
export interface UseCase<Input, Output> {
  execute(input: Input): Output;
}
