import axios from 'axios';
import { USE_MOCK, API_BASE_URL } from './config';
import { getAuthHeader } from './auth';
import { createMockOrder, payMockOrder } from '../mocks/orders';
import { mockTimeDeals } from '../mocks/timedeals';

// 주문 Mock 저장소 (실제 주문 API 미구현 — 세션 내 임시 보관)
const mockOrderStore = {};

// 주문 생성
// 백엔드 주문 API 미구현 → POST /api/v1/test/time-deals/{id}/purchase 로 재고만 선점
// 주문 정보는 세션 내 메모리에 임시 보관
export const createOrder = async (timedealId, quantity = 1) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const deal = mockTimeDeals.find(d => d.id === Number(timedealId));
    if (!deal) throw new Error('타임딜을 찾을 수 없습니다.');
    const order = createMockOrder(timedealId, deal.productName, deal.discountPrice);
    mockOrderStore[order.orderId] = order;
    return { orderId: order.orderId, status: order.status };
  }

  // 재고 선점 (백엔드 test 엔드포인트 - 실제 주문 도메인 구현 전 임시)
  await axios.post(
    `${API_BASE_URL}/api/v1/test/time-deals/${timedealId}/purchase`,
    {},
    { headers: getAuthHeader() }
  );
  // 주문번호는 프론트에서 임시 생성 (백엔드 주문 도메인 미구현)
  const orderId = `order-${timedealId}-${Date.now()}`;
  mockOrderStore[orderId] = { orderId, timedealId, status: 'PENDING' };
  return { orderId, status: 'PENDING' };
};

// 결제 처리 — 백엔드 결제 API 미구현, 세션 내 mock으로 처리
export const payOrder = async (orderId, paymentMethod, pgResponse) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const order = mockOrderStore[orderId];
    if (!order) throw new Error('주문을 찾을 수 없습니다.');
    const paid = payMockOrder(order);
    mockOrderStore[orderId] = paid;
    return paid;
  }

  // 백엔드 결제 API 미구현 — 세션 내 mock으로 성공 처리
  await new Promise(resolve => setTimeout(resolve, 800));
  const order = mockOrderStore[orderId];
  if (!order) throw new Error('주문을 찾을 수 없습니다.');
  const paid = payMockOrder(order);
  mockOrderStore[orderId] = paid;
  return paid;
};

// 주문 조회 — 세션 내 임시 저장소에서 조회
export const getOrder = async (orderId) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const order = mockOrderStore[orderId];
  if (!order) throw new Error('주문을 찾을 수 없습니다.');
  return order;
};

export default { createOrder, payOrder, getOrder };
