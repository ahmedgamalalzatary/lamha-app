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
} as const;

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

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
