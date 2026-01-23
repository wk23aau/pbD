/*
* Copyright (c) F-Secure Corporation. All rights reserved.
* See license terms for the related product.
*/

const NativeMessagingHostName = "com.fsecure.netprot.nativehost";

const Colors = {
    bgColor: {
        light: "rgba(255, 255, 255, 1)",
        dark: "rgba(28, 28, 30, 1)"
    },
    fontColor: {
        light: "rgba(22, 22, 22, 1)",
        dark: "rgba(255, 255, 255, 1)"
    },
    borderColor: {
        light: "rgba(206, 206, 206, 1)",
        dark: "rgba(58, 58, 60, 1)"
    },
    link: {
        light: "rgba(0, 60, 255, 1)",
        dark: "rgba(153, 177, 255, 1)"
    }
};

const LocalizedCategories = {
    abortion: "category_abortion",
    adserving: "category_adserving",
    adult: "category_adult",
    alcohol_and_tobacco: "category_alcohol_and_tobacco",
    anonymizers: "category_anonymizers",
    auctions: "category_auctions",
    banking: "category_banking",
    blogs: "category_blogs",
    chat: "category_chat",
    dating: "category_dating",
    disturbing: "category_disturbing",
    drugs: "category_drugs",
    entertainment: "category_entertainment",
    file_sharing: "category_file_sharing",
    forum: "category_forum",
    gambling: "category_gambling",
    games: "category_games",
    hacking: "category_hacking",
    hate: "category_hate",
    illegal: "category_illegal",
    job_search: "category_job_search",
    paymentservice: "category_payment_services",
    scam: "category_scam",
    search_engines: "category_search_engines",
    shopping: "category_shopping",
    shopping_and_auctions: "category_shopping_and_auctions",
    social_networking: "category_social_networks",
    software_download: "category_software_downloads",
    spam: "category_spam",
    streaming_media: "category_streaming_media",
    travel: "category_travel",
    unknown: "category_unknown",
    violence: "category_violence",
    warez: "category_illegal_downloads",
    weapons: "category_weapons",
    webmail: "category_webmail"
};

const OnboardingUrl = "onboarding/onboarding.html";
const ScanRequestType = Object.freeze({
    Invalid:            -1,
    Undefined:          0,
    Primary:            1, // Legacy products support this
    Secondary:          2, // Deprecated
    PrimaryNoBanking:   3,
    Banking:            4, // products/extensions without HEAD check use this
    CustomMessage:      5,
    BankingPreview:     6, // products/extensions with additional HEAD check use this (PBL-3236)
    BankingTrigger:     7  // products/extensions with additional HEAD check use this (PBL-3236)
});

const MessageName = Object.freeze({
    AdBlock:               "adblock",
    AdBlockStatus:         "adblockStatus",
    AllowDomain:           "allowdomain",
    BankingSessionActive:  "BankingActive",
    BlockData:             "BlockData",
    CheckWhitelist:        "checkwhitelist",
    ConsentDecline:        "ConsentDecline",
    DebugInfo:             "DebugInfo",
    DebugMode:             "DebugMode",
    DevToolsOpened:        "DevToolsOpened",
    GetBankingMode:        "GetBankingMode",
    GetPlatformInfo:       "GetPlatformInfo",
    Init:                  "init",
    ORSPInfo:              "orspinfo",
    OpenExceptions:        "openexceptions",
    PaymentFormFound:      "PaymentFormFound",
    Popup:                 "popup",
    Referrer:              "referrer",
    RequestURLReputation:  "RequestURLReputation",
    ScanRequest:           "scanrequest",
    SchemaChanged:         "SchemaChanged",
    SetConsent:            "SetConsentToTrue",
    ShoppingWebsite:       "ShoppingWebsite",
    TabInfo:               "tabinfo",
    Infopopup:             "infopopup",
    UserRating:            "userRating",
    GetPageInfo:           "getPageInfo",
    SavePageInfo:          "savePageInfo",
    IframesRemoved:        "IframesRemoved",
    ConsentRejected:       "ConsentRejected",
    RatingRequest:         "ratingrequest",
    SaveToLog:             "SaveToLog",
    DisplayUrl:            "displayUrl"
});

