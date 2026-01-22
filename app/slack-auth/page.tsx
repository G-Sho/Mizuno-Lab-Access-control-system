'use client';

import { useEffect, useState } from 'react';

const AUTH_RESULT_KEY = 'slackAuthResult';

export default function SlackAuthRelayPage() {
  const [message, setMessage] = useState('認証処理を完了しています...');

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);
    const payloadParam = hashParams.get('payload') || searchParams.get('payload');

    if (!payloadParam) {
      setMessage('認証情報が見つかりませんでした。タブを閉じて再度お試しください。');
      return;
    }

    try {
      const payload = JSON.parse(decodeURIComponent(payloadParam));
      localStorage.setItem(AUTH_RESULT_KEY, JSON.stringify(payload));

      if (window.opener) {
        try {
          window.opener.postMessage(payload, window.location.origin);
        } catch (error) {
          // ignore postMessage failures
        }
      }

      setMessage('認証が完了しました。ウィンドウを閉じています...');
      setTimeout(() => {
        window.close();
        window.location.replace('/');
      }, 500);
    } catch (error) {
      setMessage('認証情報の処理に失敗しました。タブを閉じて再度お試しください。');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow rounded-lg p-6 text-center text-gray-700 max-w-md">
        <h1 className="text-lg font-semibold mb-2">Slack認証</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}
