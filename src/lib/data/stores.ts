import type { MenuCategory, OptionGroup, Store } from "../types";

/* All stores, menus, ratings and prices below are synthetic demo data. */

const img = (n: string) => `/img/${n}.jpg`;

const size = (id: string, opts: [string, number][]): OptionGroup => ({
  id: `${id}-size`, name: "الحجم", required: true, min: 1, max: 1,
  choices: opts.map(([name, price], i) => ({ id: `${id}-s${i}`, name, price })),
});
const extras = (id: string, opts: [string, number][], max = 3): OptionGroup => ({
  id: `${id}-ex`, name: "إضافات", required: false, min: 0, max,
  choices: opts.map(([name, price], i) => ({ id: `${id}-e${i}`, name, price })),
});
const pick = (id: string, name: string, opts: [string, number][]): OptionGroup => ({
  id: `${id}-${name}`, name, required: true, min: 1, max: 1,
  choices: opts.map(([n, price], i) => ({ id: `${id}-p${i}-${n}`, name: n, price })),
});
const drink = (id: string): OptionGroup => ({
  id: `${id}-drink`, name: "مشروب مع الوجبة", required: false, min: 0, max: 1,
  choices: [
    { id: `${id}-d0`, name: "كوكا كولا", price: 25 },
    { id: `${id}-d1`, name: "عصير برتقال فريش", price: 40 },
    { id: `${id}-d2`, name: "مياه معدنية", price: 10 },
  ],
});

export const AREAS: Record<string, [number, number]> = {
  "الحادقة": [29.315, 30.838],
  "المسلة": [29.304, 30.847],
  "كيمان فارس": [29.321, 30.845],
  "دار الرماد": [29.298, 30.835],
  "الصوفي": [29.31, 30.855],
  "حي الجامعة": [29.3175, 30.878],
  "الشيخ حسن": [29.302, 30.825],
  "قحافة": [29.29, 30.86],
};

const koshariMenu: MenuCategory[] = [
  {
    id: "k-main", name: "الكشري", items: [
      { id: "k1", name: "كشري", desc: "رز وعدس ومكرونة وحمص، صلصة دقة وتقلية مقرمشة", price: 35, img: img("koshari1"), popular: true, options: [size("k1", [["صغير", 0], ["وسط", 15], ["كبير", 35], ["عائلي", 85]]), extras("k1", [["تقلية زيادة", 5], ["حمص زيادة", 5], ["صلصة حارة", 0], ["دقة", 0]], 4)] },
      { id: "k2", name: "كشري باللحمة", desc: "كشري كبير ومعاه لحمة مفرومة متسبكة", price: 95, img: img("koshari1"), options: [extras("k2", [["تقلية زيادة", 5], ["صلصة حارة", 0]])] },
      { id: "k3", name: "طاجن مكرونة باللحمة", desc: "مكرونة في الفرن بالصلصة واللحمة المفرومة", price: 85, img: img("pasta1") },
      { id: "k4", name: "مكرونة بالبشاميل", desc: "طبقة بشاميل ذهبية فوق مكرونة ولحمة", price: 90, img: img("pasta2") },
    ],
  },
  {
    id: "k-sweet", name: "حلويات", items: [
      { id: "k5", name: "أرز باللبن", desc: "بالمكسرات وجوز الهند", price: 35, img: img("parfait1"), popular: true },
      { id: "k6", name: "مهلبية", desc: "باردة وبماء الورد", price: 30, img: img("parfait1") },
    ],
  },
  {
    id: "k-drinks", name: "مشروبات", items: [
      { id: "k7", name: "كوكا كولا", price: 25, img: img("water1") },
      { id: "k8", name: "مياه معدنية", price: 10, img: img("water1") },
    ],
  },
];