const IconType = Object.freeze({
    Globe: "globe",
    Shopping: "shopping",
    Banking: "banking",
    Invalid: "invalid"
});

const StatusType = Object.freeze({
    Allowed:                "allowed",
    Banking:                "banking",
    Category:               "category",
    Child:                  "child",
    Denied:                 "denied",
    General:                "general",
    Harmful:                "harmful",
    Illegal:                "illegal",
    Invalid:                "invalid",
    NotAvailable:           "notAvailable",
    Safe:                   "safe",
    Suspicious:             "suspicious",
    TrustedShopping1:       "shopping1",
    TrustedShopping2:       "shopping2",
    TrustedShopping3:       "shopping3",
    TrustedShopping4:       "shopping4",
    TrustedShopping5:       "shopping5",
    TrustedShoppingCaution: "trustedShoppingCaution",
    TrustedShoppingRisky:   "trustedShoppingRisky",
    TrustedShoppingSuspicious: "trustedShoppingSuspicious",
    TrustedShoppingUnsafe:  "trustedShoppingUnsafe",
    Unknown:                "unknown"
});

const BlockPages = Object.freeze({
    [StatusType.Banking]:    "block_pages/block_banking.html",
    [StatusType.Category]:   "block_pages/block_category.html",
    [StatusType.Child]:      "block_pages/block_child.html",
    [StatusType.Denied]:     "block_pages/block_denied.html",
    [StatusType.General]:    "block_pages/block_general.html",
    [StatusType.Harmful]:    "block_pages/block_harmful.html",
    [StatusType.Illegal]:    "block_pages/block_illegal.html",
    [StatusType.Suspicious]: "block_pages/block_suspicious.html",
    [StatusType.TrustedShoppingUnsafe]:  "block_pages/block_trusted_shopping.html"
});

const BlockPageAction = Object.freeze({
    Allow:          "allow_request",
    CheckWhitelist: "allow_check",
    OpenExceptions: "open_ui:lists"
});

const TabAction = Object.freeze({
    Close:      "close",
    Complete:   "complete",
    Open:       "open"
});

const Schema = Object.freeze({
    Light: "schema_light",
    Dark:  "schema_dark"
});

const InitResult = Object.freeze({
    Success: "init_success",
    Failure: "init_failure"
});

const ConnectionStatus = Object.freeze({
    Unknown:      "unknown",
    NotConnected: "notConnected",
    Connected:    "connected"
});

const ExtensionIconsLightOk = Object.freeze({
    "128":       "../img/128_icon_lightmode.png"
});

const ExtensionIconsDarkOk = Object.freeze({
    "128":       "../img/128_icon_darkmode.png"
});

const ExtensionIconsLightError = Object.freeze({
    "128":       "../img/128_icon_error_lightmode.png"
});

const ExtensionIconsDarkError = Object.freeze({
    "128":       "../img/128_icon_error_darkmode.png"
});

const LanguageMap = {
    'bg': 'bgr',
    'cs': 'csy',
    'da': 'dan',
    'de': 'deu',
    'el': 'ell',
    'en': 'eng',
    'en_GB': 'eng',
    'es': 'esn',
    'es_419': 'esm',
    'et': 'eti',
    'fi': 'fin',
    'fr': 'fra',
    'fr_CA': 'frc',
    'hr': 'hrv',
    'hu': 'hun',
    'it': 'ita',
    'ja': 'jpn',
    'ko': 'kor',
    'lt': 'lth',
    'nl': 'nld',
    'no': 'nor',
    'pl': 'plk',
    'pt': 'ptg',
    'pt_BR': 'ptb',
    'ro': 'rom',
    'ru': 'rus',
    'sl': 'slv',
    'sr': 'srp',
    'sv': 'sve',
    'tr': 'trk',
    'vi': 'vit',
    'zh': 'cht',
    'zh_HK': 'zhh',
    'zh_TW': 'chs'
};

