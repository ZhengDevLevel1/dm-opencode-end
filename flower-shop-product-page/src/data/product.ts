export type GalleryImage = {
  src: string;
  alt: string;
  label: string;
};

export type SpecOption = {
  id: string;
  name: string;
  desc: string;
  priceDelta: number;
  stems: string;
};

export type WrapOption = {
  id: string;
  name: string;
  hex: string;
  ring: string;
  desc: string;
};

export type FlowerLine = {
  name: string;
  latin: string;
  count: number;
  note: string;
};

export type Review = {
  id: number;
  user: string;
  avatarSeed: string;
  rating: number;
  date: string;
  spec: string;
  content: string;
  tags: string[];
  images: string[];
  likes: number;
  reply?: {
    by: string;
    time: string;
    text: string;
  };
};

export const product = {
  id: "F-1024",
  brand: "拾花集 · 花艺工作室",
  name: "「初见」粉玫瑰混搭花束",
  subtitle: "First Blush · 粉荔枝玫瑰 × 蝴蝶洋牡丹 × 尤加利",
  sku: "SKU F1024-PINK",
  basePrice: 398,
  originalPrice: 528,
  rating: 4.9,
  reviewCount: 2861,
  soldCount: 12680,
  stock: 23,
  badges: ["今日现货", "花市直采", "三小时达"],
  story:
    "以「初次遇见的那阵心跳」为灵感，我们选取当季最柔软的粉荔枝玫瑰作为主角，搭配洋牡丹的层叠瓣影与白桔梗的清透，用一抹雾灰绿的尤加利收尾。整束花以韩式雾面包装呈现，收口处系上手工染色的真丝缎带——它不喧哗，却在递出的瞬间让人屏息。",
  highlight:
    "每日凌晨 4:30 于昆明花市直采，冷链 18 小时直达门店，花材开放度控制在 2–3 度，到手后仍可观赏 7–10 天。",
};

export const gallery: GalleryImage[] = [
  {
    src: "https://images.pexels.com/photos/33791888/pexels-photo-33791888.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1300&w=900",
    alt: "「初见」粉玫瑰混搭花束整体",
    label: "花束全貌",
  },
  {
    src: "https://images.pexels.com/photos/12385333/pexels-photo-12385333.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1300&w=900",
    alt: "粉荔枝玫瑰花材特写",
    label: "花材特写",
  },
  {
    src: "https://images.pexels.com/photos/36176311/pexels-photo-36176311.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1300&w=900",
    alt: "包装与缎带细节",
    label: "包装细节",
  },
  {
    src: "https://images.pexels.com/photos/33772940/pexels-photo-33772940.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1300&w=900",
    alt: "附赠贺卡与养花剂",
    label: "随赠配件",
  },
  {
    src: "https://images.pexels.com/photos/35423452/pexels-photo-35423452.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1300&w=900",
    alt: "花艺师现场制作过程",
    label: "现场制作",
  },
];

export const specs: SpecOption[] = [
  {
    id: "s",
    name: "心动款 · 19 枝",
    desc: "适合日常惊喜",
    priceDelta: -120,
    stems: "19 枝主花",
  },
  {
    id: "m",
    name: "告白款 · 33 枝",
    desc: "最受欢迎 · 热销 78%",
    priceDelta: 0,
    stems: "33 枝主花",
  },
  {
    id: "l",
    name: "挚爱款 · 52 枝",
    desc: "求婚 / 纪念日",
    priceDelta: 260,
    stems: "52 枝主花",
  },
  {
    id: "xl",
    name: "殿堂款 · 99 枝",
    desc: "大型抱抱桶",
    priceDelta: 680,
    stems: "99 枝主花",
  },
];

export const wraps: WrapOption[] = [
  { id: "mist", name: "雾灰奶茶", hex: "#cbb9a6", ring: "#a8917a", desc: "高级感哑光" },
  { id: "pink", name: "裸粉奶霜", hex: "#eecdd0", ring: "#d9a3aa", desc: "甜美柔和" },
  { id: "white", name: "米白亚麻", hex: "#ece7db", ring: "#cbc2ae", desc: "清冷纯净" },
  { id: "ink", name: "墨黑经典", hex: "#2c2c30", ring: "#111114", desc: "酷感大气" },
  { id: "sky", name: "雾霾湖水蓝", hex: "#a9c3cd", ring: "#7ea1af", desc: "文艺清新" },
];

export const flowers: FlowerLine[] = [
  { name: "粉荔枝玫瑰", latin: "Rosa 'Lychee'", count: 12, note: "花头直径 5–6cm，荔枝甜香" },
  { name: "蝴蝶洋牡丹", latin: "Ranunculus", count: 7, note: "层叠瓣影，开放度 2 度" },
  { name: "白桔梗", latin: "Eustoma", count: 8, note: "清透点缀，去除黄叶" },
  { name: "奶油奥斯汀", latin: "Rosa 'Austin'", count: 4, note: "杯型重瓣，奶油镶边" },
  { name: "银灰尤加利", latin: "Eucalyptus", count: 6, note: "雾灰绿叶，气味清冽" },
  { name: "白色蕾丝花", latin: "Ammi visnaga", count: 3, note: "空气感填充，自然散落" },
];

