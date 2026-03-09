// src/api/auth.js

import axios from 'axios';
import { USE_MOCK, API_BASE_URL } from './config';

// 목업 유저 데이터
const MOCK_USERS = [
  { id: 'admin', email: 'admin@test.com', password: '123456', name: '관리자' },
  { id: 'test', email: 'test@test.com', password: '1234', name: '테스트유저' },
];

// 로그인
export const login = async ({ email, password, remember }) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('이메일 또는 비밀번호가 올바르지 않아요.');
    const userData = { id: user.id, name: user.name, email: user.email };
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(userData));
    return userData;
  }

  const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, { email, password });
  const { accessToken, refreshToken } = response.data.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  // JWT subject에서 userId 추출 (백엔드가 sub: userId로 발급)
  const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  const userData = { id: payload.sub, email };
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('user', JSON.stringify(userData));
  return userData;
};

// 회원가입
export const register = async ({ email, password, name, phone }) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const exists = MOCK_USERS.find(u => u.email === email);
    if (exists) throw new Error('이미 사용 중인 이메일이에요.');
    MOCK_USERS.push({ id: email, email, password, name, phone });
    const userData = { id: email, email, name };
    sessionStorage.setItem('user', JSON.stringify(userData));
    return userData;
  }

  const response = await axios.post(`${API_BASE_URL}/api/v1/users`, { email, password, name, phoneNumber: phone });
  const userData = { email, name };
  sessionStorage.setItem('user', JSON.stringify(userData));
  return response.data.data;
};

// 배송지 저장 (localStorage에 유저별로 저장)
export const saveAddress = ({ name, phone, zipcode, address, addressDetail }) => {
  const user = getCurrentUser();
  if (!user) return;
  const addressData = { name, phone, zipcode, address, addressDetail };
  localStorage.setItem(`address_${user.id}`, JSON.stringify(addressData));
  // 현재 유저 세션에도 반영
  const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
  const updated = { ...user, zipcode, address, addressDetail };
  storage.setItem('user', JSON.stringify(updated));
  return addressData;
};

// 배송지 조회
export const getAddress = () => {
  const user = getCurrentUser();
  if (!user) return null;
  const data = localStorage.getItem(`address_${user.id}`);
  return data ? JSON.parse(data) : null;
};

// 로그아웃
export const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!USE_MOCK && refreshToken) {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/auth/logout`, { refreshToken },
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
      );
    } catch (_) {}
  }
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
};

// API 요청용 Authorization 헤더
export const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 현재 로그인된 유저 가져오기
export const getCurrentUser = () => {
  const data = localStorage.getItem('user') || sessionStorage.getItem('user');
  return data ? JSON.parse(data) : null;
};

export default { login, register, logout, getCurrentUser, saveAddress, getAddress };
