/** Sports pages browse by official FPFS eventId without saving a new profile. */
export function dashboardUrl(eventId: number | null): string {
  return eventId == null
    ? "/api/dashboard"
    : `/api/dashboard?eventId=${encodeURIComponent(String(eventId))}`;
}

/** Only eventId is forwarded. Other dashboard query values cannot affect the backend. */
export function sportsHomePath(params: URLSearchParams): string {
  const eventId = params.get("eventId");
  return eventId == null
    ? "/api/v1/home"
    : `/api/v1/home?eventId=${encodeURIComponent(eventId)}`;
}