const YoutubeUrls = [
    "https://www.youtube.com/*", "https://m.youtube.com/*", "https://youtube.googleapis.com/*",
    "https://youtubei.googleapis.com/*", "https://youtube-nocookie.com/*"
];

const SearchUrls = [
    "*://www.youtube.com/*",
    "*://*.google.com/*",
    "*://*.google.ad/*",
    "*://*.google.ae/*",
    "*://*.google.com.af/*",
    "*://*.google.com.ag/*",
    "*://*.google.com.ai/*",
    "*://*.google.al/*",
    "*://*.google.am/*",
    "*://*.google.co.ao/*",
    "*://*.google.com.ar/*",
    "*://*.google.as/*",
    "*://*.google.at/*",
    "*://*.google.com.au/*",
    "*://*.google.az/*",
    "*://*.google.ba/*",
    "*://*.google.com.bd/*",
    "*://*.google.be/*",
    "*://*.google.bf/*",
    "*://*.google.bg/*",
    "*://*.google.com.bh/*",
    "*://*.google.bi/*",
    "*://*.google.bj/*",
    "*://*.google.com.bn/*",
    "*://*.google.com.bo/*",
    "*://*.google.com.br/*",
    "*://*.google.bs/*",
    "*://*.google.bt/*",
    "*://*.google.co.bw/*",
    "*://*.google.by/*",
    "*://*.google.com.bz/*",
    "*://*.google.ca/*",
    "*://*.google.cd/*",
    "*://*.google.cf/*",
    "*://*.google.cg/*",
    "*://*.google.ch/*",
    "*://*.google.ci/*",
    "*://*.google.co.ck/*",
    "*://*.google.cl/*",
    "*://*.google.cm/*",
    "*://*.google.cn/*",
    "*://*.google.com.co/*",
    "*://*.google.co.cr/*",
    "*://*.google.com.cu/*",
    "*://*.google.cv/*",
    "*://*.google.com.cy/*",
    "*://*.google.cz/*",
    "*://*.google.de/*",
    "*://*.google.dj/*",
    "*://*.google.dk/*",
    "*://*.google.dm/*",
    "*://*.google.com.do/*",
    "*://*.google.dz/*",
    "*://*.google.com.ec/*",
    "*://*.google.ee/*",
    "*://*.google.com.eg/*",
    "*://*.google.es/*",
    "*://*.google.com.et/*",
    "*://*.google.fi/*",
    "*://*.google.com.fj/*",
    "*://*.google.fm/*",
    "*://*.google.fr/*",
    "*://*.google.ga/*",
    "*://*.google.ge/*",
    "*://*.google.gg/*",
    "*://*.google.com.gh/*",
    "*://*.google.com.gi/*",
    "*://*.google.gl/*",
    "*://*.google.gm/*",
    "*://*.google.gr/*",
    "*://*.google.com.gt/*",
    "*://*.google.gy/*",
    "*://*.google.com.hk/*",
    "*://*.google.hn/*",
    "*://*.google.hr/*",
    "*://*.google.ht/*",
    "*://*.google.hu/*",
    "*://*.google.co.id/*",
    "*://*.google.ie/*",
    "*://*.google.co.il/*",
    "*://*.google.im/*",
    "*://*.google.co.in/*",
    "*://*.google.iq/*",
    "*://*.google.is/*",
    "*://*.google.it/*",
    "*://*.google.je/*",
    "*://*.google.com.jm/*",
    "*://*.google.jo/*",
    "*://*.google.co.jp/*",
    "*://*.google.co.ke/*",
    "*://*.google.com.kh/*",
    "*://*.google.ki/*",
    "*://*.google.kg/*",
    "*://*.google.co.kr/*",
    "*://*.google.com.kw/*",
    "*://*.google.kz/*",
    "*://*.google.la/*",
    "*://*.google.com.lb/*",
    "*://*.google.li/*",
    "*://*.google.lk/*",
    "*://*.google.co.ls/*",
    "*://*.google.lt/*",
    "*://*.google.lu/*",
    "*://*.google.lv/*",
    "*://*.google.com.ly/*",
    "*://*.google.co.ma/*",
    "*://*.google.md/*",
    "*://*.google.me/*",
    "*://*.google.mg/*",
    "*://*.google.mk/*",
    "*://*.google.ml/*",
    "*://*.google.com.mm/*",
    "*://*.google.mn/*",
    "*://*.google.ms/*",
    "*://*.google.com.mt/*",
    "*://*.google.mu/*",
    "*://*.google.mv/*",
    "*://*.google.mw/*",
    "*://*.google.com.mx/*",
    "*://*.google.com.my/*",
    "*://*.google.co.mz/*",
    "*://*.google.com.na/*",
    "*://*.google.com.ng/*",
    "*://*.google.com.ni/*",
    "*://*.google.ne/*",
    "*://*.google.nl/*",
    "*://*.google.no/*",
    "*://*.google.com.np/*",
    "*://*.google.nr/*",
    "*://*.google.nu/*",
    "*://*.google.co.nz/*",
    "*://*.google.com.om/*",
    "*://*.google.com.pa/*",
    "*://*.google.com.pe/*",
    "*://*.google.com.pg/*",
    "*://*.google.com.ph/*",
    "*://*.google.com.pk/*",
    "*://*.google.pl/*",
    "*://*.google.pn/*",
    "*://*.google.com.pr/*",
    "*://*.google.ps/*",
    "*://*.google.pt/*",
    "*://*.google.com.py/*",
    "*://*.google.com.qa/*",
    "*://*.google.ro/*",
    "*://*.google.ru/*",
    "*://*.google.rw/*",
    "*://*.google.com.sa/*",
    "*://*.google.com.sb/*",
    "*://*.google.sc/*",
    "*://*.google.se/*",
    "*://*.google.com.sg/*",
    "*://*.google.sh/*",
    "*://*.google.si/*",
    "*://*.google.sk/*",
    "*://*.google.com.sl/*",
    "*://*.google.sn/*",
    "*://*.google.so/*",
    "*://*.google.sm/*",
    "*://*.google.sr/*",
    "*://*.google.st/*",
    "*://*.google.com.sv/*",
    "*://*.google.td/*",
    "*://*.google.tg/*",
    "*://*.google.co.th/*",
    "*://*.google.com.tj/*",
    "*://*.google.tl/*",
    "*://*.google.tm/*",
    "*://*.google.tn/*",
    "*://*.google.to/*",
    "*://*.google.com.tr/*",
    "*://*.google.tt/*",
    "*://*.google.com.tw/*",
    "*://*.google.co.tz/*",
    "*://*.google.com.ua/*",
    "*://*.google.co.ug/*",
    "*://*.google.co.uk/*",
    "*://*.google.com.uy/*",
    "*://*.google.co.uz/*",
    "*://*.google.com.vc/*",
    "*://*.google.co.ve/*",
    "*://*.google.vg/*",
    "*://*.google.co.vi/*",
    "*://*.google.com.vn/*",
    "*://*.google.vu/*",
    "*://*.google.ws/*",
    "*://*.google.rs/*",
    "*://*.google.co.za/*",
    "*://*.google.co.zm/*",
    "*://*.google.co.zw/*",
    "*://*.google.cat/*",
    "*://*.bing.com/*",
    "*://duckduckgo.com/*",
    "*://*.yahoo.com/*",
    "*://*.yahoo.co.jp/*"
];

