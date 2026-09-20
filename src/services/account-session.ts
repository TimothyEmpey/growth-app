import * as SecureStore from 'expo-secure-store';
export const getAccountToken = () => SecureStore.getItemAsync('growth-account-session');
export const setAccountToken = (token: string) =>
  SecureStore.setItemAsync('growth-account-session', token);
export const clearAccountToken = () => SecureStore.deleteItemAsync('growth-account-session');
