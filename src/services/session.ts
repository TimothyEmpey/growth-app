import * as SecureStore from 'expo-secure-store';
export const getSessionToken = () => SecureStore.getItemAsync('growth-session');
export const setSessionToken = (token: string) => SecureStore.setItemAsync('growth-session', token);
export const clearSession = () => SecureStore.deleteItemAsync('growth-session');
export const setVerifier = (value: string) => SecureStore.setItemAsync('growth-verifier', value);
export const getVerifier = () => SecureStore.getItemAsync('growth-verifier');
export const clearVerifier = () => SecureStore.deleteItemAsync('growth-verifier');
