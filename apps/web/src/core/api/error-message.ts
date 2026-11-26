import { ApiRequestError, type ErrorCode } from './create-api';

/** The dashboard is Arabic only (contract §3); the sign-in words match the mobile app's. */
const MESSAGES: Partial<Record<ErrorCode, string>> = {
  BAD_CREDENTIALS: 'رقم الهاتف أو كلمة المرور غير صحيحة',
  ACCOUNT_DISABLED: 'هذا الحساب موقوف، تواصل مع الإدارة',
  SESSION_EXPIRED: 'انتهت الجلسة، سجّل الدخول مرة أخرى',
  DASHBOARD_ROLE: 'لوحة التحكم للإدارة والمطاعم فقط، استخدم التطبيق',
  PHONE_TAKEN: 'رقم الهاتف مسجل بالفعل',
  OWN_ACCOUNT: 'لا يمكنك تغيير حسابك من هنا، اطلب ذلك من مسؤول آخر',
  LAST_ADMIN: 'يجب أن يبقى مسؤول واحد مفعّل على الأقل',
  ACCOUNT_NOT_FOUND: 'الحساب غير موجود',
  NOT_FOUND: 'العنصر غير موجود، ربما حُذف',
  CATEGORY_NOT_EMPTY: 'احذف منتجات القسم وأقسامه الفرعية أو انقلها أولاً',
  CATEGORY_OTHER_STORE: 'هذا القسم تابع لمتجر آخر',
  CATEGORY_DEPTH: 'القسم الفرعي لا يحتوي على أقسام فرعية',
  OPTION_GROUP: 'أقصى عدد اختيارات أكبر من عدد اختيارات المجموعة',
  NO_STORE: 'هذا الحساب غير مربوط بمتجر، تواصل مع الإدارة',
  IMAGE_INVALID: 'تعذر قراءة الصورة، اختر صورة JPEG أو PNG',
  TILE_TARGET: 'اختر قسماً أو متجراً واحداً يفتحه المربع',
  ZONE_SHAPE: 'حدود المنطقة غير صالحة: لا تكرر نقطة ولا تجعل الخطوط تتقاطع',
  CONFLICT: 'حدث تغيير في نفس اللحظة، حاول مرة أخرى',
  EMAIL_TAKEN: 'البريد الإلكتروني مستخدم في حساب آخر',
  ORDER_STATUS: 'تغيرت حالة الطلب، راجعه مرة أخرى',
  SHIFT_NOT_OPEN: 'لا توجد نوبة عمل يمكن بدؤها الآن',
  WALLET_BALANCE: 'الرصيد أقل من مبلغ الخصم',
};

export const GENERIC_ERROR = 'حدث خطأ، حاول مرة أخرى';

/** The sentence to show for a failed call (the API sends a code, contract §7). */
export function errorMessage(e: unknown): string {
  if (!(e instanceof ApiRequestError)) return GENERIC_ERROR;
  if (e.status === 0) return 'تعذر الاتصال بالخادم';
  if (e.status === 429) return 'محاولات كثيرة، انتظر دقيقة ثم حاول مرة أخرى';
  return (e.code && MESSAGES[e.code]) || GENERIC_ERROR;
}