export const services = [
  { icon: "truck", title: "全城 3 小时送达", desc: "当日 14:00 前下单，当日必达" },
  { icon: "leaf", title: "花材新鲜保障", desc: "不新鲜免费重做，7 天售后" },
  { icon: "card", title: "免费手写贺卡", desc: "支持中英双语代写" },
  { icon: "camera", title: "送达拍照回传", desc: "收花瞬间，同步给你" },
];

export const reviews: Review[] = [
  {
    id: 1,
    user: "半糖去冰的下午",
    avatarSeed: "BG",
    rating: 5,
    date: "2026-02-11",
    spec: "告白款 · 33 枝 / 雾灰奶茶",
    content:
      "第三次回购了。这次是送给闺蜜的生日花束，花艺师照着我的要求加了少许白蕾丝花，整体比图片还要松弛好看。收到的时候玫瑰大概开了三成，第三天完全绽放，房间里有淡淡的荔枝甜香，真的绝。",
    tags: ["花材新鲜", "包装精致", "配送准时"],
    images: [
      "https://images.pexels.com/photos/36176311/pexels-photo-36176311.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=400",
      "https://images.pexels.com/photos/33772940/pexels-photo-33772940.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=400",
    ],
    likes: 218,
  },
  {
    id: 2,
    user: "阿澈",
    avatarSeed: "AC",
    rating: 5,
    date: "2026-02-06",
    spec: "心动款 · 19 枝 / 米白亚麻",
    content:
      "异地恋三年，第一次给她订花。客服帮我把贺卡内容改了三次，一个字一个字确认，最后还发了制作过程的短视频给我。她收到的时候发来语音，声音都在抖。谢谢你们。",
    tags: ["客服超好", "贺卡代写", "值得回购"],
    images: [
      "https://images.pexels.com/photos/33784343/pexels-photo-33784343.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=400",
    ],
    likes: 402,
  },
  {
    id: 3,
    user: "Momo 在忙",
    avatarSeed: "MO",
    rating: 4,
    date: "2026-01-29",
    spec: "挚爱款 · 52 枝 / 墨黑经典",
    content:
      "求婚用的，52 枝真的很有分量，抱起来快遮住半个人。配送师傅提前一小时电话确认，还主动帮忙避开她下班的路线。扣一星是因为少了满天星，不过客服第二天补寄了一小束过来，处理态度很好。",
    tags: ["分量十足", "售后到位"],
    images: [],
    likes: 156,
  },
  {
    id: 4,
    user: "Island",
    avatarSeed: "IS",
    rating: 5,
    date: "2026-01-22",
    spec: "告白款 · 33 枝 / 雾霾湖水蓝",
    content:
      "湖水蓝的包装实物是那种很克制的灰蓝，配粉玫瑰意外地高级，比市面上常见的塑料感包装好太多。附赠的养花剂有两包，按说明每两天换水，第七天花还很好看。",
    tags: ["质感在线", "花期持久"],
    images: [
      "https://images.pexels.com/photos/17511201/pexels-photo-17511201.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=400",
    ],
    likes: 89,
  },
  {
    id: 5,
    user: "林一一",
    avatarSeed: "LY",
    rating: 5,
    date: "2026-01-18",
    spec: "心动款 · 19 枝 / 裸粉奶霜",
    content:
      "给妈妈订的。她收到的时候正在厨房洗菜，手套都没摘就跑出来看，站在门口翻来覆去看了好几遍。她说这辈子第一次收到花，有点手足无措。我爸在旁边假装不在意，结果偷偷拍了照片发到家庭群，还配了一个「加油」的表情。谢谢你们让一个不太会表达的家庭，有了一次小小的仪式感。",
    tags: ["值得回购", "客服超好"],
    images: [
      "https://images.pexels.com/photos/36176311/pexels-photo-36176311.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=400",
    ],
    likes: 512,
    reply: {
      by: "拾花集 客服 · 小满",
      time: "2026-01-19",
      text: "谢谢一一的分享～妈妈戴着手套看花的样子，我们光是想象就觉得很开心。下次给妈妈订花可以备注「不要提前联系」，我们让配送员直接敲门，给她一个更完整的惊喜。",
    },
  },
  {
    id: 6,
    user: "Nico",
    avatarSeed: "NI",
    rating: 3,
    date: "2026-01-15",
    spec: "告白款 · 33 枝 / 米白亚麻",
    content:
      "花本身没问题，开放度刚好，第三天最美。扣两星是因为配送晚了大概四十分钟。虽然师傅提前打了电话解释路上堵车，但我当时已经在餐厅门口站了很久，有点尴尬。希望指定时段的精度能再准一点，或者提前一小时再确认一次位置。",
    tags: ["花材新鲜"],
    images: [],
    likes: 47,
    reply: {
      by: "拾花集 店长",
      time: "2026-01-16",
      text: "非常抱歉这次让您久等了。我们已将该时段的配送半径临时缩减 2 公里，您的订单也标记为优先回访，稍后会有专人联系您并补偿一张 30 元无门槛券。感谢您愿意告诉我们真实感受。",
    },
  },
  {
    id: 7,
    user: "甜筒不加冰",
    avatarSeed: "TT",
    rating: 5,
    date: "2026-01-11",
    spec: "挚爱款 · 52 枝 / 雾霾湖水蓝",
    content:
      "公司开业订的两篮，摆在前台一整天都有人问是哪家做的。同事说像从杂志里搬出来的。月度订阅已经谈好了，每周一束，比自己跑去花市挑省心太多，而且每次都能给到不一样的搭配。",
    tags: ["质感在线", "值得回购"],
    images: [
      "https://images.pexels.com/photos/35423452/pexels-photo-35423452.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=400",
      "https://images.pexels.com/photos/33791888/pexels-photo-33791888.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=400",
    ],
    likes: 134,
  },
  {
    id: 8,
    user: "阿禾的邻居",
    avatarSeed: "AH",
    rating: 4,
    date: "2026-01-08",
    spec: "心动款 · 19 枝 / 墨黑经典",
    content:
      "整体很满意，包装是那种很沉的哑光黑，配上粉玫瑰意外地好看，一点不土。唯一想吐槽的是保鲜剂只给了一包，两束花有点不够用。反馈之后客服当天就补寄了，也算解决得干脆。",
    tags: ["售后到位", "包装精致"],
    images: [],
    likes: 76,
  },
];

