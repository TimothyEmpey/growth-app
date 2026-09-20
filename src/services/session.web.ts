// Web sessions use server-managed HttpOnly cookies; JavaScript never reads or stores the token.
export const getSessionToken = async (): Promise<string | null> => null;
export const setSessionToken = async (_token: string) => {};
export const clearSession = async () => {};
