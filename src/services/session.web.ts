// Web OAuth state is bound by an HttpOnly cookie, so no device verifier is stored in JavaScript.
export const setVerifier = async (_value: string) => {};
export const getVerifier = async (): Promise<string | null> => null;
export const clearVerifier = async () => {};