const fulMenu: MenuCategory[] = [
  {
    id: "f-sand", name: "سندوتشات", items: [
      { id: "f1", name: "سندوتش طعمية", desc: "طعمية خضرا سخنة بالسلطة والطحينة", price: 12, img: img("taameya1"), popular: true, options: [pick("f1", "العيش", [["بلدي", 0], ["فينو", 3]]), extras("f1", [["بيض مسلوق", 8], ["بطاطس", 6], ["باذنجان", 6]])] },
      { id: "f2", name: "سندوتش فول", desc: "فول مدمس بالزيت الحار والكمون", price: 12, img: img("falafelplate"), popular: true, options: [pick("f2", "النوع", [["سادة", 0], ["بالزيت الحار", 0], ["بالسلطة", 2], ["إسكندراني", 5]]), pick("f2b", "العيش", [["بلدي", 0], ["فينو", 3]])] },
      { id: "f3", name: "سندوتش بطاطس", desc: "شيبسي بيتي في عيش بلدي", price: 14, img: img("fries1") },
      { id: "f4", name: "سندوتش بيض بالبسطرمة", price: 30, img: img("eggs1") },
    ],
  },
  {
    id: "f-plates", name: "أطباق الفطار", items: [
      { id: "f5", name: "فطار العيلة", desc: "فول وطعمية وبطاطس وبيض وسلطة وعيش لـ 4 أفراد", price: 165, img: img("taameya2"), popular: true },
      { id: "f6", name: "طبق فول", price: 25, img: img("falafelplate"), options: [extras("f6", [["طحينة", 5], ["بيض", 8]])] },
      { id: "f7", name: "طبق طعمية (6 قطع)", price: 30, img: img("taameya2") },
      { id: "f8", name: "بيض أومليت", price: 35, img: img("breakfast1") },
    ],
  },
];

const shawarmaMenu: MenuCategory[] = [
  {
    id: "s-sand", name: "سندوتشات الشاورما", items: [
      { id: "s1", name: "شاورما فراخ", desc: "فراخ متتبلة على الفحم بالثومية والمخلل", price: 85, img: img("wrap1"), popular: true, options: [pick("s1", "العيش", [["صاج", 0], ["سوري", 0], ["فينو", 5]]), size("s1", [["عادي", 0], ["سوبر", 30]]), extras("s1", [["جبنة موتزاريلا", 20], ["بطاطس جوه السندوتش", 10], ["ثومية زيادة", 5]])] },
      { id: "s2", name: "شاورما لحمة", desc: "لحمة بلدي بالطحينة والبصل والسماق", price: 110, img: img("wrap2"), popular: true, options: [pick("s2", "العيش", [["صاج", 0], ["سوري", 0], ["فينو", 5]]), size("s2", [["عادي", 0], ["سوبر", 40]])] },
      { id: "s3", name: "سندوتش كريسبي", price: 90, img: img("chicken2") },
    ],
  },
  {
    id: "s-meals", name: "وجبات", items: [
      { id: "s4", name: "وجبة شاورما فراخ عربي", desc: "سندوتش مقطع، بطاطس، ثومية ومخلل", price: 175, img: img("shawarma1"), popular: true, options: [drink("s4")] },
      { id: "s5", name: "فتة شاورما", desc: "عيش محمص ورز وشاورما بصوص الزبادي", price: 160, img: img("rice1"), options: [pick("s5", "النوع", [["فراخ", 0], ["لحمة", 35]]), drink("s5")] },
      { id: "s6", name: "طبق شاورما", desc: "شاورما على رز بسمتي وسلطات", price: 195, img: img("grill1"), options: [pick("s6", "النوع", [["فراخ", 0], ["لحمة", 45], ["مكس", 25]])] },
    ],
  },
  {
    id: "s-sides", name: "جانبي", items: [
      { id: "s7", name: "بطاطس", price: 35, img: img("fries2"), options: [size("s7", [["وسط", 0], ["كبير", 15]])] },
      { id: "s8", name: "ثومية", price: 10, img: img("parfait1") },
      { id: "s9", name: "حمص بالطحينة", price: 40, img: img("bowl1") },
    ],
  },
];

