import type { AxiosError, AxiosInstance } from "axios";
import { HttpClientConfig, HttpClientError } from "../http-client.type";

// axios config에 _retry 플래그 타입 확장
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

/**
 * 응답 인터셉터: 공통 에러 처리 + silent refresh
 *
 * 401 + onRefreshToken 콜백이 있으면:
 *   → refresh 시도 → 성공 시 원래 요청 재시도
 *   → 실패 시 onAuthError 호출 후 HttpClientError throw
 */
export function createErrorInterceptor(config: HttpClientConfig, instance: AxiosInstance) {
  return async (error: AxiosError): Promise<never> => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as Record<string, unknown> | undefined;


    // 네트워크 에러 / 타임아웃
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        throw new HttpClientError(0, "TIMEOUT", "요청 시간이 초과되었습니다.");
      }
      throw new HttpClientError(0, "NETWORK_ERROR", "네트워크 연결을 확인해주세요.");
    }

    // 401 + refresh 콜백이 있으면 silent refresh 시도
    if (status === 401 && config.onRefreshToken && !error.config?._retry) {
      error.config!._retry = true;
      try {
        const newToken = await config.onRefreshToken();
        error.config!.headers!["Authorization"] = `Bearer ${newToken}`;
        return instance(error.config!) as never;
      } catch {
        config.onAuthError?.();
        throw new HttpClientError(401, "UNAUTHORIZED", "인증이 필요합니다.", data);
      }
    }

    // 서버 에러 응답
    const code = String(data?.code ?? status);
    const message = String(data?.message ?? error.message);

    switch (status) {
      case 401:
        throw new HttpClientError(401, "UNAUTHORIZED", "인증이 필요합니다.", data);
      case 403:
        throw new HttpClientError(403, "FORBIDDEN", "접근 권한이 없습니다.", data);
      case 404:
        throw new HttpClientError(404, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.", data);
      case 408:
        throw new HttpClientError(408, "REQUEST_TIMEOUT", "요청 시간이 초과되었습니다.", data);
      case 500:
        throw new HttpClientError(500, "SERVER_ERROR", "서버 오류가 발생했습니다.", data);
      default:
        throw new HttpClientError(status, code, message, data);
    }
  };
}
