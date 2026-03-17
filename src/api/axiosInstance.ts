import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';

let apiInstance: AxiosInstance | null = null;

export async function getApiInstance(): Promise<AxiosInstance> {
  const baseURL =
    (await AsyncStorage.getItem(Config.STORAGE_KEYS.API_URL)) ||
    Config.DEFAULT_API_URL;

  apiInstance = axios.create({
    baseURL,
    timeout: Config.API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Response interceptor
  apiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 404) {
        return Promise.reject(new Error('Kayıt bulunamadı (404)'));
      }
      if (!error.response) {
        return Promise.reject(new Error('Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.'));
      }
      return Promise.reject(error);
    }
  );

  return apiInstance;
}

/**
 * URL parametrelerini birleştiren yardımcı fonksiyon.
 * MAUI'deki /{param1}/{param2}/... pattern'ini karşılar.
 */
export function buildUrl(endpoint: string, ...params: (string | number)[]): string {
  const parts = params.map((p) => {
    const s = String(p);
    return s === '' ? "''" : s;
  });
  return parts.length > 0 ? `${endpoint}/${parts.join('/')}` : endpoint;
}
