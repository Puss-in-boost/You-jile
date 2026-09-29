export type SubcategoryDefinition = {
  name: string;
  emoji: string;
  words: string[];
  aliases: string[];
};

export type CategoryDefinition = {
  name: string;
  emoji: string;
  color: string;
  words: string[];
  aliases: string[];
  subcategories?: SubcategoryDefinition[];
};

/**
 * Built-in category dictionary.
 *
 * Matching order is:
 * user rule > specific built-in category > generic fallback > fuzzy match > 其他.
 * Categories describe what the money was used for, not where the purchase happened.
 */
export const categories: CategoryDefinition[] = [
  {
    "name": "餐饮",
    "emoji": "🍜",
    "color": "#79a78a",
    "words": [
      "餐饮"
    ],
    "aliases": [
      "food",
      "delivery"
    ],
    "subcategories": [
      {
        "name": "正餐",
        "emoji": "🍜",
        "words": [
          "早餐",
          "早饭",
          "午饭",
          "午餐",
          "晚饭",
          "晚餐",
          "夜宵",
          "宵夜",
          "点外卖",
          "外卖",
          "餐厅",
          "饭店",
          "吃饭",
          "聚餐",
          "食堂",
          "快餐",
          "轻食",
          "火锅",
          "烧烤",
          "烤肉",
          "麻辣烫",
          "冒菜",
          "面馆",
          "米线",
          "螺蛳粉",
          "麦当劳",
          "肯德基",
          "汉堡王",
          "必胜客",
          "海底捞",
          "美团外卖",
          "饿了么",
          "小象外卖"
        ],
        "aliases": [
          "麦记",
          "k记",
          "mcdonalds",
          "kfc",
          "meituan",
          "eleme"
        ]
      },
      {
        "name": "饮料",
        "emoji": "🥤",
        "words": [
          "咖啡",
          "咖啡店",
          "瑞幸",
          "星巴克",
          "拿铁",
          "美式",
          "澳白",
          "摩卡",
          "卡布奇诺",
          "生椰",
          "厚乳",
          "手冲",
          "manner",
          "库迪",
          "tims",
          "皮爷咖啡",
          "arabica",
          "mstand",
          "挪瓦咖啡",
          "奶茶",
          "茶饮",
          "果茶",
          "柠檬茶",
          "喜茶",
          "奈雪",
          "茶百道",
          "沪上阿姨",
          "霸王茶姬",
          "蜜雪冰城",
          "古茗",
          "一点点",
          "益禾堂",
          "书亦烧仙草",
          "爷爷不泡茶",
          "茶颜悦色",
          "茉莉奶白",
          "饮料",
          "饮品",
          "可乐",
          "雪碧",
          "芬达",
          "果汁",
          "汽水",
          "气泡饮料",
          "气泡水",
          "矿泉水",
          "纯净水",
          "椰汁",
          "椰子水"
        ],
        "aliases": [
          "luckin",
          "starbucks",
          "星爸爸",
          "拿鉄",
          "cotti",
          "%arabica",
          "peets",
          "nowwa",
          "heytea",
          "nayuki",
          "mixue",
          "cola",
          "coke",
          "sprite",
          "juice",
          "soda"
        ]
      },
      {
        "name": "零食甜品",
        "emoji": "🍰",
        "words": [
          "零食",
          "面包",
          "蛋糕",
          "甜品",
          "甜点",
          "烘焙",
          "饼干",
          "薯片",
          "巧克力",
          "冰淇淋",
          "冰激凌",
          "便利店零食",
          "好利来",
          "鲍师傅",
          "泸溪河",
          "元祖"
        ],
        "aliases": [
          "snack",
          "bakery"
        ]
      },
      {
        "name": "生鲜买菜",
        "emoji": "🥬",
        "words": [
          "买菜",
          "多多买菜",
          "美团买菜",
          "菜市场",
          "生鲜",
          "蔬菜",
          "水果",
          "肉菜",
          "鸡蛋",
          "牛奶",
          "盒马",
          "叮咚买菜",
          "朴朴",
          "小象超市",
          "钱大妈",
          "永辉",
          "山姆超市",
          "山姆会员店",
          "沃尔玛",
          "大润发",
          "华润万家",
          "每日优鲜"
        ],
        "aliases": [
          "hema",
          "dingdong",
          "samsclub",
          "sam'sclub"
        ]
      },
      {
        "name": "酒水",
        "emoji": "🍺",
        "words": [
          "啤酒",
          "白酒",
          "红酒",
          "葡萄酒",
          "威士忌",
          "清酒",
          "鸡尾酒",
          "酒水",
          "精酿",
          "highball",
          "朝日",
          "青岛啤酒",
          "伏特加",
          "金酒",
          "琴酒",
          "朗姆酒",
          "龙舌兰",
          "白兰地",
          "干邑",
          "波本",
          "黑麦威士忌",
          "梅斯卡尔",
          "利口酒",
          "力娇酒",
          "苦艾酒",
          "味美思",
          "香槟",
          "起泡酒",
          "梅酒",
          "烧酒",
          "汤力水",
          "苏打水",
          "姜汁汽水",
          "姜汁啤酒"
        ],
        "aliases": [
          "whisky",
          "whiskey",
          "beer",
          "wine",
          "vodka",
          "gin",
          "rum",
          "tequila",
          "brandy",
          "cognac",
          "bourbon",
          "mezcal",
          "vermouth",
          "tonic",
          "tonicwater",
          "sodawater",
          "gingerale",
          "gingerbeer"
        ]
      }
    ]
  },
  {
    "name": "交通",
    "emoji": "🚕",
    "color": "#9bb3c1",
    "words": [
      "交通",
      "出行",
      "通勤"
    ],
    "aliases": [
      "transport"
    ],
    "subcategories": [
      {
        "name": "公共交通",
        "emoji": "🚇",
        "words": [
          "地铁",
          "公交",
          "公交车",
          "公交卡",
          "交通卡",
          "一卡通",
          "市民卡",
          "地铁票",
          "乘车码"
        ],
        "aliases": [
          "metro",
          "subway",
          "bus"
        ]
      },
      {
        "name": "打车",
        "emoji": "🚕",
        "words": [
          "打车",
          "出租车",
          "网约车",
          "滴滴",
          "高德打车",
          "曹操出行",
          "T3出行",
          "享道出行",
          "首汽约车"
        ],
        "aliases": [
          "didi",
          "taxi",
          "uber"
        ]
      },
      {
        "name": "骑行",
        "emoji": "🚲",
        "words": [
          "骑行",
          "单车",
          "共享单车",
          "哈啰单车",
          "美团单车",
          "青桔单车",
          "单车月卡",
          "骑行卡"
        ],
        "aliases": [
          "hello bike",
          "hellobike"
        ]
      },
      {
        "name": "长途交通",
        "emoji": "🚄",
        "words": [
          "高铁",
          "火车",
          "动车",
          "铁路",
          "火车票",
          "高铁票",
          "12306",
          "机票",
          "航班",
          "航空",
          "飞机票",
          "东方航空",
          "南方航空",
          "国航",
          "春秋航空",
          "长途交通"
        ],
        "aliases": [
          "railway",
          "flight"
        ]
      },
      {
        "name": "用车",
        "emoji": "🚗",
        "words": [
          "加油",
          "油费",
          "充电桩",
          "汽车充电",
          "停车",
          "停车费",
          "高速费",
          "过路费",
          "ETC",
          "洗车",
          "保养",
          "修车"
        ],
        "aliases": [
          "gas",
          "parking"
        ]
      }
    ]
  },
  {
    "name": "娱乐",
    "emoji": "🎮",
    "color": "#b3a0c0",
    "words": [
      "娱乐",
      "玩",
      "聚会"
    ],
    "aliases": [
      "entertainment"
    ],
    "subcategories": [
      {
        "name": "游戏",
        "emoji": "🎮",
        "words": [
          "游戏",
          "游戏充值",
          "游戏皮肤",
          "皮肤",
          "点券",
          "月卡",
          "通行证",
          "战令",
          "抽卡",
          "原神",
          "崩坏",
          "星穹铁道",
          "绝区零",
          "王者荣耀",
          "和平精英",
          "英雄联盟",
          "LOL",
          "Steam",
          "Epic",
          "PSN",
          "PlayStation",
          "Xbox",
          "Nintendo",
          "Switch游戏",
          "暴雪",
          "战网",
          "米哈游",
          "网易游戏",
          "腾讯游戏"
        ],
        "aliases": [
          "skin",
          "battlepass",
          "steam",
          "epicgames",
          "mihoyo",
          "hoyoverse"
        ]
      },
      {
        "name": "影视演出",
        "emoji": "🎬",
        "words": [
          "电影",
          "电影票",
          "电影院",
          "演唱会",
          "音乐节",
          "话剧",
          "舞台剧",
          "演出",
          "剧场",
          "脱口秀",
          "大麦",
          "猫眼电影",
          "淘票票"
        ],
        "aliases": [
          "cinema",
          "concert"
        ]
      },
      {
        "name": "线下娱乐",
        "emoji": "🎯",
        "words": [
          "KTV",
          "桌游",
          "密室",
          "剧本杀",
          "台球",
          "保龄球",
          "电玩",
          "抓娃娃",
          "游乐园",
          "酒吧",
          "清吧"
        ],
        "aliases": [
          "escape room",
          "karaoke"
        ]
      },
      {
        "name": "直播互动",
        "emoji": "🎁",
        "words": [
          "直播打赏",
          "直播礼物",
          "打赏",
          "抖音直播",
          "虎牙",
          "斗鱼",
          "B站充电"
        ],
        "aliases": [
          "donate"
        ]
      }
    ]
  },
  {
    "name": "购物",
    "emoji": "🛍️",
    "color": "#d7977c",
    "words": [
      "购物",
      "买东西",
      "网购",
      "商城"
    ],
    "aliases": [
      "shopping"
    ],
    "subcategories": [
      {
        "name": "日用家居",
        "emoji": "🧻",
        "words": [
          "日用品",
          "生活用品",
          "纸巾",
          "洗衣液",
          "洗发水",
          "沐浴露",
          "牙膏",
          "牙刷",
          "清洁用品",
          "便利店",
          "名创优品",
          "无印良品",
          "家具",
          "家居",
          "床品",
          "被子",
          "枕头",
          "收纳",
          "宜家",
          "IKEA",
          "家居日用"
        ],
        "aliases": [
          "miniso",
          "muji",
          "ikea"
        ]
      },
      {
        "name": "服饰鞋包",
        "emoji": "👕",
        "words": [
          "衣服",
          "裤子",
          "外套",
          "鞋",
          "鞋子",
          "袜子",
          "内衣",
          "包包",
          "服装",
          "优衣库",
          "ZARA",
          "H&M",
          "Nike",
          "Adidas"
        ],
        "aliases": [
          "uniqlo",
          "nike",
          "adidas"
        ]
      },
      {
        "name": "数码家电",
        "emoji": "💻",
        "words": [
          "手机",
          "电脑",
          "平板",
          "耳机",
          "键盘",
          "鼠标",
          "显示器",
          "充电器",
          "数据线",
          "家电",
          "苹果店",
          "Apple Store",
          "小米之家",
          "华为商城"
        ],
        "aliases": [
          "applestore",
          "xiaomi",
          "huawei"
        ]
      },
      {
        "name": "美妆个护",
        "emoji": "🧴",
        "words": [
          "护肤",
          "护肤品",
          "化妆品",
          "洗面奶",
          "面膜",
          "防晒",
          "精华",
          "面霜",
          "香水",
          "口红",
          "理发",
          "剪头发",
          "美发"
        ],
        "aliases": [
          "skincare",
          "sephora"
        ]
      },
      {
        "name": "其他购物",
        "emoji": "📦",
        "words": [
          "拼多多",
          "淘宝",
          "天猫",
          "京东",
          "京喜",
          "唯品会",
          "抖音商城",
          "小红书商城",
          "苏宁易购",
          "得物",
          "闲鱼",
          "亚马逊",
          "TEMU"
        ],
        "aliases": [
          "pdd",
          "taobao",
          "tmall",
          "jd",
          "vipshop",
          "amazon"
        ]
      }
    ]
  },
  {
    "name": "居住",
    "emoji": "🏠",
    "color": "#597968",
    "words": [
      "居住",
      "住房"
    ],
    "aliases": [
      "housing"
    ],
    "subcategories": [
      {
        "name": "房租房贷",
        "emoji": "🏠",
        "words": [
          "房租",
          "租金",
          "租房",
          "房贷",
          "月供"
        ],
        "aliases": [
          "rent",
          "mortgage"
        ]
      },
      {
        "name": "物业管理",
        "emoji": "🏢",
        "words": [
          "物业",
          "物业费",
          "管理费",
          "车位管理费"
        ],
        "aliases": [
          "property fee"
        ]
      },
      {
        "name": "家庭维修",
        "emoji": "🛠️",
        "words": [
          "维修",
          "家电维修",
          "开锁",
          "换锁",
          "疏通",
          "修水管",
          "修空调",
          "搬家"
        ],
        "aliases": [
          "repair"
        ]
      },
      {
        "name": "水电燃气",
        "emoji": "💡",
        "words": [
          "水费",
          "电费",
          "水电费",
          "燃气",
          "燃气费",
          "天然气",
          "煤气费",
          "水电燃气",
          "国家电网",
          "供电局"
        ],
        "aliases": [
          "electricity",
          "utility bill"
        ]
      },
      {
        "name": "通信网络",
        "emoji": "📶",
        "words": [
          "话费",
          "话费充值",
          "手机话费",
          "流量包",
          "手机流量",
          "中国移动",
          "中国联通",
          "中国电信",
          "移动话费",
          "联通话费",
          "电信话费",
          "宽带",
          "宽带费",
          "网费",
          "网络费",
          "家庭宽带",
          "光纤",
          "有线电视",
          "通信费",
          "手机费",
          "电话费"
        ],
        "aliases": [
          "mobile bill",
          "broadband",
          "internet bill"
        ]
      },
      {
        "name": "保险保障",
        "emoji": "🛡️",
        "words": [
          "保险",
          "保费",
          "医疗险",
          "意外险",
          "车险",
          "寿险",
          "重疾险"
        ],
        "aliases": [
          "insurance"
        ]
      },
      {
        "name": "政务服务",
        "emoji": "🏛️",
        "words": [
          "证件费",
          "行政费",
          "工本费",
          "签证费",
          "驾照换证",
          "护照办理"
        ],
        "aliases": [
          "government fee"
        ]
      }
    ]
  },
  {
    "name": "订阅服务",
    "emoji": "🔁",
    "color": "#7d91ad",
    "words": [
      "订阅服务"
    ],
    "aliases": [],
    "subcategories": [
      {
        "name": "数字工具",
        "emoji": "🧩",
        "words": [
          "ChatGPT",
          "ChatGPT Plus",
          "GPT",
          "GPT充值",
          "OpenAI",
          "Claude",
          "Claude Pro",
          "Gemini",
          "Gemini Advanced",
          "Perplexity",
          "Perplexity Pro",
          "Cursor",
          "Copilot",
          "GitHub Copilot",
          "Midjourney",
          "DeepSeek",
          "Kimi会员",
          "软件会员",
          "WPS会员",
          "WPS超级会员",
          "Microsoft 365",
          "Office 365",
          "Adobe",
          "Adobe Creative Cloud",
          "Notion",
          "Notion Plus",
          "Canva",
          "Canva Pro",
          "迅雷会员",
          "夸克会员",
          "扫描全能王",
          "VPN",
          "VPN订阅",
          "机场",
          "机场订阅",
          "Clash",
          "Clash订阅",
          "节点订阅",
          "代理服务",
          "网络代理",
          "加速器订阅",
          "Shadowrocket",
          "Shadowrocket订阅"
        ],
        "aliases": [
          "chatgpt",
          "gptplus",
          "claudepro",
          "geminiadvanced",
          "perplexitypro",
          "githubcopilot",
          "midjourney",
          "wps",
          "microsoft365",
          "office365",
          "adobecc",
          "notionplus",
          "canvapro",
          "vpn",
          "proxy",
          "clash",
          "shadowrocket"
        ]
      },
      {
        "name": "影音会员",
        "emoji": "🎬",
        "words": [
          "视频会员",
          "腾讯视频",
          "腾讯视频VIP",
          "爱奇艺",
          "爱奇艺VIP",
          "优酷",
          "优酷会员",
          "芒果TV",
          "B站大会员",
          "哔哩哔哩大会员",
          "Netflix",
          "Disney+",
          "YouTube Premium",
          "音乐会员",
          "网易云会员",
          "网易云黑胶",
          "QQ音乐会员",
          "QQ音乐绿钻",
          "Spotify",
          "Apple Music",
          "汽水音乐会员",
          "影音会员"
        ],
        "aliases": [
          "iqiyi",
          "youku",
          "mangotv",
          "bilibili大会员",
          "netflix",
          "disneyplus",
          "youtubepremium",
          "spotify",
          "applemusic",
          "qqmusic"
        ]
      },
      {
        "name": "平台会员",
        "emoji": "🛒",
        "words": [
          "淘宝会员",
          "淘宝88会员",
          "淘宝88VIP",
          "88会员",
          "88VIP",
          "天猫会员",
          "京东PLUS",
          "京东PLUS会员",
          "京东会员",
          "美团会员",
          "饿了么会员",
          "超级吃货卡",
          "小红书会员",
          "得物会员",
          "山姆会员"
        ],
        "aliases": [
          "taobao88vip",
          "88vip",
          "jdplus",
          "jingdongplus"
        ]
      },
      {
        "name": "云存储",
        "emoji": "☁️",
        "words": [
          "iCloud",
          "iCloud+",
          "Google One",
          "OneDrive",
          "Dropbox",
          "百度网盘会员",
          "百度网盘SVIP",
          "阿里云盘会员",
          "天翼云盘会员"
        ],
        "aliases": [
          "icloud",
          "googleone",
          "onedrive",
          "dropbox",
          "baidupan"
        ]
      },
      {
        "name": "其他订阅",
        "emoji": "🔁",
        "words": [
          "VIP",
          "会员",
          "订阅",
          "续费",
          "自动续费",
          "年费会员",
          "月费会员"
        ],
        "aliases": [
          "vip",
          "subscription",
          "membership"
        ]
      }
    ]
  },
  {
    "name": "医疗",
    "emoji": "💊",
    "color": "#c78282",
    "words": [
      "医疗"
    ],
    "aliases": [
      "healthcare"
    ],
    "subcategories": [
      {
        "name": "药品",
        "emoji": "💊",
        "words": [
          "买药",
          "药店",
          "药房",
          "药品",
          "处方药",
          "感冒药",
          "退烧药",
          "止痛药"
        ],
        "aliases": [
          "pharmacy"
        ]
      },
      {
        "name": "就医检查",
        "emoji": "🏥",
        "words": [
          "挂号",
          "门诊",
          "医院",
          "看病",
          "检查",
          "体检",
          "化验",
          "验血",
          "拍片",
          "CT",
          "核磁",
          "皮肤科",
          "皮肤病",
          "牙科",
          "看牙",
          "洗牙",
          "补牙",
          "拔牙",
          "牙医",
          "正畸",
          "眼科",
          "验光",
          "配眼镜",
          "眼镜",
          "隐形眼镜",
          "美瞳",
          "就医"
        ],
        "aliases": [
          "clinic",
          "checkup",
          "dentist",
          "optical"
        ]
      },
      {
        "name": "保健补剂",
        "emoji": "🧴",
        "words": [
          "保健品",
          "补剂",
          "鱼油",
          "维生素",
          "肌酸",
          "蛋白粉",
          "益生菌"
        ],
        "aliases": [
          "supplement"
        ]
      }
    ]
  },
  {
    "name": "学习",
    "emoji": "📚",
    "color": "#97a487",
    "words": [
      "学习",
      "教育"
    ],
    "aliases": [
      "education"
    ],
    "subcategories": [
      {
        "name": "图书文具",
        "emoji": "📚",
        "words": [
          "书",
          "图书",
          "教材",
          "电子书",
          "文具",
          "笔记本",
          "打印",
          "复印"
        ],
        "aliases": [
          "book",
          "kindle"
        ]
      },
      {
        "name": "课程学费",
        "emoji": "🎓",
        "words": [
          "课程",
          "网课",
          "培训",
          "培训班",
          "健身课",
          "语言课",
          "慕课",
          "得到课程",
          "学费",
          "住宿费",
          "学校缴费",
          "教材费",
          "课程费",
          "培训费"
        ],
        "aliases": [
          "course",
          "udemy",
          "coursera",
          "tuition"
        ]
      },
      {
        "name": "考试证书",
        "emoji": "📝",
        "words": [
          "考试费",
          "报名费",
          "考试报名",
          "证书费",
          "雅思",
          "托福",
          "GRE",
          "考研报名"
        ],
        "aliases": [
          "ielts",
          "toefl"
        ]
      }
    ]
  },
  {
    "name": "旅行",
    "emoji": "🧳",
    "color": "#7faaa6",
    "words": [
      "旅行",
      "旅游",
      "出游",
      "度假"
    ],
    "aliases": [
      "travel"
    ],
    "subcategories": [
      {
        "name": "住宿",
        "emoji": "🏨",
        "words": [
          "酒店",
          "宾馆",
          "民宿",
          "住宿",
          "青旅",
          "携程酒店",
          "飞猪酒店"
        ],
        "aliases": [
          "airbnb",
          "hotel",
          "booking"
        ]
      },
      {
        "name": "景点活动",
        "emoji": "🎫",
        "words": [
          "景点",
          "门票",
          "景区",
          "博物馆门票",
          "乐园门票",
          "旅行活动",
          "游玩项目",
          "体验项目"
        ],
        "aliases": [
          "ticket"
        ]
      },
      {
        "name": "旅行服务",
        "emoji": "🗺️",
        "words": [
          "旅行团",
          "导游",
          "行李寄存",
          "旅行保险",
          "租车",
          "境外上网卡"
        ],
        "aliases": [
          "tour",
          "rentalcar"
        ]
      }
    ]
  },
  {
    "name": "收入",
    "emoji": "💰",
    "color": "#689378",
    "words": [
      "收入",
      "进账",
      "到账",
      "入账",
      "收款"
    ],
    "aliases": [
      "income"
    ],
    "subcategories": [
      {
        "name": "工资薪酬",
        "emoji": "💰",
        "words": [
          "工资",
          "薪水",
          "薪资",
          "发工资",
          "实习工资",
          "劳务费",
          "工资到账",
          "补发工资",
          "薪酬",
          "实习费",
          "劳务收入"
        ],
        "aliases": [
          "salary",
          "payroll"
        ]
      },
      {
        "name": "奖金补贴",
        "emoji": "🧧",
        "words": [
          "奖金",
          "补贴",
          "津贴",
          "绩效",
          "年终奖",
          "奖学金",
          "助学金",
          "奖励",
          "绩效奖",
          "补助"
        ],
        "aliases": [
          "bonus"
        ]
      },
      {
        "name": "报销退款",
        "emoji": "↩️",
        "words": [
          "报销",
          "退款",
          "退货退款",
          "返现",
          "差旅报销",
          "退押金",
          "押金退回",
          "退税",
          "退款到账",
          "报销到账"
        ],
        "aliases": [
          "refund",
          "reimbursement"
        ]
      },
      {
        "name": "兼职副业",
        "emoji": "💼",
        "words": [
          "兼职",
          "副业",
          "稿费",
          "咨询费",
          "外快",
          "项目款",
          "项目费",
          "提成",
          "佣金",
          "兼职收入",
          "副业收入",
          "接单",
          "接单收入"
        ],
        "aliases": [
          "freelance"
        ]
      },
      {
        "name": "理财收益",
        "emoji": "📈",
        "words": [
          "利息",
          "分红",
          "理财收益",
          "基金分红",
          "股息",
          "收益",
          "存款利息",
          "理财利息",
          "投资收益"
        ],
        "aliases": [
          "dividend",
          "interest"
        ]
      },
      {
        "name": "转入所得",
        "emoji": "💸",
        "words": [
          "收红包",
          "收到红包",
          "转入",
          "收款",
          "收到转账",
          "转账收入",
          "转我",
          "转给我",
          "到账",
          "入账",
          "进账",
          "闲鱼卖出",
          "闲鱼收入",
          "二手卖出",
          "二手出售",
          "卖掉",
          "卖了",
          "回血",
          "二手回血"
        ],
        "aliases": [
          "transferin"
        ]
      }
    ]
  },
  {
    "name": "其他",
    "emoji": "💸",
    "color": "#c6c9be",
    "words": [],
    "aliases": [],
    "subcategories": [
      {
        "name": "人情礼金",
        "emoji": "🎁",
        "words": [
          "礼金",
          "份子钱",
          "红包支出",
          "随礼",
          "礼物",
          "送礼"
        ],
        "aliases": [
          "gift"
        ]
      },
      {
        "name": "手续费用",
        "emoji": "🏦",
        "words": [
          "手续费",
          "服务费",
          "银行手续费",
          "跨境手续费"
        ],
        "aliases": [
          "fee"
        ]
      },
      {
        "name": "捐赠公益",
        "emoji": "❤️",
        "words": [
          "捐款",
          "捐赠",
          "公益",
          "慈善"
        ],
        "aliases": [
          "donation"
        ]
      },
      {
        "name": "其他支出",
        "emoji": "💸",
        "words": [],
        "aliases": []
      }
    ]
  }
];