const burgerMenu: MenuCategory[] = [
  {
    id: "b-smash", name: "سماش برجر", items: [
      { id: "b1", name: "كلاسيك سماش", desc: "قطعتين لحم مضغوطين، شيدر، بصل مكرمل وصوص البيت", price: 165, img: img("burger1"), popular: true, options: [size("b1", [["سنجل", 0], ["دبل", 60], ["تربل", 110]]), extras("b1", [["شيدر زيادة", 20], ["بيكون بقري", 35], ["بيض", 15], ["هالابينو", 10]], 4), drink("b1")] },
      { id: "b2", name: "فاير برجر", desc: "صوص حار مدخن، هالابينو، شيدر", price: 180, img: img("burger3"), popular: true, options: [size("b2", [["سنجل", 0], ["دبل", 60]]), extras("b2", [["شيدر زيادة", 20], ["بيكون بقري", 35]])] },
      { id: "b3", name: "ماشروم سويس", desc: "مشروم سوتيه وجبنة سويسري", price: 190, img: img("burger2"), options: [size("b3", [["سنجل", 0], ["دبل", 60]])] },
    ],
  },
  {
    id: "b-chicken", name: "فراخ", items: [
      { id: "b4", name: "كرسبي تشيكن برجر", price: 150, img: img("chicken1"), options: [extras("b4", [["شيدر", 20], ["صوص رانش", 10]])] },
      { id: "b5", name: "تندرز (5 قطع)", price: 170, img: img("chicken2"), options: [pick("b5", "الصوص", [["رانش", 0], ["باربكيو", 0], ["حار", 0]])] },
    ],
  },
  {
    id: "b-sides", name: "جانبي", items: [
      { id: "b6", name: "بطاطس بالجبنة", price: 70, img: img("fries1"), popular: true },
      { id: "b7", name: "بطاطس ودجز", price: 55, img: img("fries2") },
      { id: "b8", name: "ميلك شيك أوريو", price: 95, img: img("shake1") },
    ],
  },
];

const pizzaMenu: MenuCategory[] = [
  {
    id: "p-pizza", name: "بيتزا", items: [
      { id: "p1", name: "مارجريتا", desc: "صلصة طماطم إيطالية وموتزاريلا وريحان", price: 150, img: img("pizza3"), popular: true, options: [size("p1", [["وسط", 0], ["كبير", 50], ["عائلي", 110]]), pick("p1", "العجينة", [["رفيعة", 0], ["سميكة", 0], ["أطراف محشية جبنة", 35]])] },
      { id: "p2", name: "بيبروني", desc: "بيبروني بقري وموتزاريلا", price: 195, img: img("pizza1"), popular: true, options: [size("p2", [["وسط", 0], ["كبير", 55], ["عائلي", 120]]), pick("p2", "العجينة", [["رفيعة", 0], ["سميكة", 0], ["أطراف محشية جبنة", 35]])] },
      { id: "p3", name: "سوبر سوبريم", desc: "سجق، لحمة، فلفل، زيتون، مشروم", price: 220, img: img("pizza2"), options: [size("p3", [["وسط", 0], ["كبير", 55], ["عائلي", 120]])] },
    ],
  },
  {
    id: "p-pasta", name: "باستا", items: [
      { id: "p4", name: "بينا أرابياتا", price: 130, img: img("pasta1") },
      { id: "p5", name: "فوسيلي بالخضار والبيستو", price: 140, img: img("pasta2") },
    ],
  },
  { id: "p-salad", name: "سلطات", items: [{ id: "p6", name: "سيزر سالاد", price: 110, img: img("salad2") }] },
];

const grillMenu: MenuCategory[] = [
  {
    id: "g-grill", name: "مشويات بالكيلو", items: [
      { id: "g1", name: "كفتة", desc: "كفتة بلدي على الفحم", price: 160, unit: "ربع كيلو", img: img("grill2"), popular: true, options: [size("g1", [["ربع كيلو", 0], ["نص كيلو", 155], ["كيلو", 470]])] },
      { id: "g2", name: "مشكل مشويات", desc: "كفتة وطرب وكباب وريش", price: 340, unit: "نص كيلو", img: img("grill1"), popular: true, options: [size("g2", [["نص كيلو", 0], ["كيلو", 320]])] },
      { id: "g3", name: "نص فرخة مشوية", desc: "متتبلة بالليمون والثوم مع رز وسلطة", price: 220, img: img("chicken1") },
      { id: "g4", name: "ريش ضاني", price: 420, unit: "نص كيلو", img: img("steak1") },
    ],
  },
  {
    id: "g-sides", name: "مع المشويات", items: [
      { id: "g5", name: "رز بسمتي", price: 35, img: img("rice1") },
      { id: "g6", name: "سلطة بلدي", price: 25, img: img("salad1") },
      { id: "g7", name: "طحينة", price: 20, img: img("bowl1") },
    ],
  },
];