const GoogleDomains = [
    "www.google.com",
    "www.google.ad",
    "www.google.ae",
    "www.google.com.af",
    "www.google.com.ag",
    "www.google.com.ai",
    "www.google.al",
    "www.google.am",
    "www.google.co.ao",
    "www.google.com.ar",
    "www.google.as",
    "www.google.at",
    "www.google.com.au",
    "www.google.az",
    "www.google.ba",
    "www.google.com.bd",
    "www.google.be",
    "www.google.bf",
    "www.google.bg",
    "www.google.com.bh",
    "www.google.bi",
    "www.google.bj",
    "www.google.com.bn",
    "www.google.com.bo",
    "www.google.com.br",
    "www.google.bs",
    "www.google.bt",
    "www.google.co.bw",
    "www.google.by",
    "www.google.com.bz",
    "www.google.ca",
    "www.google.cd",
    "www.google.cf",
    "www.google.cg",
    "www.google.ch",
    "www.google.ci",
    "www.google.co.ck",
    "www.google.cl",
    "www.google.cm",
    "www.google.cn",
    "www.google.com.co",
    "www.google.co.cr",
    "www.google.com.cu",
    "www.google.cv",
    "www.google.com.cy",
    "www.google.cz",
    "www.google.de",
    "www.google.dj",
    "www.google.dk",
    "www.google.dm",
    "www.google.com.do",
    "www.google.dz",
    "www.google.com.ec",
    "www.google.ee",
    "www.google.com.eg",
    "www.google.es",
    "www.google.com.et",
    "www.google.fi",
    "www.google.com.fj",
    "www.google.fm",
    "www.google.fr",
    "www.google.ga",
    "www.google.ge",
    "www.google.gg",
    "www.google.com.gh",
    "www.google.com.gi",
    "www.google.gl",
    "www.google.gm",
    "www.google.gr",
    "www.google.com.gt",
    "www.google.gy",
    "www.google.com.hk",
    "www.google.hn",
    "www.google.hr",
    "www.google.ht",
    "www.google.hu",
    "www.google.co.id",
    "www.google.ie",
    "www.google.co.il",
    "www.google.im",
    "www.google.co.in",
    "www.google.iq",
    "www.google.is",
    "www.google.it",
    "www.google.je",
    "www.google.com.jm",
    "www.google.jo",
    "www.google.co.jp",
    "www.google.co.ke",
    "www.google.com.kh",
    "www.google.ki",
    "www.google.kg",
    "www.google.co.kr",
    "www.google.com.kw",
    "www.google.kz",
    "www.google.la",
    "www.google.com.lb",
    "www.google.li",
    "www.google.lk",
    "www.google.co.ls",
    "www.google.lt",
    "www.google.lu",
    "www.google.lv",
    "www.google.com.ly",
    "www.google.co.ma",
    "www.google.md",
    "www.google.me",
    "www.google.mg",
    "www.google.mk",
    "www.google.ml",
    "www.google.com.mm",
    "www.google.mn",
    "www.google.ms",
    "www.google.com.mt",
    "www.google.mu",
    "www.google.mv",
    "www.google.mw",
    "www.google.com.mx",
    "www.google.com.my",
    "www.google.co.mz",
    "www.google.com.na",
    "www.google.com.ng",
    "www.google.com.ni",
    "www.google.ne",
    "www.google.nl",
    "www.google.no",
    "www.google.com.np",
    "www.google.nr",
    "www.google.nu",
    "www.google.co.nz",
    "www.google.com.om",
    "www.google.com.pa",
    "www.google.com.pe",
    "www.google.com.pg",
    "www.google.com.ph",
    "www.google.com.pk",
    "www.google.pl",
    "www.google.pn",
    "www.google.com.pr",
    "www.google.ps",
    "www.google.pt",
    "www.google.com.py",
    "www.google.com.qa",
    "www.google.ro",
    "www.google.ru",
    "www.google.rw",
    "www.google.com.sa",
    "www.google.com.sb",
    "www.google.sc",
    "www.google.se",
    "www.google.com.sg",
    "www.google.sh",
    "www.google.si",
    "www.google.sk",
    "www.google.com.sl",
    "www.google.sn",
    "www.google.so",
    "www.google.sm",
    "www.google.sr",
    "www.google.st",
    "www.google.com.sv",
    "www.google.td",
    "www.google.tg",
    "www.google.co.th",
    "www.google.com.tj",
    "www.google.tl",
    "www.google.tm",
    "www.google.tn",
    "www.google.to",
    "www.google.com.tr",
    "www.google.tt",
    "www.google.com.tw",
    "www.google.co.tz",
    "www.google.com.ua",
    "www.google.co.ug",
    "www.google.co.uk",
    "www.google.com.uy",
    "www.google.co.uz",
    "www.google.com.vc",
    "www.google.co.ve",
    "www.google.vg",
    "www.google.co.vi",
    "www.google.com.vn",
    "www.google.vu",
    "www.google.ws",
    "www.google.rs",
    "www.google.co.za",
    "www.google.co.zm",
    "www.google.co.zw",
    "www.google.cat"
];

