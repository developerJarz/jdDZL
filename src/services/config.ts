// Backend integration switch.
//
// The reference site talks to a private commerce API that was not captured by the HTTrack
// snapshot. Until a real endpoint is configured, every service resolves against the local
// mock catalogue in src/data. Set NEXT_PUBLIC_API_BASE_URL to start wiring real calls
// (each service marks the call it would make with `API:` comments).
export const API_BASE_URL = "/api/commerce";
export const USE_MOCK_DATA = false;

export class ApiNotConfiguredError extends Error {
  constructor(feature: string) {
    super(`${feature} requires a backend. Configure NEXT_PUBLIC_API_BASE_URL to enable it.`);
    this.name = "ApiNotConfiguredError";
  }
}
