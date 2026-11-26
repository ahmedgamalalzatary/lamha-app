// Tawsilty's design tokens (contract §6), measured from the real app. Same values as the demo's tw-* colours.

export const colors = {
  primary: '#F68B1D',
  primary700: '#DB760F',
  primary400: '#F8A24A',
  primary100: '#FDE6D0',
  primary50: '#FEF3E8',
  headerFrom: '#F8A24A',
  headerTo: '#F38920',
  bg: '#FFFFFF',
  bgWarm: '#F8F5EF',
  surface: '#F9FAFB',
  input: '#F2F3F7',
  ink: '#1F1F1F',
  ink2: '#8A8A8A',
  line: '#ECECEC',
  success: '#46B66F',
  success50: '#E8F6ED',
  danger: '#F44336',
  /** The store page's info row values: "30 دقيقة", "توصيلتي". */
  info: '#1E5BD8',
  /** "مطلوب" tag and the selected sub-category ring. */
  black: '#141414',
  backdrop: 'rgba(0,0,0,0.45)',
  /** Over a closed store's picture where the greyscale filter is missing (iOS), and behind "مغلق". */
  closedShade: 'rgba(40,40,40,0.55)',
  /** The dark pills over a store cover: "يفتح الساعة 11:00 ص". */
  pillDark: 'rgba(0,0,0,0.75)',
  toastDark: '#2B2B2B',
  /** The pale grey page behind white cards (wallet, points' lists, invite, notifications, profile). */
  page: '#F5F6FA',
  /** See-through white on orange cards and the home header: icon tiles, tracks, ghost buttons. */
  glass: 'rgba(255,255,255,0.22)',
  /** Pale red tiles: deductions, sign-out, a blocked delivery man, a disabled account. */
  danger50: '#FDEDED',
  /** Rating stars in store lists and headers. */
  star: '#F5A623',
  /** The wallet icon's blue (محفظتي) and its pale tile (تواصل معنا). */
  blue: '#2F6FED',
  blue50: '#E6EEFC',
  /** الإشعارات' empty state. */
  violet: '#4F46B8',
  violet50: '#EEEDFB',
  /** Round grey icon buttons: back, the bell. */
  iconCircle: '#F2F2F4',
  /** Input and locked-field borders. */
  fieldBorder: '#E9EAEE',
  /** Dark chips and the map tip. */
  navy: '#1D2333',
  /** Underlined fields and the OTP boxes' focus ring. */
  lineStrong: '#9E9E9E',
  /** The lime "خصم 30 ج.م على منتجات" badge and the "وفر 5.0 ج.م" tag (§8.4, §8.10). */
  lime: '#DDF94C',
  /** The voucher badge and the قسائمي copy button: cream with a gold edge and gold text. */
  voucher50: '#FFF7E6',
  voucherLine: '#F2D79B',
  gold: '#A97A08',
  /** The "قسيمة" pill. */
  voucherPill: '#6B3FD8',
  /** Every drop shadow; see `shadows` for the shared presets. */
  shadow: '#000',
  /** Grey labels and icons on the profile page's sections and the unselected gender. */
  ink3: '#5B5F6B',
  /** The value inside a locked field. */
  lockedText: '#55575E',
  /** A locked field's grey fill. */
  locked: '#EEEFF3',
  /** The default avatar's light-blue circle. */
  avatar: '#97BBE2',
  /** The square back button's edge and the phone field's boxes. */
  boxBorder: '#E3E4E8',
  /** The OTP boxes' resting border. */
  otpBorder: '#BDBDBD',
  /** The round "clear" button inside a text field. */
  clearButton: '#B5B7BD',
  /** The phone-change sheet's input fill. */
  sheetInput: '#F4F6FA',
  /** The sign-in pages' logo tile edge. */
  logoBorder: '#ECECEE',
  /** The invite-code box on sign-up. */
  inviteTint: '#FFF9F3',
  /** The welcome page's "continue with phone" button. */
  softButton: '#F6F6FA',
  softButtonBorder: '#DCDDE3',
  /** The cart's "you may also like" strip. */
  upsell: '#F6F3ED',
  /** The map picker's pin. */
  pin: '#CC5A00',
  /** The dark wash over a store's cover. */
  coverShade: 'rgba(0,0,0,0.25)',
  /** An unselected rating star. */
  starEmpty: '#D6D6D6',
  /** The skeleton's moving highlight. */
  shimmer: 'rgba(255,255,255,0.6)',
  /** White at zero opacity: the start of a fade to white (plain 'transparent' fades through grey). */
  bgClear: 'rgba(255,255,255,0)',
} as const;

/** The welcome page's pastel card tints, in order. */
export const welcomeTints = ['#FFF1E0', '#F1E8F8', '#E6F6EC', '#E3F3FB', '#FDECEC', '#FFF7E0'] as const;

/** Alexandria weights, loaded in the root layout. */
export const fonts = {
  regular: 'Alexandria_400Regular',
  medium: 'Alexandria_500Medium',
  semibold: 'Alexandria_600SemiBold',
  bold: 'Alexandria_700Bold',
} as const;

/** Sizes seen in the app (contract §6.2). */
export const fontSizes = {
  screenTitle: 24,
  sectionTitle: 19,
  listTitle: 16,
  body: 14,
  caption: 12,
} as const;

/** `xl`: the big orange cards (wallet, points, invite) and the outline dialog. */
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Square boxes for icons: header slots, round buttons, icon tiles. A circle's radius is `size / 2`. */
export const sizes = { icon: 40, iconLg: 44, touch: 48 } as const;

/** The two shadows that repeat across screens. Others are one-offs that use `colors.shadow`. */
export const shadows = {
  /** Lifted white cards: driver and partner order cards. */
  card: { shadowColor: colors.shadow, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  /** The wide soft glow under the welcome sheet and the empty store card. */
  soft: { shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 24, elevation: 3 },
} as const;
