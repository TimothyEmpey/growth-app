import * as SecureStore from 'expo-secure-store';
export const setVerifier = (value: string) => SecureStore.setItemAsync('growth-verifier', value);
export const getVerifier = () => SecureStore.getItemAsync('growth-verifier');
export const clearVerifier = () => SecureStore.deleteItemAsync('growth-verifier');