export const ratingBreakdown = [
  { star: 5, count: 2541 },
  { star: 4, count: 249 },
  { star: 3, count: 51 },
  { star: 2, count: 14 },
  { star: 1, count: 6 },
];

export const careSteps = [
  {
    step: "01",
    title: "45° 斜剪根",
    text: "收到花束后，在根部以上 2cm 处以 45° 斜剪，扩大吸水面积，避免平剪导致吸水面贴住瓶底。",
  },
  {
    step: "02",
    title: "去叶入水",
    text: "摘除所有会浸入水中的叶片，避免叶片在水中腐烂滋生细菌，每两天清洗花瓶并更换清水。",
  },
  {
    step: "03",
    title: "浅水养护",
    text: "水位控制在花瓶的 1/3，深水反而会加速茎秆腐烂。加入附赠保鲜剂，可延长 2–3 天花期。",
  },
  {
    step: "04",
    title: "避开风口",
    text: "远离空调直吹、暖气与成熟水果（乙烯会催谢）。夜间可移至阴凉处，玫瑰会缓慢恢复挺立。",
  },
];

export const deliverySlots = [
  { time: "09:00 – 12:00", label: "上午 · 花材最饱满", left: 12 },
  { time: "12:00 – 15:00", label: "午后 · 热门时段", left: 4 },
  { time: "15:00 – 18:00", label: "傍晚 · 生日惊喜", left: 9 },
  { time: "18:00 – 21:00", label: "夜间 · 需加急费", left: 18 },
];

export type RelatedItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  tag: string;
  tagColor: string;
  img: string;
};

export const related: RelatedItem[] = [
  {
    id: "F-1031",
    name: "「绯色心跳」大丽花抱抱桶",
    desc: "红大丽 × 铁线莲",
    price: 468,
    tag: "新品",
    tagColor: "bg-moss-700 text-cream-100",
    img: "https://images.pexels.com/photos/36399728/pexels-photo-36399728.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=640",
  },
  {
    id: "F-1042",
    name: "「夜航星」紫雾混搭花束",
    desc: "紫桔梗 × 银莲花",
    price: 388,
    tag: "热销",
    tagColor: "bg-blush-500 text-white",
    img: "https://images.pexels.com/photos/17511201/pexels-photo-17511201.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=640",
  },
  {
    id: "F-1055",
    name: "「白日梦」奶油黄郁金香",
    desc: "重瓣郁金香 20 枝",
    price: 299,
    tag: "春季限定",
    tagColor: "bg-[#8a6f3c] text-cream-50",
    img: "https://images.pexels.com/photos/33784343/pexels-photo-33784343.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=640",
  },
  {
    id: "F-1068",
    name: "「日落收藏」橙黄暖调花束",
    desc: "玫瑰 × 黄百合 × 尤加利",
    price: 352,
    tag: "店长推荐",
    tagColor: "bg-[#a5566a] text-white",
    img: "https://images.pexels.com/photos/23963897/pexels-photo-23963897.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=640",
  },
];
