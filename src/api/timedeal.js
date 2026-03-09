import axios from 'axios';
import { USE_MOCK, API_BASE_URL } from './config';
import { mockTimeDeals } from '../mocks/timedeals';
import { getAuthHeader } from './auth';

// Mock 데이터를 런타임에 수정할 수 있도록 별도 배열로 관리
let mockData = [...mockTimeDeals];
let nextId = Math.max(...mockTimeDeals.map(d => d.id)) + 1;

// 백엔드 응답 → 프론트 형식 변환
const mapDeal = (deal) => ({
  id: deal.id,
  productName: deal.product?.name ?? '상품명 없음',
  productImage: deal.product?.thumbnailUrl ?? `https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop&q=80`,
  originalPrice: deal.product?.originPrice ?? 0,
  discountPrice: deal.product?.salePrice ?? deal.product?.originPrice ?? 0,
  discountRate: deal.product?.originPrice > 0
    ? Math.round((1 - (deal.product?.salePrice ?? deal.product?.originPrice) / deal.product?.originPrice) * 100)
    : 0,
  stock: deal.remainingQuantity ?? deal.totalQuantity ?? 0,
  totalStock: deal.dealQuantity ?? deal.totalQuantity ?? 0,
  // 백엔드 상태 → 프론트 상태 정규화
  // PENDING → UPCOMING, EXPIRED → ENDED
  status: deal.status === 'PENDING' ? 'UPCOMING'
        : deal.status === 'EXPIRED' ? 'ENDED'
        : deal.status,
  startTime: deal.startTime,
  endTime: deal.endTime,
  brandName: deal.product?.brandName ?? '',
  description: deal.product?.description ?? '',
});

// 타임딜 목록 조회
export const getTimeDeals = async () => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockData];
  }

  const response = await axios.get(`${API_BASE_URL}/api/v1/time-deals`);
  return (response.data.data ?? []).map(mapDeal);
};

// 타임딜 상세 조회 (백엔드 단건 API 없음 → 목록에서 필터링)
export const getTimeDeal = async (id) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const deal = mockData.find(d => d.id === Number(id));
    if (!deal) throw new Error('타임딜을 찾을 수 없습니다.');
    return deal;
  }

  const response = await axios.get(`${API_BASE_URL}/api/v1/time-deals`);
  const deals = response.data.data ?? [];
  const deal = deals.find(d => d.id === id || String(d.id) === String(id));
  if (!deal) throw new Error('타임딜을 찾을 수 없습니다.');
  return mapDeal(deal);
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