const BingDomains = [
    "www.bing.com",
    "www2.bing.com",
    "www3.bing.com",
    "www4.bing.com"
];

const YahooDomains = [
    "search.yahoo.com",
    "yahoo.com"
];

const YahooDomainsJapan = [
    "search.yahoo.co.jp",
    "yahoo.co.jp"
];

const DuckDuckGoDomains = [
    "duckduckgo.com"
];

const BankCategories = [
    "banking",
    "paymentservice",
    "financial",
    "banking_login",
    "fso_banking",
    "fso_paymentservice"
];

const Emojis = [
    chrome.runtime.getURL("img/ic_emoji_status_1.png"),
    chrome.runtime.getURL("img/ic_emoji_status_2.png"),
    chrome.runtime.getURL("img/ic_emoji_status_3.png"),
    chrome.runtime.getURL("img/ic_emoji_status_4.png"),
    chrome.runtime.getURL("img/ic_emoji_status_5.png")
];

const ExtensionState = Object.freeze({
    Safe: 1,
    Danger: 2,
    Warn: 3,
    Unknown: 4,
    Info: 5,
    Banking: 6,
    TrustedShoppingWarning: 7,
    ConsentRequired: 8,
    Error: 9
});

const ExtensionStatusIcons = Object.freeze({
    Safe: {
        dark: chrome.runtime.getURL("img/ic_browsing_extension_dark_okay.png"),
        light: chrome.runtime.getURL("img/ic_browsing_extension_light_okay.png")
    },
    Warning: {
        dark: chrome.runtime.getURL("img/ic_browsing_extension_dark_warning.png"),
        light: chrome.runtime.getURL("img/ic_browsing_extension_light_warning.png")
    },
    Danger: {
        dark: chrome.runtime.getURL("img/ic_browsing_extension_dark_danger.png"),
        light: chrome.runtime.getURL("img/ic_browsing_extension_light_danger.png")
    },
    Unknown: {
        dark: chrome.runtime.getURL("img/ic_browsing_extension_dark_unknown.png"),
        light: chrome.runtime.getURL("img/ic_browsing_extension_light_unknown.png")
    },
    Info: {
        dark: chrome.runtime.getURL("img/ic_browsing_extension_dark_informative.png"),
        light: chrome.runtime.getURL("img/ic_browsing_extension_light_informative.png")
    }
});

