import type { InternalAxiosRequestConfig } from "axios";

/**
 * 요청 인터셉터: Authorization 헤더 주입
 * authToken이 있으면 모든 요청에 Bearer 토큰 추가
 */
export function authRequestInterceptor(getToken?: () => string | undefined) {
  return (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getToken?.();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  };
}
