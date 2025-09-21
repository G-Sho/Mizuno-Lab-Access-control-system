// アプリケーション定数
export const APP_CONFIG = {
  name: '入退室管理',
  fullName: '研究室入退室管理システム',
  organization: '工学院大学 水野研究室',
  description: '工学院大学 水野研究室 Slack ワークスペース限定',
  iconPath: '/image/1000002408.jpg'
} as const;

// 部屋タイプ定数
export const ROOM_TYPES = {
  ROOM_2218: 'room2218',
  GRAD_ROOM: 'gradRoom'
} as const;

// 部屋表示名
export const ROOM_DISPLAY_NAMES = {
  [ROOM_TYPES.ROOM_2218]: '2218号室',
  [ROOM_TYPES.GRAD_ROOM]: '院生部屋'
} as const;

// ユーザーステータス
export const USER_STATUS = {
  IN_ROOM: 'inRoom',
  OUT_ROOM: 'outRoom',
  HAS_KEY: 'hasKey'
} as const;

// メッセージ定数
export const MESSAGES = {
  AUTH: {
    LOADING: '認証処理中...',
    LOGIN_BUTTON: 'Slackでログイン'
  },
  ROOM: {
    ENTER: '入室',
    EXIT: '退室',
    TAKE_KEY: '鍵を取る',
    RETURN_KEY: '鍵を返す'
  },
  STATUS: {
    WELCOME: (name: string) => `ようこそ、${name}さん`,
    NO_USERS: '現在誰もいません',
    CURRENT_STATUS: '現在の状況',
    ACTIVITY_HISTORY: '活動履歴'
  },
  LOGOUT: 'ログアウト'
} as const;

// スタイル定数
export const STYLE_CLASSES = {
  GRADIENT_BG: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100',
  CARD: 'bg-white rounded-lg shadow-lg',
  BUTTON_PRIMARY: 'bg-purple-600 text-white hover:bg-purple-700 transition-colors',
  BUTTON_SECONDARY: 'bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors',
  TEXT_PRIMARY: 'text-gray-800',
  TEXT_SECONDARY: 'text-gray-600',
  TEXT_ACCENT: 'text-purple-600'
} as const;