const fishMenu: MenuCategory[] = [
  {
    id: "fi-fish", name: "سمك بحيرة قارون", items: [
      { id: "fi1", name: "بلطي مشوي", desc: "بلطي طازة من البحيرة، ردة وليمون", price: 190, unit: "كيلو", img: img("fish1"), popular: true, options: [pick("fi1", "التسوية", [["مشوي ردة", 0], ["مقلي", 0], ["سنجاري", 20]]), size("fi1", [["نص كيلو", 0], ["كيلو", 170]])] },
      { id: "fi2", name: "جمبري", desc: "جمبري وسط مشوي أو مقلي", price: 320, unit: "نص كيلو", img: img("shrimp1"), popular: true, options: [pick("fi2", "التسوية", [["مشوي", 0], ["مقلي", 0], ["صينية بالصلصة", 25]])] },
      { id: "fi3", name: "طاجن سي فود", price: 280, img: img("seafood1") },
    ],
  },
  {
    id: "fi-sides", name: "جانبي", items: [
      { id: "fi4", name: "رز صيادية", price: 40, img: img("rice1") },
      { id: "fi5", name: "شوربة سي فود", price: 85, img: img("soup1") },
      { id: "fi6", name: "سلطة طحينة", price: 25, img: img("bowl1") },
    ],
  },
];

const sweetsMenu: MenuCategory[] = [
  {
    id: "sw-east", name: "حلويات شرقي", items: [
      { id: "sw1", name: "كنافة بالقشطة", desc: "كنافة بلدي ساخنة وقشطة طازة", price: 90, img: img("kunafa1"), popular: true, options: [size("sw1", [["قطعة", 0], ["ربع صينية", 110], ["نص صينية", 230]]), extras("sw1", [["مكسرات", 20], ["نوتيلا", 25]])] },
      { id: "sw2", name: "كنافة نابلسية", price: 110, img: img("kunafa1") },
    ],
  },
  {
    id: "sw-west", name: "حلويات غربي", items: [
      { id: "sw3", name: "كيكة شوكولاتة", desc: "تورتة شوكولاتة بلجيكي", price: 85, img: img("cake1"), popular: true, options: [size("sw3", [["قطعة", 0], ["تورتة 8 أفراد", 470]])] },
      { id: "sw4", name: "دونتس (3 قطع)", price: 75, img: img("donut1") },
      { id: "sw5", name: "كوكيز", price: 60, img: img("cookies1") },
      { id: "sw6", name: "آيس كريم صنداي", price: 80, img: img("icecream1") },
    ],
  },
];

const cafeMenu: MenuCategory[] = [
  {
    id: "c-hot", name: "مشروبات سخنة", items: [
      { id: "c1", name: "لاتيه", price: 75, img: img("coffee2"), popular: true, options: [size("c1", [["وسط", 0], ["كبير", 15]]), pick("c1", "اللبن", [["عادي", 0], ["شوفان", 20], ["خالي الدسم", 0]]), extras("c1", [["شوت إسبريسو", 20], ["كراميل", 10], ["فانيليا", 10]])] },
      { id: "c2", name: "قهوة تركي", price: 40, img: img("cafetray"), options: [pick("c2", "السكر", [["سادة", 0], ["ع الريحة", 0], ["مظبوط", 0], ["زيادة", 0]])] },
      { id: "c3", name: "كابتشينو", price: 70, img: img("coffee1") },
      { id: "c4", name: "شاي بلبن", price: 35, img: img("tea1") },
    ],
  },
  {
    id: "c-cold", name: "مشروبات ساقعة", items: [
      { id: "c5", name: "آيس لاتيه", price: 85, img: img("coffee3"), popular: true, options: [extras("c5", [["كراميل", 10], ["شوت إسبريسو", 20]])] },
      { id: "c6", name: "سموزي فراولة وموز", price: 80, img: img("smoothie1") },
      { id: "c7", name: "ميلك شيك", price: 90, img: img("shake1") },
    ],
  },
  {
    id: "c-bites", name: "مع القهوة", items: [
      { id: "c8", name: "وافل", price: 95, img: img("waffle1") },
      { id: "c9", name: "بان كيك بالعسل", price: 110, img: img("pancake1") },
      { id: "c10", name: "فرنش توست", price: 100, img: img("toast1") },
    ],
  },
];

