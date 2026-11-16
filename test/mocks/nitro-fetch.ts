/** Jest stand-in for react-native-nitro-fetch (a native module). Tests inject their own HttpHandler instead. */
export async function fetch(): Promise<never> {
  throw new Error('react-native-nitro-fetch is native: inject a fake HttpHandler / HttpClient in tests');
}
