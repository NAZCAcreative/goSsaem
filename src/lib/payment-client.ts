type PaymentOrder = {
  orderId: string;
  amount: number;
  currency: "KRW";
  enrollmentId: string;
  orderName: string;
};
type PaymentSdk = {
  payment(input: { customerKey: string }): {
    requestPayment(input: unknown): Promise<void>;
  };
};
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => PaymentSdk;
  }
}
let sdkPromise: Promise<void> | null = null;
async function loadSdk() {
  if (window.TossPayments) return;
  if (!sdkPromise)
    sdkPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.tosspayments.com/v2/standard";
      script.async = true;
      const timer = setTimeout(() => {
        script.remove();
        sdkPromise = null;
        reject(new Error("결제창을 불러오지 못했습니다. 다시 시도해주세요."));
      }, 15000);
      script.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        sdkPromise = null;
        reject(new Error("결제창을 불러오지 못했습니다."));
      };
      document.head.appendChild(script);
    });
  await sdkPromise;
}
export async function startPaidCheckout(
  enrollmentId: string,
  userId: string,
  couponId?: string,
) {
  const configResponse = await fetch("/api/payments/config", {
    cache: "no-store",
  });
  const config = await configResponse.json();
  if (!config.enabled || !config.clientKey)
    throw new Error("유료 결제는 아직 개시 전입니다.");
  const response = await fetch("/api/payments/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enrollmentId, couponId: couponId || null }),
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "결제를 준비하지 못했습니다.");
  const order = body as PaymentOrder;
  await loadSdk();
  if (!window.TossPayments) throw new Error("결제창 연결에 실패했습니다.");
  return window
    .TossPayments(config.clientKey)
    .payment({ customerKey: userId })
    .requestPayment({
      method: "CARD",
      amount: { currency: order.currency, value: order.amount },
      orderId: order.orderId,
      orderName: order.orderName.slice(0, 100),
      successUrl: `${window.location.origin}/student/payment/result`,
      failUrl: `${window.location.origin}/student/payment/result?failed=1`,
      card: { useEscrow: false, flowMode: "DEFAULT" },
    });
}