const WebsiteTypeIcons = Object.freeze({
    website: {
        dark: chrome.runtime.getURL("img/fs_website_dark.svg"),
        light: chrome.runtime.getURL("img/fs_website_light.svg")
    },
    websiteWarning: {
        dark: chrome.runtime.getURL("img/fs_website_w_dark.svg"),
        light: chrome.runtime.getURL("img/fs_website_w_light.svg")
    },
    blocked: {
        dark: chrome.runtime.getURL("img/fs_block_dark.svg"),
        light: chrome.runtime.getURL("img/fs_block_light.svg")
    },
    banking: {
        dark: chrome.runtime.getURL("img/fs_banking_dark.svg"),
        light: chrome.runtime.getURL("img/fs_banking_light.svg")
    },
    shopping: {
        dark: chrome.runtime.getURL("img/fs_shopping_dark.svg"),
        light: chrome.runtime.getURL("img/fs_shopping_light.svg")
    },
    shoppingWarning: {
        dark: chrome.runtime.getURL("img/fs_shopping_w_dark.svg"),
        light: chrome.runtime.getURL("img/fs_shopping_w_light.svg")
    },
    websiteUnknown: {
        dark: chrome.runtime.getURL("img/fs_website_unknown_dark.svg"),
        light: chrome.runtime.getURL("img/fs_website_unknown_light.svg")
    },
    restricted: {
        dark: chrome.runtime.getURL("img/fs_restricted_dark.svg"),
        light: chrome.runtime.getURL("img/fs_restricted_light.svg")
    }
});

const PopupId = "fs-ols-notification-popup";