import { createClient } from '@/lib/supabase/client';

export type MyCouponRow = {
  userCouponId: string;
  title: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  minOrderAmount: number;
  expiresAt: string | null;
};

export async function listMyCoupons(userId: string): Promise<MyCouponRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_coupons')
    .select('id, coupons(title, discount_type, discount_value, min_order_amount, expires_at, is_active)')
    .eq('user_id', userId)
    .eq('status', 'available');

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const coupon = Array.isArray(row.coupons) ? row.coupons[0] : row.coupons;
      if (!coupon || !coupon.is_active || (coupon.expires_at && new Date(coupon.expires_at) <= new Date())) return null;
      return {
        userCouponId: row.id,
        title: coupon.title,
        discountType: coupon.discount_type as 'fixed' | 'percent',
        discountValue: coupon.discount_value,
        minOrderAmount: coupon.min_order_amount,
        expiresAt: coupon.expires_at,
      };
    })
    .filter((row): row is MyCouponRow => row !== null);
}

export async function registerCouponByCode(userId: string, code: string): Promise<void> {
  const supabase = createClient();

  const { data: coupon, error: findError } = await supabase
    .from('coupons')
    .select('id, is_active, expires_at')
    .eq('code', code.trim())
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!coupon || !coupon.is_active || (coupon.expires_at && new Date(coupon.expires_at) < new Date())) {
    throw new Error('유효하지 않은 쿠폰 코드입니다');
  }

  const { error: insertError } = await supabase.from('user_coupons').insert({ user_id: userId, coupon_id: coupon.id });
  if (insertError) {
    if (insertError.code === '23505') throw new Error('이미 등록된 쿠폰입니다');
    throw new Error(insertError.message);
  }
}

export function computeDiscount(coupon: MyCouponRow, amount: number): number {
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) return 0;
  if (coupon.discountValue < 0 || (coupon.discountType === 'percent' && coupon.discountValue > 100)) return 0;
  if (amount < coupon.minOrderAmount) return 0;
  if (coupon.discountType === 'fixed') return Math.min(coupon.discountValue, amount);
  return Math.floor((amount * coupon.discountValue) / 100);
}

