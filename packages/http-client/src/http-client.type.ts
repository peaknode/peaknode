// ============================================================
// HttpClient 설정 타입
// ============================================================

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;        // ms, 기본 10000
  getToken?: () => string | undefined;
  onRefreshToken?: () => Promise<string>;  // 새 accessToken 반환
  onAuthError?: () => void;               // refresh 실패 시 호출
}

// 공통 API 에러 구조
export interface ApiError {
  status: number;
  code?: string;
  message: string;
  detail?: unknown;
}

// HttpClient가 throw하는 에러
export class HttpClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}