const juiceMenu: MenuCategory[] = [
  {
    id: "j-fresh", name: "عصاير فريش", items: [
      { id: "j1", name: "برتقال", price: 40, img: img("juice1"), popular: true, options: [size("j1", [["وسط", 0], ["كبير", 15], ["لتر", 45]]), pick("j1", "السكر", [["من غير", 0], ["عادي", 0]])] },
      { id: "j2", name: "مانجو", price: 50, img: img("juice2"), popular: true, options: [size("j2", [["وسط", 0], ["كبير", 15], ["لتر", 50]])] },
      { id: "j3", name: "كوكتيل فواكه", price: 55, img: img("smoothie1") },
      { id: "j4", name: "فخفخينا", desc: "فواكه وآيس كريم ومكسرات", price: 75, img: img("parfait1") },
    ],
  },
  { id: "j-salad", name: "سلطة فواكه", items: [{ id: "j5", name: "سلطة فواكه بالقشطة", price: 70, img: img("fruits1") }] },
];

const healthyMenu: MenuCategory[] = [
  {
    id: "h-bowls", name: "بولز", items: [
      { id: "h1", name: "بول فراخ مشوية", desc: "كينوا، أفوكادو، خضار مشوي وصوص زبادي", price: 175, img: img("salad1"), popular: true, options: [pick("h1", "القاعدة", [["كينوا", 0], ["رز بني", 0], ["خس", 0]]), extras("h1", [["أفوكادو زيادة", 30], ["بيضة", 12]])] },
      { id: "h2", name: "بول خضار", price: 140, img: img("bowl1") },
      { id: "h3", name: "سلمون بول", price: 260, img: img("fish1") },
    ],
  },
  { id: "h-salads", name: "سلطات", items: [{ id: "h4", name: "سلطة خضرا كبيرة", price: 95, img: img("vegetables1") }, { id: "h5", name: "سلطة مكرونة", price: 90, img: img("pasta2") }] },
];

const crepeMenu: MenuCategory[] = [
  {
    id: "cr-salty", name: "كريب حادق", items: [
      { id: "cr1", name: "كريب فراخ رانش", desc: "فراخ، موتزاريلا، صوص رانش وخضار", price: 120, img: img("crepe1"), popular: true, options: [extras("cr1", [["موتزاريلا زيادة", 20], ["بطاطس جوه", 10]])] },
      { id: "cr2", name: "كريب سجق", price: 110, img: img("crepe1") },
      { id: "cr3", name: "توست مشكل جبن", price: 80, img: img("sandwich1") },
    ],
  },
  {
    id: "cr-sweet", name: "كريب حلو", items: [
      { id: "cr4", name: "كريب نوتيلا وموز", price: 115, img: img("pancake1"), popular: true },
      { id: "cr5", name: "كريب لوتس", price: 125, img: img("waffle1") },
    ],
  },
];

