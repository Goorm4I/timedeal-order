import axios from 'axios';
import { USE_MOCK, API_BASE_URL } from './config';
import { getAuthHeader } from './auth';
import { createMockOrder, payMockOrder } from '../mocks/orders';
import { mockTimeDeals } from '../mocks/timedeals';

// 주문 Mock 저장소
const mockOrderStore = {};

// ── 주문서(CheckoutSession) 생성 ─────────────────────────────────
// POST /api/v1/orders → checkoutId 발급 (멱등성 키)
export const createOrderSheet = async (skuId, quantity = 1) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const deal = mockTimeDeals.find(d => d.id === Number(skuId));
    if (!deal) throw new Error('타임딜을 찾을 수 없습니다.');
    const checkoutId = `checkout-${skuId}-${Date.now()}`;
    return { checkoutId, totalAmount: deal.discountPrice };
  }

  const res = await axios.post(
    `${API_BASE_URL}/api/v1/orders`,
    { orderItems: [{ skuId, quantity }] },
    { headers: getAuthHeader() }
  );
  return res.data.data; // { checkoutId, products, totalAmount, shippingAddress }
};

// ── 주문 확정 ─────────────────────────────────────────────────────
// POST /api/v1/orders/submit
// 멱등성: checkoutId가 DB UNIQUE 제약으로 중복 차단됨
export const submitOrder = async (checkoutId, shippingAddressId, paymentMethod) => {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return { orderId: checkoutId };
  }

  const res = await axios.post(
    `${API_BASE_URL}/api/v1/orders/submit`,
    { checkoutId: Number(checkoutId), shippingAddressId, paymentMethod },
    { headers: getAuthHeader() }
  );
  return res.data.data; // { checkoutId }
};

// ── 레거시 (mock 전용) ────────────────────────────────────────────
export const createOrder = async (timedealId, quantity = 1) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const deal = mockTimeDeals.find(d => d.id === Number(timedealId));
  if (!deal) throw new Error('타임딜을 찾을 수 없습니다.');
  const order = createMockOrder(timedealId, deal.productName, deal.discountPrice);
  mockOrderStore[order.orderId] = order;
  return { orderId: order.orderId, status: order.status };
};

export const payOrder = async (orderId, paymentMethod, pgResponse) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const order = mockOrderStore[orderId];
  if (!order) throw new Error('주문을 찾을 수 없습니다.');
  const paid = payMockOrder(order);
  mockOrderStore[orderId] = paid;
  return paid;
};

export const getOrder = async (orderId) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const order = mockOrderStore[orderId];
  if (!order) throw new Error('주문을 찾을 수 없습니다.');
  return order;
};

export default { createOrderSheet, submitOrder, createOrder, payOrder, getOrder };
