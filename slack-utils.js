import https from 'https';
import { URL } from 'url';

/**
 * SlackのIncoming Webhook URLにメッセージを送信
 * @param {string} message - 送信するメッセージ
 * @param {object} options - オプション設定
 */
export const sendSlackMessage = async (message, options = {}) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl || webhookUrl === 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL') {
    console.log('Slack Webhook URL not configured, skipping Slack notification');
    return { success: false, reason: 'webhook_not_configured' };
  }

  const payload = {
    text: message,
    username: options.username || '研究室入退室システム',
    icon_emoji: options.icon || ':office:',
    channel: options.channel || undefined
  };

  return new Promise((resolve) => {
    const url = new URL(webhookUrl);
    const postData = JSON.stringify(payload);

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Slack message sent successfully:', message);
          resolve({ success: true, response: responseData });
        } else {
          console.error('Slack send failed:', res.statusCode, responseData);
          resolve({ success: false, error: responseData, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Slack request error:', error);
      resolve({ success: false, error: error.message });
    });

    req.write(postData);
    req.end();
  });
};

/**
 * 入退室メッセージをフォーマット
 * @param {object} logEntry - ログエントリ
 * @param {object} user - ユーザー情報
 */
export const formatAttendanceMessage = (logEntry, user = {}) => {
  const { userName, action, room, timestamp } = logEntry;
  
  // 絵文字マッピング
  const actionEmojis = {
    '入室': '🚪➡️',
    '退室': '🚪⬅️',
    '鍵取得': '🔑➡️',
    '鍵返却': '🔑⬅️'
  };
  
  const roomEmojis = {
    '2218室': '🏢',
    '院生室': '👥'
  };
  
  const emoji = actionEmojis[action] || '📝';
  const roomEmoji = roomEmojis[room] || '🏠';
  
  // 基本メッセージ
  let message = `${emoji} ${userName} が ${roomEmoji}${room} に ${action}しました`;
  
  // 時刻追加
  message += `\n⏰ ${timestamp}`;
  
  // プロバイダー情報追加（OAuth認証の場合）
  if (user.provider && user.provider !== 'manual') {
    const providerEmojis = {
      'google': '🔴',
      'slack': '💬'
    };
    const providerEmoji = providerEmojis[user.provider] || '🔐';
    message += `\n${providerEmoji} ${user.provider}認証`;
  }
  
  return message;
};

/**
 * 鍵管理メッセージをフォーマット
 * @param {object} logEntry - ログエントリ
 * @param {object} user - ユーザー情報
 * @param {string} keyLocation - 現在の鍵の所在
 */
export const formatKeyMessage = (logEntry, user = {}, keyLocation = '') => {
  const baseMessage = formatAttendanceMessage(logEntry, user);
  
  if (keyLocation && keyLocation !== '詰所') {
    return baseMessage + `\n🔑 鍵の現在地: ${keyLocation}`;
  } else {
    return baseMessage + '\n🔑 鍵の現在地: 詰所';
  }
};

/**
 * 在室状況の概要メッセージを作成
 * @param {array} room2218Users - 2218室在室者
 * @param {array} gradRoomUsers - 院生室在室者
 * @param {object} keyHolder - 鍵保持者
 */
export const formatStatusSummary = (room2218Users, gradRoomUsers, keyHolder) => {
  let message = '📊 現在の研究室状況\n';
  
  // 2218室
  message += `🏢 2218室 (${room2218Users.length}人): `;
  if (room2218Users.length === 0) {
    message += '誰もいません';
  } else {
    message += room2218Users.map(u => u.name).join(', ');
  }
  
  // 院生室
  message += `\n👥 院生室 (${gradRoomUsers.length}人): `;
  if (gradRoomUsers.length === 0) {
    message += '誰もいません';
  } else {
    message += gradRoomUsers.map(u => u.name).join(', ');
  }
  
  // 鍵の所在
  message += `\n🔑 鍵の所在: ${keyHolder ? keyHolder.name : '詰所'}`;
  
  return message;
};