const martMenu: MenuCategory[] = [
  {
    id: "m-veg", name: "خضار وفاكهة", items: [
      { id: "m1", name: "طماطم", unit: "كيلو", price: 22, img: img("tomato1"), popular: true },
      { id: "m2", name: "موز", unit: "كيلو", price: 38, img: img("banana1"), popular: true },
      { id: "m3", name: "سلة فاكهة الموسم", unit: "3 كيلو", price: 165, oldPrice: 190, img: img("fruits1") },
      { id: "m4", name: "خضار سلطة مشكل", unit: "علبة", price: 35, img: img("vegetables1") },
    ],
  },
  {
    id: "m-dairy", name: "ألبان وبيض", items: [
      { id: "m5", name: "لبن كامل الدسم", unit: "لتر", price: 48, img: img("milk1"), popular: true },
      { id: "m6", name: "لبن طبيعي", unit: "1 لتر", price: 52, oldPrice: 58, img: img("milk2") },
      { id: "m7", name: "بيض أحمر", unit: "30 بيضة", price: 175, img: img("eggsraw1"), popular: true },
      { id: "m8", name: "جبنة رومي", unit: "ربع كيلو", price: 95, img: img("cheese1") },
    ],
  },
  {
    id: "m-bakery", name: "مخبوزات", items: [
      { id: "m9", name: "عيش بلدي", unit: "10 أرغفة", price: 15, img: img("bread1"), popular: true },
      { id: "m10", name: "عيش أسمر", unit: "كيس", price: 30, img: img("bread1") },
    ],
  },
  {
    id: "m-drinks", name: "مشروبات", items: [
      { id: "m11", name: "مياه معدنية", unit: "6 × 1.5 لتر", price: 60, img: img("water1"), popular: true },
      { id: "m12", name: "عصير برتقال", unit: "لتر", price: 45, oldPrice: 52, img: img("juice1") },
      { id: "m13", name: "بن محوج", unit: "ربع كيلو", price: 145, img: img("coffee1") },
    ],
  },
  {
    id: "m-snacks", name: "سناكس وشوكولاتة", items: [
      { id: "m14", name: "شيبسي كبير", unit: "كيس", price: 20, img: img("snacks1") },
      { id: "m15", name: "شوكولاتة داكنة", unit: "100 جم", price: 75, img: img("chocolate1") },
      { id: "m16", name: "كوكيز شوكولاتة", unit: "علبة", price: 55, img: img("cookies1") },
    ],
  },
  {
    id: "m-clean", name: "منظفات", items: [
      { id: "m17", name: "منظف أسطح", unit: "1 لتر", price: 65, img: img("cleaning1") },
      { id: "m18", name: "سائل أطباق", unit: "750 مل", price: 48, oldPrice: 55, img: img("cleaning1") },
    ],
  },
];

const pharmacyMenu: MenuCategory[] = [
  {
    id: "ph-cold", name: "برد وأنفلونزا", items: [
      { id: "ph1", name: "باراسيتامول 500 مجم", unit: "شريط 20 قرص", price: 32, img: img("pills1"), popular: true },
      { id: "ph2", name: "أقراص برد وزكام", unit: "شريط 10", price: 45, img: img("pharmacy1") },
      { id: "ph3", name: "شراب كحة للأطفال", unit: "120 مل", price: 58, img: img("meds1") },
    ],
  },
  {
    id: "ph-pain", name: "مسكنات", items: [
      { id: "ph4", name: "إيبوبروفين 400 مجم", unit: "شريط 20 قرص", price: 40, img: img("pills1") },
      { id: "ph5", name: "جل مسكن للعضلات", unit: "50 جم", price: 75, img: img("meds1") },
    ],
  },
  {
    id: "ph-vit", name: "فيتامينات", items: [
      { id: "ph6", name: "فيتامين سي 1000 فوار", unit: "20 قرص", price: 85, img: img("vitamins1"), popular: true },
      { id: "ph7", name: "فيتامين د 5000", unit: "30 كبسولة", price: 120, img: img("vitamins1") },
      { id: "ph8", name: "مالتي فيتامين", unit: "30 قرص", price: 165, img: img("pharmacy1") },
    ],
  },
  {
    id: "ph-care", name: "عناية شخصية", items: [
      { id: "ph9", name: "كمامات طبية", unit: "علبة 50", price: 60, img: img("meds1") },
      { id: "ph10", name: "مطهر يدين", unit: "250 مل", price: 45, img: img("cleaning1") },
    ],
  },
];

