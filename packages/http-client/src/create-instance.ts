import axios, { AxiosInstance } from "axios";
import { HttpClientConfig } from "./http-client.type";
import { authRequestInterceptor, createErrorInterceptor } from "./interceptor";

export function createHttpClient(config: HttpClientConfig): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? 10000,
  })

  // 요청 인터셉터: 인증 토큰 주입
  instance.interceptors.request.use(
    authRequestInterceptor(config.getToken),
    (error) => Promise.reject(error)
  );

  // 응답 인터셉터: 공통 에러 처리 + silent refresh
  instance.interceptors.response.use(
    (response) => response,
    createErrorInterceptor(config, instance)
  );

  return instance;
}
