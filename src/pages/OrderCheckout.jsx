import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTimeDeal } from '../api/timedeal';
import { createOrderSheet, submitOrder } from '../api/order';
import { getCurrentUser, getAddress, fetchAddresses } from '../api/auth';
import PGSimulator from '../components/PGSimulator';

const OrderCheckout = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showPGSimulator, setShowPGSimulator] = useState(false);
  const [checkoutId, setCheckoutId] = useState(null);
  const [address, setAddress] = useState(getAddress());
  const [error, setError] = useState(null);
  const [stockError, setStockError] = useState(null);
  const submittingRef = useRef(false); // 멱등성: submit 중복 방지

  const user = getCurrentUser();

  // ── 포인트/쿠폰 (추후 백엔드 연동) ──────────────────────────
  // TODO: 실제 보유 포인트는 GET /api/users/me/points 로 조회
  // TODO: 쿠폰은 GET /api/coupons?userId= 로 조회
  const BBOSHI_POINT_RATE = 0.01;          // 뽀시페이 적립률 1% (백엔드 정책 따라 변경)
  const earnedPoints = deal
    ? Math.floor(deal.discountPrice * BBOSHI_POINT_RATE)
    : 0;
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchDeal();
    // 백엔드에서 addressId 포함한 최신 주소 로드 (submit 시 필요)
    fetchAddresses().then(addr => { if (addr) setAddress(addr); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDeal = async () => {
    try {
      const data = await getTimeDeal(id);
      if (data.status !== 'ACTIVE' || data.stock <= 0) {
        navigate(`/deal/${id}`);
        return;
      }
      setDeal(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 결제하기 클릭 → CheckoutSession 생성(checkoutId 발급) → PG 진입
  const handlePay = async () => {
    if (!paymentMethod) return;
    setStockError(null);
    try {
      setProcessing(true);
      const sheet = await createOrderSheet(Number(id));
      setCheckoutId(sheet.checkoutId);
      setProcessing(false);
      setShowPGSimulator(true);
    } catch (err) {
      setProcessing(false);
      if (err.response?.status === 409) {
        setStockError('앗! 방금 품절되었어요 😢');
      } else {
        setStockError(err.message || '주문 처리 중 오류가 발생했어요');
      }
    }
  };

  // PG 완료 → 주문 확정 (checkoutId 멱등성 키)
  const handlePGComplete = async (pgResponse) => {
    // 멱등성: 이미 submit 중이면 중복 호출 차단
    if (submittingRef.current) return;
    submittingRef.current = true;

    setShowPGSimulator(false);
    setProcessing(true);
    try {
      const result = await submitOrder(checkoutId, address?.id ?? null, paymentMethod, pgResponse?.imp_uid);
      const orderId = result.checkoutId ?? checkoutId;
      const orderForResult = {
        ...result,
        productName: deal.productName,
        quantity: 1,
        totalPrice: deal.discountPrice,
      };
      navigate(`/order/${orderId}`, {
        state: { order: orderForResult, paymentMethod, pgResponse },
      });
    } catch (err) {
      submittingRef.current = false;
      setError(err.response?.status === 409
        ? '이미 처리된 주문입니다.'
        : err.message || '주문 확정 중 오류가 발생했어요'
      );
      setProcessing(false);
    }
  };

  // PG 취소 → 주문서로 복귀 (PENDING 주문은 백엔드 타임아웃으로 정리)
  const handlePGCancel = () => {
    setShowPGSimulator(false);
  };

  if (loading) return <LoadingScreen />;
  if (processing) return <ProcessingScreen deal={deal} />;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf6f0]">
      <div className="text-center px-8">
        <p className="text-brand-800 font-medium mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-brand-500 text-white rounded-xl font-medium">
          돌아가기
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#faf6f0] flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-brand-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-100 transition"
          >
            <svg className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-bold text-brand-800 text-lg">주문서</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 space-y-3 pb-32">

        {/* 주문 상품 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-3">주문 상품</p>
          <div className="flex gap-3">
            <img
              src={deal.productImage}
              alt={deal.productName}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-brand-800 line-clamp-2 text-sm leading-snug">{deal.productName}</p>
              <p className="text-xs text-brand-400 mt-1">수량 1개</p>
              <p className="text-lg font-bold text-brand-800 mt-1">{deal.discountPrice.toLocaleString()}원</p>
            </div>
          </div>
        </section>

        {/* 배송지 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide">배송지</p>
            <button
              onClick={() => navigate('/address')}
              className="text-xs text-brand-500 border border-brand-300 px-2.5 py-1 rounded-lg hover:bg-brand-50 transition"
            >
              변경
            </button>
          </div>
          {address ? (
            <div className="space-y-2">
              <div className="flex gap-3">
                <span className="text-xs text-brand-400 w-12 flex-shrink-0 pt-0.5">이름</span>
                <span className="text-sm text-brand-800">{address.name || user?.name || user?.email}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-xs text-brand-400 w-12 flex-shrink-0 pt-0.5">연락처</span>
                <span className="text-sm text-brand-800">{address.phone || '-'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-xs text-brand-400 w-12 flex-shrink-0 pt-0.5">주소</span>
                <span className="text-sm text-brand-800">
                  ({address.zipcode}) {address.address}
                  {address.addressDetail && <><br />{address.addressDetail}</>}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm text-amber-700">배송지를 먼저 등록해주세요</p>
              <button
                onClick={() => navigate('/address')}
                className="text-xs font-semibold text-amber-700 border border-amber-400 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition"
              >
                등록하기
              </button>
            </div>
          )}
        </section>

        {/* 결제 수단 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-3">결제 수단</p>
          <div className="space-y-2">
            {PAYMENT_METHODS.map(method => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                  paymentMethod === method.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-brand-100 hover:border-brand-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${method.iconBg || ''}`}>
                  {method.icon}
                </div>
                <span className="flex-1 text-left font-medium text-brand-800 text-sm">{method.name}</span>
                {/* 뽀시페이 선택 시 적립 뱃지 */}
                {method.id === 'bboshi' && paymentMethod === 'bboshi' && (
                  <span className="text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    +{earnedPoints.toLocaleString()}P 적립
                  </span>
                )}
                {method.id !== 'bboshi' && paymentMethod === method.id && (
                  <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 할인/혜택 — 추후 쿠폰·포인트 연동 시 이 섹션 활성화 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-3">할인/혜택</p>
          <div className="space-y-3">
            {/* 쿠폰 TODO: 쿠폰 API 연동 후 활성화 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-700">쿠폰</span>
              <span className="text-xs text-brand-300 border border-dashed border-brand-200 px-3 py-1.5 rounded-lg cursor-not-allowed">
                준비 중
              </span>
            </div>
            {/* 포인트 TODO: 포인트 API 연동 후 활성화 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-700">포인트</span>
              <span className="text-xs text-brand-300 border border-dashed border-brand-200 px-3 py-1.5 rounded-lg cursor-not-allowed">
                준비 중
              </span>
            </div>
          </div>
        </section>

        {/* 결제 금액 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-3">결제 금액</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-500">상품 금액</span>
              <span className="text-brand-800">{deal.discountPrice.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-500">배송비</span>
              <span className="text-green-600 font-medium">무료</span>
            </div>
            {/* 쿠폰 할인 TODO: 활성화 시 표시 */}
            {/* <div className="flex justify-between">
              <span className="text-brand-500">쿠폰 할인</span>
              <span className="text-red-500">-0원</span>
            </div> */}
            {/* 포인트 사용 TODO: 활성화 시 표시 */}
            {/* <div className="flex justify-between">
              <span className="text-brand-500">포인트 사용</span>
              <span className="text-red-500">-0P</span>
            </div> */}
          </div>
          <div className="border-t border-brand-100 mt-3 pt-3 flex justify-between items-center">
            <span className="font-bold text-brand-800">총 결제금액</span>
            <span className="text-2xl font-bold text-brand-800">{deal.discountPrice.toLocaleString()}원</span>
          </div>
          {/* 뽀시페이 적립 예정 포인트 */}
          {paymentMethod === 'bboshi' && (
            <div className="mt-2 pt-2 border-t border-dashed border-orange-200 flex justify-between items-center">
              <span className="text-xs text-orange-500">뽀시페이 적립 예정</span>
              <span className="text-sm font-bold text-orange-500">+{earnedPoints.toLocaleString()}P</span>
            </div>
          )}
        </section>

        {/* 품절 오류 */}
        {stockError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-red-600 text-sm font-medium">{stockError}</p>
          </div>
        )}
      </main>

      {/* 하단 결제 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-100 px-4 py-4 z-10">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handlePay}
            disabled={!paymentMethod || !address}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition ${
              paymentMethod && address
                ? 'bg-brand-500 text-white hover:bg-brand-400 active:scale-[0.98]'
                : 'bg-brand-200 text-brand-400 cursor-not-allowed'
            }`}
          >
            {!address
              ? '배송지를 먼저 등록해주세요'
              : !paymentMethod
              ? '결제 수단을 선택해주세요'
              : `${deal.discountPrice.toLocaleString()}원 결제하기`}
          </button>
        </div>
      </div>

      {showPGSimulator && (
        <PGSimulator
          deal={deal}
          paymentMethod={paymentMethod}
          checkoutId={checkoutId}
          onComplete={handlePGComplete}
          onCancel={handlePGCancel}
        />
      )}
    </div>
  );
};

/* ─── 결제 수단 목록 ─── */
const PAYMENT_METHODS = [
  {
    id: 'bboshi',
    name: '뽀시페이',
    icon: <img src="/icon.png" alt="뽀시페이" className="w-8 h-8 rounded-full object-cover" />,
  },
  {
    id: 'kakao',
    name: '카카오페이',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#3A1D1D">
        <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.733 1.617 5.13 4.062 6.54L5.1 20.7a.3.3 0 0 0 .44.327l4.174-2.78A11.6 11.6 0 0 0 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
      </svg>
    ),
    iconBg: 'bg-[#FEE500]',
  },
  {
    id: 'toss',
    name: '토스페이',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="white">
        <path d="M12.5 4a1.5 1.5 0 0 0-1.5 1.5v5.586L8.207 8.293a1 1 0 0 0-1.414 1.414l4.5 4.5a1 1 0 0 0 1.414 0l4.5-4.5a1 1 0 0 0-1.414-1.414L13 10.586V5.5A1.5 1.5 0 0 0 12.5 4zM6 17a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2H6z"/>
      </svg>
    ),
    iconBg: 'bg-[#0064FF]',
  },
  {
    id: 'card',
    name: '신용카드',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="1.5"/>
        <rect x="2" y="9" width="20" height="3" fill="white"/>
        <rect x="4" y="15" width="4" height="1.5" rx="0.75" fill="white"/>
      </svg>
    ),
    iconBg: 'bg-gradient-to-br from-gray-600 to-gray-800',
  },
];

/* ─── 결제 처리 중 화면 ─── */
const ProcessingScreen = ({ deal }) => (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
    <div className="w-full max-w-sm text-center">
      <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">💳</span>
      </div>
      <p className="text-brand-800 font-bold text-lg mb-1">주문을 처리하고 있어요</p>
      <p className="text-brand-500 text-sm mb-8">잠시만 기다려주세요...</p>
      {deal && (
        <div className="bg-brand-50 rounded-2xl p-4 text-left">
          <div className="flex gap-3 items-center">
            <img src={deal.productImage} alt={deal.productName} className="w-14 h-14 object-cover rounded-xl" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-800 line-clamp-1">{deal.productName}</p>
              <p className="text-brand-500 font-bold">{deal.discountPrice.toLocaleString()}원</p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    </div>
  </div>
);

/* ─── 로딩 화면 ─── */
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#faf6f0]">
    <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
  </div>
);

export default OrderCheckout;