export const STORES: Store[] = [
  { id: "sakia-shawarma", name: "شاورما الساقية", vertical: "food", tags: ["شاورما", "سوري"], area: "الحادقة", rating: 4.8, ratingCount: 2140, etaMin: 25, etaMax: 35, deliveryFee: 15, freeDeliveryOver: 250, minOrder: 60, distanceKm: 1.2, cover: img("shawarma1"), mono: { letter: "س", bg: "#7A2E1F", fg: "#FFE7C2" }, open: true, promo: "توصيل مجاني فوق 250 ج.م", lamhaRider: true, payments: ["cash", "card", "wallet"], coords: [29.3135, 30.8395], menu: shawarmaMenu },
  { id: "hadaqa-koshari", name: "كشري الحادقة", vertical: "food", tags: ["كشري", "مصري"], area: "الحادقة", rating: 4.7, ratingCount: 3310, etaMin: 20, etaMax: 30, deliveryFee: 10, minOrder: 35, distanceKm: 0.8, cover: img("koshari1"), mono: { letter: "ك", bg: "#B8331B", fg: "#FFF3D6" }, open: true, lamhaRider: true, payments: ["cash", "wallet"], coords: [29.3162, 30.8366], menu: koshariMenu },
  { id: "am-saber", name: "فول وطعمية عم صابر", vertical: "food", tags: ["فطار", "مصري"], area: "المسلة", rating: 4.9, ratingCount: 5120, etaMin: 15, etaMax: 25, deliveryFee: 8, minOrder: 30, distanceKm: 0.6, cover: img("taameya2"), mono: { letter: "ص", bg: "#2F5D2A", fg: "#EAF6C8" }, open: true, promo: "الأكثر طلباً الصبح", lamhaRider: true, payments: ["cash", "wallet"], coords: [29.3052, 30.8458], menu: fulMenu },
  { id: "smash-lab", name: "سماش لاب", vertical: "food", tags: ["برجر", "أمريكي"], area: "حي الجامعة", rating: 4.6, ratingCount: 1288, etaMin: 30, etaMax: 45, deliveryFee: 20, freeDeliveryOver: 400, minOrder: 120, distanceKm: 3.4, cover: img("burger1"), mono: { letter: "S", bg: "#141414", fg: "#F7D23E" }, open: true, promo: "خصم 20٪ بكود LAMHA20", lamhaRider: true, payments: ["cash", "card", "wallet"], coords: [29.3182, 30.8765], menu: burgerMenu },
  { id: "qarun-pizza", name: "بيتزا قارون", vertical: "food", tags: ["بيتزا", "إيطالي"], area: "الصوفي", rating: 4.5, ratingCount: 960, etaMin: 35, etaMax: 50, deliveryFee: 18, minOrder: 100, distanceKm: 2.1, cover: img("pizza2"), mono: { letter: "ق", bg: "#1E4E8C", fg: "#FFFFFF" }, open: true, lamhaRider: false, payments: ["cash", "card"], coords: [29.3108, 30.8562], menu: pizzaMenu },
  { id: "waha-grill", name: "مشويات الواحة", vertical: "food", tags: ["مشويات", "مصري"], area: "كيمان فارس", rating: 4.7, ratingCount: 1740, etaMin: 40, etaMax: 55, deliveryFee: 20, freeDeliveryOver: 500, minOrder: 150, distanceKm: 2.6, cover: img("grill1"), mono: { letter: "و", bg: "#5B3A1A", fg: "#FFD9A0" }, open: true, lamhaRider: true, payments: ["cash", "card", "wallet"], coords: [29.3208, 30.8462], menu: grillMenu },
  { id: "qarun-fish", name: "أسماك بحيرة قارون", vertical: "food", tags: ["أسماك", "بحري"], area: "قحافة", rating: 4.6, ratingCount: 830, etaMin: 45, etaMax: 60, deliveryFee: 25, minOrder: 150, distanceKm: 4.1, cover: img("seafood1"), mono: { letter: "ب", bg: "#0F5B66", fg: "#D7F5F2" }, open: true, promo: "سمك البحيرة طازة كل يوم", lamhaRider: true, payments: ["cash", "wallet"], coords: [29.2912, 30.8588], menu: fishMenu },
  { id: "qarun-sweets", name: "حلواني الفيوم", vertical: "food", tags: ["حلويات", "كنافة"], area: "المسلة", rating: 4.8, ratingCount: 1520, etaMin: 25, etaMax: 35, deliveryFee: 12, minOrder: 60, distanceKm: 1.0, cover: img("kunafa1"), mono: { letter: "ح", bg: "#8C1D4B", fg: "#FFE2EE" }, open: true, lamhaRider: true, payments: ["cash", "card", "wallet"], coords: [29.3031, 30.8484], menu: sweetsMenu },
  { id: "masalla-cafe", name: "قهوة المسلة", vertical: "food", tags: ["كافيه", "قهوة"], area: "المسلة", rating: 4.7, ratingCount: 1102, etaMin: 20, etaMax: 30, deliveryFee: 12, minOrder: 50, distanceKm: 0.9, cover: img("coffee2"), mono: { letter: "م", bg: "#3B2A20", fg: "#F2D7B6" }, open: true, lamhaRider: true, payments: ["cash", "card", "wallet"], coords: [29.3046, 30.8442], menu: cafeMenu },
  { id: "nakhla-juice", name: "عصاير النخلة", vertical: "food", tags: ["عصاير", "فريش"], area: "دار الرماد", rating: 4.5, ratingCount: 690, etaMin: 20, etaMax: 30, deliveryFee: 10, minOrder: 40, distanceKm: 1.6, cover: img("juice2"), mono: { letter: "ن", bg: "#E07B00", fg: "#FFF6DD" }, open: true, lamhaRider: true, payments: ["cash", "wallet"], coords: [29.2988, 30.8361], menu: juiceMenu },
  { id: "green-bowl", name: "جرين بول", vertical: "food", tags: ["صحي", "سلطات"], area: "حي الجامعة", rating: 4.4, ratingCount: 410, etaMin: 30, etaMax: 40, deliveryFee: 18, minOrder: 120, distanceKm: 3.2, cover: img("salad1"), mono: { letter: "G", bg: "#3E7D3A", fg: "#F0FBE6" }, open: false, opensAt: "12 الظهر", lamhaRider: true, payments: ["cash", "card", "wallet"], coords: [29.3168, 30.8742], menu: healthyMenu },
  { id: "crepe-street", name: "كريب ستريت", vertical: "food", tags: ["كريب", "سناكس"], area: "الشيخ حسن", rating: 4.3, ratingCount: 520, etaMin: 25, etaMax: 40, deliveryFee: 15, minOrder: 70, distanceKm: 1.9, cover: img("crepe1"), mono: { letter: "ك", bg: "#6B3FA0", fg: "#F3E9FF" }, open: true, lamhaRider: false, payments: ["cash"], coords: [29.3027, 30.8262], menu: crepeMenu },
  { id: "lamha-mart", name: "لمحة ماركت", vertical: "mart", tags: ["سوبر ماركت"], area: "المسلة", rating: 4.8, ratingCount: 4210, etaMin: 15, etaMax: 25, deliveryFee: 10, freeDeliveryOver: 300, minOrder: 50, distanceKm: 0.7, cover: img("market1"), mono: { letter: "ل", bg: "#1C2FA8", fg: "#FFFFFF" }, open: true, promo: "في 20 دقيقة", lamhaRider: true, payments: ["cash", "card", "wallet"], coords: [29.3061, 30.8432], menu: martMenu },
  { id: "shifa-pharmacy", name: "صيدلية الشفاء", vertical: "pharmacy", tags: ["صيدلية 24 ساعة"], area: "الحادقة", rating: 4.9, ratingCount: 1890, etaMin: 15, etaMax: 30, deliveryFee: 10, minOrder: 0, distanceKm: 0.9, cover: img("pharmacy1"), mono: { letter: "ش", bg: "#0E7C5A", fg: "#E4FFF3" }, open: true, promo: "مفتوحة 24 ساعة", lamhaRider: true, payments: ["cash", "card", "wallet"], coords: [29.3144, 30.8372], menu: pharmacyMenu },
];

export const storeById = (id: string) => STORES.find((s) => s.id === id);

export function findItem(itemId: string) {
  for (const s of STORES) for (const c of s.menu) for (const i of c.items) if (i.id === itemId) return { store: s, item: i };
  return undefined;
}

export const CUISINES = [
  { id: "مصري", label: "أكل مصري", img: img("koshari1") },
  { id: "شاورما", label: "شاورما", img: img("wrap1") },
  { id: "برجر", label: "برجر", img: img("burger3") },
  { id: "بيتزا", label: "بيتزا", img: img("pizza1") },
  { id: "مشويات", label: "مشويات", img: img("grill2") },
  { id: "أسماك", label: "أسماك", img: img("fish1") },
  { id: "حلويات", label: "حلويات", img: img("kunafa1") },
  { id: "قهوة", label: "قهوة", img: img("coffee1") },
  { id: "فطار", label: "فطار", img: img("taameya1") },
  { id: "صحي", label: "صحي", img: img("salad1") },
];
