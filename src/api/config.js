// API 설정
export const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws/events';

export default { USE_MOCK, API_BASE_URL, WS_URL };