export const LEGACY_CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
  咖啡饮品: { category: "餐饮", subcategory: "饮料" },
  生活缴费: { category: "居住", subcategory: "" },
};

export const LEGACY_PAIR_MAP: Record<string, { category: string; subcategory: string }> = {
  "餐饮::咖啡饮品": { category: "餐饮", subcategory: "饮料" },
  "餐饮::奶茶茶饮": { category: "餐饮", subcategory: "饮料" },
  "餐饮::零食烘焙": { category: "餐饮", subcategory: "零食甜品" },
  "交通::公交地铁": { category: "交通", subcategory: "公共交通" },
  "交通::火车高铁": { category: "交通", subcategory: "长途交通" },
  "交通::飞机": { category: "交通", subcategory: "长途交通" },
  "交通::驾车用车": { category: "交通", subcategory: "用车" },
  "娱乐::电影演出": { category: "娱乐", subcategory: "影视演出" },
  "娱乐::直播打赏": { category: "娱乐", subcategory: "直播互动" },
  "购物::电商购物": { category: "购物", subcategory: "其他购物" },
  "购物::日用百货": { category: "购物", subcategory: "日用家居" },
  "购物::家居用品": { category: "购物", subcategory: "日用家居" },
  "生活缴费::水电燃气": { category: "居住", subcategory: "水电燃气" },
  "生活缴费::话费流量": { category: "居住", subcategory: "通信网络" },
  "生活缴费::宽带网络": { category: "居住", subcategory: "通信网络" },
  "生活缴费::保险保障": { category: "居住", subcategory: "保险保障" },
  "生活缴费::政务服务": { category: "居住", subcategory: "政务服务" },
  "订阅服务::AI工具": { category: "订阅服务", subcategory: "数字工具" },
  "订阅服务::软件会员": { category: "订阅服务", subcategory: "数字工具" },
  "订阅服务::视频会员": { category: "订阅服务", subcategory: "影音会员" },
  "订阅服务::音乐会员": { category: "订阅服务", subcategory: "影音会员" },
  "医疗::门诊检查": { category: "医疗", subcategory: "就医检查" },
  "医疗::牙科": { category: "医疗", subcategory: "就医检查" },
  "医疗::眼科": { category: "医疗", subcategory: "就医检查" },
  "学习::课程培训": { category: "学习", subcategory: "课程学费" },
  "学习::学费": { category: "学习", subcategory: "课程学费" },
  "旅行::景点门票": { category: "旅行", subcategory: "景点活动" },
  "收入::红包转入": { category: "收入", subcategory: "转入所得" },
  "其他::手续费": { category: "其他", subcategory: "手续费用" },
};

