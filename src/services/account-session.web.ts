// Authentication is held in a server-issued HttpOnly cookie on web.
export const getAccountToken = async (): Promise<string | null> => null;
export const setAccountToken = async (_token: string) => {};
export const clearAccountToken = async () => {};
