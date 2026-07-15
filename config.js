/**
 * =====================================================================
 * DPRO 写真館・フォトスタジオ LINE
 * STEP STUDIO-4 共通設定・共通ユーティリティ
 * Version: STUDIO-4-CONFIG-20260714
 * =====================================================================
 *
 * GitHub配置ファイル名:
 *   config.js
 *
 * GitHub Pages:
 *   https://dpromstk2000-lab.github.io/dpro-photo-studio-line/config.js
 *
 * Cloudflare Worker:
 *   https://dpro-photo-studio-line-api.dpromstk2000.workers.dev
 *
 * 注意:
 *   - SUPABASE_SERVICE_ROLE_KEYなどの秘密情報は絶対に記載しない。
 *   - 管理コード1234は営業デモ用。本番ではCloudflare側のADMIN_CODEを変更する。
 *   - 通常URLでは管理コードを自動保存しない。
 *   - demo=1付きの管理系画面だけ、デモ管理コードをsessionStorageへ自動設定する。
 *   - 各HTMLでは画面固有スクリプトより先に本ファイルを読み込む。
 *
 * 読み込み例:
 *   <script src="./config.js?v=STUDIO-4-CONFIG-20260714"></script>
 * =====================================================================
 */

(function initializeDproPhotoStudioConfig(global) {
  "use strict";

  const VERSION = "STUDIO-4-CONFIG-20260714";
  const WORKER_VERSION = "STUDIO-3-WORKER-API-20260714";
  const API_BASE_URL =
    "https://dpro-photo-studio-line-api.dpromstk2000.workers.dev";
  const SITE_BASE_URL =
    "https://dpromstk2000-lab.github.io/dpro-photo-studio-line";
  const REPOSITORY_URL =
    "https://github.com/dpromstk2000-lab/dpro-photo-studio-line";
  const STUDIO_CODE = "dpro_photo_demo";
  const APP_NAME = "DPRO 写真館・フォトスタジオ LINE";
  const STUDIO_NAME = "DPROフォトスタジオ";
  const SUBTITLE =
    "写真館・フォトスタジオ向け 撮影予約・事前ヒアリング・写真セレクト案内システム";
  const DEFAULT_TIMEZONE = "Asia/Tokyo";
  const LOCALE = "ja-JP";
  const DEFAULT_ADMIN_CODE = "1234";
  const SLOT_MINUTES = 30;
  const REQUEST_TIMEOUT_MS = 20000;

  const APP = Object.freeze({
    serviceName: APP_NAME,
    studioName: STUDIO_NAME,
    subtitle: SUBTITLE,
    appVersion: VERSION,
    workerVersion: WORKER_VERSION,
    studioCode: STUDIO_CODE,
    timezone: DEFAULT_TIMEZONE,
    locale: LOCALE,
    slotMinutes: SLOT_MINUTES,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    adminCodeDemo: DEFAULT_ADMIN_CODE,
    productionGuardRequired: true,
    photoStorageCreated: false,
  });

  const PAGES = Object.freeze({
    INDEX: "index.html",
    MEMBER: "member.html",
    OWNER: "owner.html",
    STAFF: "staff.html",
    OWNER_IPAD: "owner-ipad.html",
    SYSTEM_CHECK: "system-check.html",
    CONFIG: "config.js",
  });

  const PAGE_URLS = Object.freeze({
    INDEX: `${SITE_BASE_URL}/${PAGES.INDEX}`,
    MEMBER: `${SITE_BASE_URL}/${PAGES.MEMBER}`,
    OWNER: `${SITE_BASE_URL}/${PAGES.OWNER}`,
    STAFF: `${SITE_BASE_URL}/${PAGES.STAFF}`,
    OWNER_IPAD: `${SITE_BASE_URL}/${PAGES.OWNER_IPAD}`,
    SYSTEM_CHECK: `${SITE_BASE_URL}/${PAGES.SYSTEM_CHECK}`,
    CONFIG: `${SITE_BASE_URL}/${PAGES.CONFIG}`,
  });

  const URLS = Object.freeze({
    siteBase: SITE_BASE_URL,
    workerBase: API_BASE_URL,
    repository: REPOSITORY_URL,
    index: PAGE_URLS.INDEX,
    member: PAGE_URLS.MEMBER,
    owner: PAGE_URLS.OWNER,
    staff: PAGE_URLS.STAFF,
    ownerIpad: PAGE_URLS.OWNER_IPAD,
    systemCheck: PAGE_URLS.SYSTEM_CHECK,
    config: PAGE_URLS.CONFIG,
    workerRoot: `${API_BASE_URL}/`,
    workerHealth: `${API_BASE_URL}/api/health`,
    workerRoutes: `${API_BASE_URL}/api/routes`,
  });

  const ENDPOINTS = Object.freeze({
    ROOT: "/",
    ROUTES: "/api/routes",
    HEALTH: "/api/health",

    PUBLIC_CONFIG: "/api/public/config",
    PUBLIC_PLANS: "/api/public/plans",
    PUBLIC_RESERVATION_OPTIONS: "/api/public/reservation-options",
    PUBLIC_AVAILABILITY: "/api/public/availability",
    PUBLIC_RESERVATIONS: "/api/public/reservations",
    PUBLIC_CHANGE_REQUEST: "/api/public/change-request",
    PUBLIC_CANCEL_REQUEST: "/api/public/cancel-request",
    PUBLIC_CONTACT: "/api/public/contact",
    PUBLIC_REORDER_REQUEST: "/api/public/reorder-request",

    MEMBER_PROFILE: "/api/member/profile",
    MEMBER_RESERVATIONS: "/api/member/reservations",

    ADMIN_VERIFY: "/api/admin/verify",
    ADMIN_DEMO_PREPARE: "/api/admin/demo/prepare",
    ADMIN_PHONE_NORMALIZE_CHECK: "/api/admin/phone-normalize-check",
    ADMIN_DASHBOARD: "/api/admin/dashboard",
    ADMIN_DAY: "/api/admin/day",
    ADMIN_RESERVATIONS: "/api/admin/reservations",
    ADMIN_SEARCH: "/api/admin/search",
    ADMIN_CUSTOMER_DETAIL: "/api/admin/customer-detail",
    ADMIN_RESERVATION_DETAIL: "/api/admin/reservation-detail",
    ADMIN_MANUAL_RESERVATION: "/api/admin/reservations/manual-create",
    ADMIN_RESERVATION_STATUS: "/api/admin/reservations/status",
    ADMIN_ASSIGN_STAFF: "/api/admin/reservations/assign-staff",
    ADMIN_SHOOTING_RECORD_SAVE: "/api/admin/shooting-records/save",
    ADMIN_SELECTION_GUIDE_SAVE: "/api/admin/selection-guides/save",
    ADMIN_SELECTION_GUIDE_STATUS: "/api/admin/selection-guides/status",
    ADMIN_DELIVERY_SAVE: "/api/admin/delivery/save",
    ADMIN_DELIVERY_STATUS: "/api/admin/delivery/status",
    ADMIN_REORDER_STATUS: "/api/admin/reorder/status",
    ADMIN_TASK_STATUS: "/api/admin/tasks/status",
    ADMIN_MESSAGE_LOG_COPY: "/api/admin/messages/log-copy",
    ADMIN_SETTINGS: "/api/admin/settings",
    ADMIN_SETTINGS_SAVE: "/api/admin/settings/save",

    STAFF_TODAY: "/api/staff/today",
    STAFF_RESERVATION_STATUS: "/api/staff/reservations/status",
    STAFF_SHOOTING_RECORD_SAVE: "/api/staff/shooting-records/save",
    STAFF_TASK_STATUS: "/api/staff/tasks/status",
    STAFF_MESSAGE_LOG_COPY: "/api/staff/messages/log-copy",

    IPAD_TODAY: "/api/ipad/today",
    IPAD_RESERVATION_STATUS: "/api/ipad/reservations/status",
    IPAD_MESSAGE_LOG_COPY: "/api/ipad/messages/log-copy",
  });

  const STORAGE_KEYS = Object.freeze({
    ADMIN_CODE: "dpro_studio_admin_code",
    LINE_USER_ID: "dpro_studio_line_user_id",
    MEMBER_PHONE: "dpro_studio_member_phone",
    CUSTOMER_NO: "dpro_studio_customer_no",
    PUBLIC_TOKEN: "dpro_studio_public_token",
    LAST_CUSTOMER_ID: "dpro_studio_last_customer_id",
    LAST_RESERVATION_ID: "dpro_studio_last_reservation_id",
    SELECTED_DATE: "dpro_studio_selected_date",
    STAFF_ID: "dpro_studio_staff_id",
    OPERATOR_NAME: "dpro_studio_operator_name",
    DEVICE_TYPE: "dpro_studio_device_type",
  });

  const PAGE_LABELS = Object.freeze({
    INDEX: "お客様向け撮影予約",
    MEMBER: "お客様マイページ",
    OWNER: "写真館PC管理",
    STAFF: "カメラマン・スタッフ",
    OWNER_IPAD: "受付iPad",
    SYSTEM_CHECK: "営業前システムチェック",
    CONFIG: "共通設定",
  });

  const RESERVATION_STATUS_LABELS = Object.freeze({
    reserved: "予約受付",
    confirmed: "予約確定",
    change_requested: "変更希望",
    cancel_requested: "キャンセル希望",
    cancelled: "キャンセル",
    no_show: "来店なし",
  });

  const VISIT_STATUS_LABELS = Object.freeze({
    scheduled: "来店予定",
    arrived: "受付済み",
    preparing: "衣装・撮影準備中",
    shooting: "撮影中",
    selecting_on_site: "店頭セレクト案内中",
    checkout_guidance: "会計・納品案内待ち",
    completed: "当日対応完了",
  });

  const POST_STATUS_LABELS = Object.freeze({
    selection_pending: "セレクト案内準備中",
    selection_guided: "セレクト案内済み",
    selected: "写真選択済み",
    retouching: "レタッチ・制作中",
    delivery_preparing: "納品準備中",
    delivered: "納品完了",
    reorder_follow: "再注文フォロー中",
    closed: "対応完了",
  });

  const GUIDE_STATUS_LABELS = Object.freeze({
    draft: "下書き",
    ready: "案内準備完了",
    guided: "案内済み",
    selected: "選択完了",
    expired: "期限超過",
    closed: "完了",
  });

  const DELIVERY_STATUS_LABELS = Object.freeze({
    not_started: "未着手",
    preparing: "準備中",
    ready: "納品可能",
    guided: "納品案内済み",
    delivered: "納品完了",
    cancelled: "中止",
  });

  const DELIVERY_TYPE_LABELS = Object.freeze({
    data: "写真データ",
    print: "プリント",
    album: "アルバム",
    mount: "台紙",
    both: "データ・商品両方",
    other: "その他",
  });

  const DELIVERY_METHOD_LABELS = Object.freeze({
    line_download: "LINE・ダウンロード案内",
    store_pickup: "店頭受取",
    shipping: "配送",
    external_service: "外部サービス",
    other: "その他",
  });

  const REORDER_TYPE_LABELS = Object.freeze({
    data_addition: "データ追加",
    print_addition: "プリント追加",
    album: "アルバム相談",
    mount: "台紙相談",
    size_change: "サイズ変更",
    family_delivery: "ご家族分追加",
    other: "その他",
  });

  const REORDER_STATUS_LABELS = Object.freeze({
    received: "受付済み",
    contacted: "連絡済み",
    estimating: "見積・確認中",
    accepted: "注文確定",
    completed: "完了",
    cancelled: "取り下げ",
  });

  const TASK_STATUS_LABELS = Object.freeze({
    open: "未対応",
    in_progress: "対応中",
    done: "対応済み",
    cancelled: "取消",
  });

  const TASK_TYPE_LABELS = Object.freeze({
    reservation_confirm: "予約確認",
    belongings_guide: "持ち物案内",
    visit_reminder: "来店前案内",
    change_request_reply: "変更希望へ返信",
    cancel_request_reply: "キャンセル希望へ返信",
    selection_guide: "セレクト案内",
    selection_deadline: "セレクト期限確認",
    delivery_schedule: "納品予定案内",
    delivery_complete: "納品完了案内",
    reorder_follow: "再注文フォロー",
    album_proposal: "アルバム提案",
    review_request: "口コミ・感想依頼",
    other: "その他",
  });

  const PRIORITY_LABELS = Object.freeze({
    low: "低",
    normal: "通常",
    high: "高",
    urgent: "至急",
  });

  const SUBJECT_TYPE_LABELS = Object.freeze({
    person: "人物",
    child: "子ども",
    baby: "乳幼児",
    pet: "ペット",
    product: "商品",
    group: "家族・団体",
    other: "その他",
  });

  const STAFF_ROLE_LABELS = Object.freeze({
    owner: "オーナー",
    manager: "店長・管理者",
    photographer: "カメラマン",
    reception: "受付",
    assistant: "アシスタント",
  });

  const RESOURCE_TYPE_LABELS = Object.freeze({
    studio_room: "撮影スタジオ",
    profile_booth: "プロフィール・証明写真ブース",
    dressing_room: "着付け・更衣スペース",
    outdoor: "屋外撮影枠",
    mobile: "出張撮影枠",
    other: "その他",
  });

  const SOURCE_LABELS = Object.freeze({
    line: "LINE予約",
    phone: "電話予約",
    store: "店頭予約",
    admin: "管理画面登録",
    demo: "営業デモ",
  });

  const LABELS = Object.freeze({
    pages: PAGE_LABELS,
    reservationStatus: RESERVATION_STATUS_LABELS,
    visitStatus: VISIT_STATUS_LABELS,
    postStatus: POST_STATUS_LABELS,
    guideStatus: GUIDE_STATUS_LABELS,
    deliveryStatus: DELIVERY_STATUS_LABELS,
    deliveryType: DELIVERY_TYPE_LABELS,
    deliveryMethod: DELIVERY_METHOD_LABELS,
    reorderType: REORDER_TYPE_LABELS,
    reorderStatus: REORDER_STATUS_LABELS,
    taskStatus: TASK_STATUS_LABELS,
    taskType: TASK_TYPE_LABELS,
    priority: PRIORITY_LABELS,
    subjectType: SUBJECT_TYPE_LABELS,
    staffRole: STAFF_ROLE_LABELS,
    resourceType: RESOURCE_TYPE_LABELS,
    source: SOURCE_LABELS,
  });

  const VISIT_STATUS_FLOW = Object.freeze([
    "scheduled",
    "arrived",
    "preparing",
    "shooting",
    "selecting_on_site",
    "checkout_guidance",
    "completed",
  ]);

  const POST_STATUS_FLOW = Object.freeze([
    "selection_pending",
    "selection_guided",
    "selected",
    "retouching",
    "delivery_preparing",
    "delivered",
    "reorder_follow",
    "closed",
  ]);

  const DEMO = Object.freeze({
    enabledQueryKey: "demo",
    enabledQueryValue: "1",
    adminCode: DEFAULT_ADMIN_CODE,
    customer: Object.freeze({
      customerNo: "PHOTO-DEMO-001",
      customerName: "佐藤 美咲",
      phone: "090-9999-1111",
      lineUserId: "demo_photo_line_001",
    }),
    reservation: Object.freeze({
      reservationNo: "PHOTO-DEMO-R001",
      planName: "七五三撮影",
      staffName: "田中カメラマン",
    }),
    testCustomer: Object.freeze({
      customerNo: "PHOTO-DEMO-999",
      customerName: "テスト 顧客",
      phone: "090-9999-0000",
      lineUserId: "demo_photo_line_999",
    }),
  });

  const DEMO_ADMIN_PAGES = Object.freeze([
    PAGES.OWNER,
    PAGES.STAFF,
    PAGES.OWNER_IPAD,
    PAGES.SYSTEM_CHECK,
  ]);

  class DproStudioApiError extends Error {
    constructor(message, options = {}) {
      super(message || "通信中にエラーが発生しました。");
      this.name = "DproStudioApiError";
      this.status = Number(options.status || 0);
      this.code = String(options.code || "API_ERROR");
      this.details = options.details ?? null;
      this.payload = options.payload ?? null;
      this.isNetworkError = Boolean(options.isNetworkError);
      this.isTimeout = Boolean(options.isTimeout);
    }
  }

  function normalizeBaseUrl(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function normalizePath(value) {
    const path = String(value || "").trim();
    if (!path) return "/";
    return path.startsWith("/") ? path : `/${path}`;
  }

  function resolveEndpoint(endpointOrPath) {
    const key = String(endpointOrPath || "").trim();
    return ENDPOINTS[key] || normalizePath(key);
  }

  function appendQuery(url, query = {}) {
    Object.entries(query || {}).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        Number.isNaN(value)
      ) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined && item !== null && item !== "") {
            url.searchParams.append(key, String(item));
          }
        });
        return;
      }

      url.searchParams.set(key, String(value));
    });

    return url;
  }

  function buildApiUrl(endpointOrPath, query = {}) {
    const path = resolveEndpoint(endpointOrPath);
    const url = new URL(`${normalizeBaseUrl(API_BASE_URL)}${path}`);
    return appendQuery(url, query).toString();
  }

  function resolvePageUrl(pageOrKey) {
    const key = String(pageOrKey || "").trim();
    if (PAGE_URLS[key]) return PAGE_URLS[key];
    if (PAGES[key]) return `${SITE_BASE_URL}/${PAGES[key]}`;
    if (/^https?:\/\//i.test(key)) return key;
    const fileName = key || PAGES.INDEX;
    return `${SITE_BASE_URL}/${fileName.replace(/^\/+/, "")}`;
  }

  function buildPageUrl(pageOrKey, query = {}) {
    const url = new URL(resolvePageUrl(pageOrKey));
    return appendQuery(url, query).toString();
  }

  function buildDemoPageUrl(pageOrKey, query = {}) {
    return buildPageUrl(pageOrKey, {
      ...query,
      [DEMO.enabledQueryKey]: DEMO.enabledQueryValue,
    });
  }

  function getCurrentUrl() {
    try {
      return new URL(global.location.href);
    } catch {
      return new URL(PAGE_URLS.INDEX);
    }
  }

  function getCurrentPageName() {
    const pathname = getCurrentUrl().pathname;
    const pageName = pathname.split("/").filter(Boolean).pop() || PAGES.INDEX;
    return pageName.includes(".") ? pageName : PAGES.INDEX;
  }

  function isDemoMode(value) {
    let url;
    try {
      url = value ? new URL(String(value), getCurrentUrl()) : getCurrentUrl();
    } catch {
      return false;
    }

    const raw = String(url.searchParams.get(DEMO.enabledQueryKey) || "")
      .trim()
      .toLowerCase();
    return ["1", "true", "yes", "on"].includes(raw);
  }

  function getStorage(type = "local") {
    try {
      return type === "session" ? global.sessionStorage : global.localStorage;
    } catch {
      return null;
    }
  }

  function isAllowedStorageKey(key) {
    return Object.values(STORAGE_KEYS).includes(key);
  }

  function getStoredValue(key, fallback = "", type = "local") {
    if (!isAllowedStorageKey(key)) return fallback;
    try {
      const value = getStorage(type)?.getItem(key);
      return value === null || value === undefined ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function setStoredValue(key, value, type = "local") {
    if (!isAllowedStorageKey(key)) {
      throw new Error("許可されていない保存キーです。");
    }

    const storage = getStorage(type);
    if (!storage) return false;

    try {
      if (value === undefined || value === null || value === "") {
        storage.removeItem(key);
      } else {
        storage.setItem(key, String(value));
      }
      return true;
    } catch {
      return false;
    }
  }

  function removeStoredValue(key, type = "local") {
    if (!isAllowedStorageKey(key)) return false;
    try {
      getStorage(type)?.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function getAdminCode() {
    return String(
      getStoredValue(STORAGE_KEYS.ADMIN_CODE, "", "local") ||
        getStoredValue(STORAGE_KEYS.ADMIN_CODE, "", "session") ||
        "",
    ).trim();
  }

  function saveAdminCode(adminCode, options = {}) {
    const normalized = String(adminCode || "").trim();
    if (!normalized) {
      throw new Error("管理コードを入力してください。");
    }

    const storageType = options.sessionOnly === true ? "session" : "local";
    const otherType = storageType === "session" ? "local" : "session";

    if (!setStoredValue(STORAGE_KEYS.ADMIN_CODE, normalized, storageType)) {
      throw new Error("管理コードを保存できませんでした。");
    }
    removeStoredValue(STORAGE_KEYS.ADMIN_CODE, otherType);
    dispatchEvent("dpro-studio:admin-code-changed", {
      saved: true,
      storageType,
    });
    return normalized;
  }

  function clearAdminCode() {
    removeStoredValue(STORAGE_KEYS.ADMIN_CODE, "local");
    removeStoredValue(STORAGE_KEYS.ADMIN_CODE, "session");
    dispatchEvent("dpro-studio:admin-code-changed", { saved: false });
  }

  function hasAdminCode() {
    return Boolean(getAdminCode());
  }

  function requireAdminCode() {
    const adminCode = getAdminCode();
    if (!adminCode) {
      throw new DproStudioApiError(
        "管理コードが保存されていません。管理コードを入力してください。",
        { status: 401, code: "ADMIN_CODE_REQUIRED" },
      );
    }
    return adminCode;
  }

  function applyDemoAdminCode(options = {}) {
    const force = options.force === true;
    const currentPage = getCurrentPageName();

    if (!force && !isDemoMode()) return false;
    if (!force && !DEMO_ADMIN_PAGES.includes(currentPage)) return false;

    try {
      saveAdminCode(DEMO.adminCode, { sessionOnly: true });
      return true;
    } catch {
      return false;
    }
  }

  function toHalfWidth(value) {
    return String(value ?? "")
      .replace(/[！-～]/g, (character) =>
        String.fromCharCode(character.charCodeAt(0) - 0xfee0),
      )
      .replace(/　/g, " ");
  }

  function normalizePhone(value) {
    let phone = toHalfWidth(value)
      .replace(/[‐‑‒–—―ー−ｰ]/g, "-")
      .replace(/[^\d+]/g, "");

    if (phone.startsWith("+81")) {
      phone = `0${phone.slice(3)}`;
    } else if (phone.startsWith("0081")) {
      phone = `0${phone.slice(4)}`;
    } else if (/^81[1-9]\d{8,9}$/.test(phone)) {
      phone = `0${phone.slice(2)}`;
    }

    return phone.replace(/\D/g, "");
  }

  function isLikelyJapanesePhone(value) {
    return /^0\d{9,10}$/.test(normalizePhone(value));
  }

  function formatPhone(value) {
    const phone = normalizePhone(value);
    if (!phone) return "";

    if (/^(050|070|080|090)\d{8}$/.test(phone)) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
    }
    if (/^0120\d{6}$/.test(phone)) {
      return `${phone.slice(0, 4)}-${phone.slice(4, 7)}-${phone.slice(7)}`;
    }
    if (/^0\d{9}$/.test(phone)) {
      return `${phone.slice(0, 2)}-${phone.slice(2, 6)}-${phone.slice(6)}`;
    }
    if (/^0\d{10}$/.test(phone)) {
      return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
    }
    return phone;
  }

  function normalizeLineBreaks(value) {
    return String(value ?? "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n?/g, "\n");
  }

  function normalizeWhitespace(value) {
    return normalizeLineBreaks(value)
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseDate(value) {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const text = String(value ?? "").trim();
    if (!text) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const date = new Date(`${text}T12:00:00+09:00`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(text.includes(" ") ? text.replace(" ", "T") : text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateParts(value, timeZone = DEFAULT_TIMEZONE) {
    const date = parseDate(value);
    if (!date) return null;

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);

    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  }

  function toDateInputValue(value) {
    const parts = dateParts(value);
    return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
  }

  function todayYmd() {
    return toDateInputValue(new Date());
  }

  function formatDate(value, options = {}) {
    const date = parseDate(value);
    if (!date) return options.fallback ?? "";

    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: options.timeZone || DEFAULT_TIMEZONE,
      year: options.year || "numeric",
      month: options.month || "numeric",
      day: options.day || "numeric",
      weekday: options.weekday,
    }).format(date);
  }

  function formatTime(value, options = {}) {
    const date = parseDate(value);
    if (!date) return options.fallback ?? "";

    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: options.timeZone || DEFAULT_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  function formatDateTime(value, options = {}) {
    const date = parseDate(value);
    if (!date) return options.fallback ?? "";

    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: options.timeZone || DEFAULT_TIMEZONE,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: options.weekday === false ? undefined : "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  function toJstIso(dateValue, timeValue) {
    const date = String(dateValue || "").trim();
    const time = String(timeValue || "").trim().slice(0, 5);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("日付はYYYY-MM-DD形式で指定してください。");
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      throw new Error("時刻はHH:MM形式で指定してください。");
    }

    const [hour, minute] = time.split(":").map(Number);
    if (hour > 23 || minute > 59) {
      throw new Error("時刻を確認してください。");
    }
    if (![0, SLOT_MINUTES].includes(minute)) {
      throw new Error("予約開始時刻は00分または30分で指定してください。");
    }

    const parsed = new Date(`${date}T${time}:00+09:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("予約日時を確認してください。");
    }
    return parsed.toISOString();
  }

  function addDays(dateValue, amount) {
    const dateText = /^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ""))
      ? String(dateValue)
      : toDateInputValue(dateValue);
    if (!dateText) return "";

    const date = new Date(`${dateText}T12:00:00+09:00`);
    date.setUTCDate(date.getUTCDate() + Number(amount || 0));
    return toDateInputValue(date);
  }

  function getLabel(group, value, fallback = "") {
    const labels = LABELS[group];
    if (!labels) return fallback || String(value ?? "");
    return labels[value] || fallback || String(value ?? "");
  }

  function nextStatus(flow, currentStatus) {
    const statuses = Array.isArray(flow) ? flow : [];
    const index = statuses.indexOf(currentStatus);
    return index >= 0 && index < statuses.length - 1
      ? statuses[index + 1]
      : null;
  }

  function getNextVisitStatus(currentStatus) {
    return nextStatus(VISIT_STATUS_FLOW, currentStatus);
  }

  function getNextPostStatus(currentStatus) {
    return nextStatus(POST_STATUS_FLOW, currentStatus);
  }

  function dispatchEvent(name, detail = {}) {
    try {
      if (typeof global.dispatchEvent === "function") {
        global.dispatchEvent(new CustomEvent(name, { detail }));
      }
    } catch {
      // CustomEvent非対応環境では通知だけ省略する。
    }
  }

  async function copyText(value) {
    const text = String(value ?? "");
    if (!text) {
      throw new Error("コピーする内容がありません。");
    }

    if (global.navigator?.clipboard?.writeText) {
      await global.navigator.clipboard.writeText(text);
      return true;
    }

    if (!global.document?.body) {
      throw new Error("この環境ではコピーできません。");
    }

    const textarea = global.document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    global.document.body.appendChild(textarea);
    textarea.select();

    let copied = false;
    try {
      copied = Boolean(global.document.execCommand("copy"));
    } finally {
      textarea.remove();
    }

    if (!copied) {
      throw new Error("コピーできませんでした。長押ししてコピーしてください。");
    }
    return true;
  }

  function sleep(milliseconds) {
    return new Promise((resolve) => global.setTimeout(resolve, milliseconds));
  }

  function debounce(callback, wait = 300) {
    let timeoutId = null;
    return function debounced(...args) {
      global.clearTimeout(timeoutId);
      timeoutId = global.setTimeout(() => callback.apply(this, args), wait);
    };
  }

  async function apiFetch(endpointOrPath, options = {}) {
    const {
      method = "GET",
      query = {},
      body,
      admin = false,
      adminCode,
      timeoutMs = REQUEST_TIMEOUT_MS,
      headers = {},
      signal,
      cache = "no-store",
    } = options;

    const requestHeaders = new Headers(headers);
    requestHeaders.set("Accept", "application/json");

    const isFormData =
      typeof global.FormData !== "undefined" && body instanceof global.FormData;
    if (body !== undefined && !isFormData) {
      requestHeaders.set("Content-Type", "application/json");
    }

    if (admin) {
      const code = String(adminCode || getAdminCode()).trim();
      if (!code) {
        throw new DproStudioApiError(
          "管理コードが保存されていません。管理コードを入力してください。",
          { status: 401, code: "ADMIN_CODE_REQUIRED" },
        );
      }
      requestHeaders.set("X-Admin-Code", code);
    }

    const timeoutController = new AbortController();
    const timeoutId = global.setTimeout(() => {
      timeoutController.abort();
    }, Number(timeoutMs || REQUEST_TIMEOUT_MS));

    if (signal) {
      if (signal.aborted) {
        timeoutController.abort();
      } else {
        signal.addEventListener("abort", () => timeoutController.abort(), {
          once: true,
        });
      }
    }

    let response;
    try {
      response = await fetch(buildApiUrl(endpointOrPath, query), {
        method: String(method).toUpperCase(),
        headers: requestHeaders,
        body:
          body === undefined
            ? undefined
            : isFormData
              ? body
              : JSON.stringify(body),
        signal: timeoutController.signal,
        cache,
      });
    } catch (error) {
      const isTimeout = timeoutController.signal.aborted;
      throw new DproStudioApiError(
        isTimeout
          ? "API通信がタイムアウトしました。もう一度お試しください。"
          : "APIへ接続できませんでした。通信環境とWorker URLを確認してください。",
        {
          status: 0,
          code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
          details: error?.message || null,
          isNetworkError: !isTimeout,
          isTimeout,
        },
      );
    } finally {
      global.clearTimeout(timeoutId);
    }

    const contentType = response.headers.get("content-type") || "";
    let payload = null;

    if (contentType.includes("application/json")) {
      payload = await response.json().catch(() => null);
    } else {
      const rawText = await response.text().catch(() => "");
      payload = rawText ? { rawText } : null;
    }

    if (!response.ok || payload?.ok === false) {
      const message =
        payload?.error ||
        payload?.message ||
        `通信に失敗しました（HTTP ${response.status}）`;
      throw new DproStudioApiError(message, {
        status: response.status,
        code: payload?.code || `HTTP_${response.status}`,
        details: payload?.details ?? null,
        payload,
      });
    }

    return payload;
  }

  function apiGet(endpointOrPath, query = {}, options = {}) {
    return apiFetch(endpointOrPath, {
      ...options,
      method: "GET",
      query,
    });
  }

  function apiPost(endpointOrPath, body = {}, options = {}) {
    return apiFetch(endpointOrPath, {
      ...options,
      method: "POST",
      body,
    });
  }

  function adminGet(endpointOrPath, query = {}, options = {}) {
    return apiGet(endpointOrPath, query, { ...options, admin: true });
  }

  function adminPost(endpointOrPath, body = {}, options = {}) {
    return apiPost(endpointOrPath, body, { ...options, admin: true });
  }

  function verifyAdminCode(adminCode) {
    return apiPost(
      ENDPOINTS.ADMIN_VERIFY,
      {},
      { admin: true, adminCode: String(adminCode || "").trim() },
    );
  }

  function getMemberLookupFromUrl() {
    const url = getCurrentUrl();
    return {
      line_user_id:
        url.searchParams.get("line_user_id") ||
        getStoredValue(STORAGE_KEYS.LINE_USER_ID),
      public_token:
        url.searchParams.get("public_token") ||
        getStoredValue(STORAGE_KEYS.PUBLIC_TOKEN),
      phone:
        url.searchParams.get("phone") ||
        getStoredValue(STORAGE_KEYS.MEMBER_PHONE),
      customer_no:
        url.searchParams.get("customer_no") ||
        getStoredValue(STORAGE_KEYS.CUSTOMER_NO),
    };
  }

  const demoAdminCodeApplied = applyDemoAdminCode();

  const CONFIG = Object.freeze({
    VERSION,
    WORKER_VERSION,
    API_BASE_URL,
    SITE_BASE_URL,
    REPOSITORY_URL,
    STUDIO_CODE,
    APP_NAME,
    STUDIO_NAME,
    SUBTITLE,
    DEFAULT_TIMEZONE,
    TIMEZONE: DEFAULT_TIMEZONE,
    LOCALE,
    DEFAULT_ADMIN_CODE,
    SLOT_MINUTES,
    REQUEST_TIMEOUT_MS,

    APP,
    URLS,
    PAGES,
    PAGE_URLS,
    ENDPOINTS,
    STORAGE_KEYS,
    LABELS,
    VISIT_STATUS_FLOW,
    POST_STATUS_FLOW,
    DEMO,
    DEMO_ADMIN_PAGES,
    RUNTIME: Object.freeze({
      demoMode: isDemoMode(),
      currentPage: getCurrentPageName(),
      demoAdminCodeApplied,
    }),

    DproStudioApiError,

    normalizeBaseUrl,
    normalizePath,
    resolveEndpoint,
    buildApiUrl,
    resolvePageUrl,
    buildPageUrl,
    buildDemoPageUrl,
    getCurrentUrl,
    getCurrentPageName,
    isDemoMode,

    getStoredValue,
    setStoredValue,
    removeStoredValue,
    getAdminCode,
    saveAdminCode,
    clearAdminCode,
    hasAdminCode,
    requireAdminCode,
    applyDemoAdminCode,

    toHalfWidth,
    normalizePhone,
    isLikelyJapanesePhone,
    formatPhone,
    normalizeLineBreaks,
    normalizeWhitespace,
    escapeHtml,

    parseDate,
    toDateInputValue,
    todayYmd,
    formatDate,
    formatTime,
    formatDateTime,
    toJstIso,
    addDays,

    getLabel,
    getNextVisitStatus,
    getNextPostStatus,
    copyText,
    sleep,
    debounce,

    apiFetch,
    apiGet,
    apiPost,
    adminGet,
    adminPost,
    verifyAdminCode,
    getMemberLookupFromUrl,
  });

  global.DPRO_STUDIO = CONFIG;
  global.DPRO_PHOTO_STUDIO_CONFIG = CONFIG;

  dispatchEvent("dpro-studio:config-ready", {
    version: VERSION,
    studioCode: STUDIO_CODE,
    demoMode: CONFIG.RUNTIME.demoMode,
    currentPage: CONFIG.RUNTIME.currentPage,
  });
})(window);
