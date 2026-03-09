import axios from 'axios';
import { USE_MOCK, API_BASE_URL } from './config';
import { mockTimeDeals } from '../mocks/timedeals';
import { getAuthHeader } from './auth';

// Mock 데이터를 런타임에 수정할 수 있도록 별도 배열로 관리
let mockData = [...mockTimeDeals];
let nextId = Math.max(...mockTimeDeals.map(d => d.id)) + 1;

// 타임딜 목록 조회
export const getTimeDeals = async () => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockData];
  }

  const response = await axios.get(`${API_BASE_URL}/api/v1/time-deals`);
  return response.data.data ?? [];
};

// 타임딜 상세 조회
export const getTimeDeal = async (id) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const deal = mockData.find(d => d.id === Number(id));
    if (!deal) throw new Error('타임딜을 찾을 수 없습니다.');
    return deal;
  }

  const response = await axios.get(`${API_BASE_URL}/api/v1/time-deals/${id}`);
  return response.data.data;
};

// 타임딜 등록
export const createTimeDeal = async (payload) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newDeal = { ...payload, id: nextId++ };
    mockData.push(newDeal);
    return newDeal;
  }

  const response = await axios.post(`${API_BASE_URL}/api/v1/time-deals`, payload, { headers: getAuthHeader() });
  return response.data.data;
};

// 타임딜 수정
export const updateTimeDeal = async (id, payload) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const idx = mockData.findIndex(d => d.id === Number(id));
    if (idx === -1) throw new Error('타임딜을 찾을 수 없습니다.');
    mockData[idx] = { ...mockData[idx], ...payload };
    return mockData[idx];
  }

  const response = await axios.put(`${API_BASE_URL}/api/v1/time-deals/${id}`, payload, { headers: getAuthHeader() });
  return response.data.data;
};

// 타임딜 삭제
export const deleteTimeDeal = async (id) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const idx = mockData.findIndex(d => d.id === Number(id));
    if (idx === -1) throw new Error('타임딜을 찾을 수 없습니다.');
    mockData.splice(idx, 1);
    return { success: true };
  }

  const response = await axios.delete(`${API_BASE_URL}/api/v1/time-deals/${id}`, { headers: getAuthHeader() });
  return response.data.data;
};

export default { getTimeDeals, getTimeDeal, createTimeDeal, updateTimeDeal, deleteTimeDeal };