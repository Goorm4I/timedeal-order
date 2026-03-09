import axios from 'axios';
import { USE_MOCK, API_BASE_URL } from './config';
import { getCurrentUser } from './auth';
import { createMockOrder, payMockOrder } from '../mocks/orders';
import { mockTimeDeals } from '../mocks/timedeals';

// 주문 Mock 저장소
const mockOrderStore = {};

// 주문 생성 — POST /api/orders
// 백엔드: { productId, userId, amount } → { orderId, status: "PENDING" }
// 이 시점에 Redis DECR (재고 선점)
export const createOrder = async (timedealId, quantity = 1) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const deal = mockTimeDeals.find(d => d.id === Number(timedealId));
    if (!deal) throw new Error('타임딜을 찾을 수 없습니다.');

    const order = createMockOrder(timedealId, deal.productName, deal.discountPrice);
    mockOrderStore[order.orderId] = order;

    return { orderId: order.orderId, status: order.status };
  }

  const user = getCurrentUser();
  const response = await axios.post(`${API_BASE_URL}/api/orders`, {
    productId: timedealId,  // 백엔드 필드명
    userId: user?.id,
    amount: quantity,
  });
  return response.data.data;
};

// 결제 처리 — POST /api/orders/{orderId}/pay
// 백엔드가 PG 서버 직접 호출 후 PAID or FAILED 반환
export const payOrder = async (orderId, paymentMethod, pgResponse) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 800));

    const order = mockOrderStore[orderId];
    if (!order) throw new Error('주문을 찾을 수 없습니다.');

    const paid = payMockOrder(order);
    mockOrderStore[orderId] = paid;
    return paid;
  }

  const response = await axios.post(`${API_BASE_URL}/api/orders/${orderId}/pay`, {
    paymentMethod,
    pgResponse,  // PG 결과 전달 (PortOne 콜백 등)
  });
  return response.data.data;
};

// 주문 조회 — GET /api/orders/{orderId}
export const getOrder = async (orderId) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 200));

    const order = mockOrderStore[orderId];
    if (!order) throw new Error('주문을 찾을 수 없습니다.');

    return order;
  }

  const response = await axios.get(`${API_BASE_URL}/api/orders/${orderId}`);
  return response.data.data;
};

export default { createOrder, payOrder, getOrder };