export const getCategory = (name: string) => {
  const canonical = LEGACY_CATEGORY_MAP[name]?.category ?? name;
  return categories.find((c) => c.name === canonical) ?? categories[categories.length - 1];
};

export const getSubcategories = (category: string) =>
  getCategory(category).subcategories ?? [];

export const normalizeCategoryPair = (category: string, subcategory = "") => {
  const legacyPair = LEGACY_PAIR_MAP[`${category}::${subcategory}`];
  if (legacyPair) return legacyPair;
  const legacy = LEGACY_CATEGORY_MAP[category];
  if (legacy && !subcategory) return legacy;
  const canonical = legacy?.category ?? getCategory(category).name;
  const allowed = getSubcategories(canonical);
  const normalizedSubcategory = allowed.some((s) => s.name === subcategory) ? subcategory : "";
  return { category: canonical, subcategory: normalizedSubcategory };
};

export const getDisplayEmoji = (category: string, subcategory = "") => {
  const pair = normalizeCategoryPair(category, subcategory);
  const sub = getSubcategories(pair.category).find((s) => s.name === pair.subcategory);
  return sub?.emoji ?? getCategory(pair.category).emoji;
};

export const accounts = ["未指定", "微信", "支付宝", "银行卡", "现金", "其他"];

export const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/￥/g, "¥");
