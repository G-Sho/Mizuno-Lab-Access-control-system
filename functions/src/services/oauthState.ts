import * as crypto from "crypto";
import { environment } from "../config/environment";

interface StatePayload {
  timestamp: number;
  randomValue: string;
}

export class OAuthStateService {
  private static instance: OAuthStateService;
  private readonly secret: string;
  private readonly expiryMinutes: number;

  private constructor() {
    const config = environment.getOAuth();
    this.secret = config.stateSecret;
    this.expiryMinutes = config.expiryMinutes;
  }

  public static getInstance(): OAuthStateService {
    if (!OAuthStateService.instance) {
      OAuthStateService.instance = new OAuthStateService();
    }
    return OAuthStateService.instance;
  }

  /**
   * セキュアなOAuth stateパラメータを生成
   */
  public generateState(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const randomValue = crypto.randomBytes(16).toString('hex');
    const payload = JSON.stringify({ timestamp, randomValue });

    // HMAC-SHA256でデジタル署名を作成
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');

    // Base64エンコードして返す
    return Buffer.from(`${payload}.${signature}`).toString('base64');
  }

  /**
   * OAuth stateパラメータを検証
   */
  public validateState(state: string): boolean {
    try {
      // Base64デコード
      const decoded = Buffer.from(state, 'base64').toString();
      const [payload, expectedSignature] = decoded.split('.');

      if (!payload || !expectedSignature) {
        return false;
      }

      // 署名検証
      const hmac = crypto.createHmac('sha256', this.secret);
      hmac.update(payload);
      const actualSignature = hmac.digest('hex');

      if (actualSignature !== expectedSignature) {
        return false;
      }

      // タイムスタンプ検証
      const data: StatePayload = JSON.parse(payload);
      const currentTime = Math.floor(Date.now() / 1000);
      const stateAge = currentTime - data.timestamp;
      const maxAge = this.expiryMinutes * 60; // 秒に変換

      return stateAge <= maxAge;
    } catch (error) {
      return false;
    }
  }

  /**
   * 期限切れチェック
   */
  public isExpired(state: string): boolean {
    try {
      const decoded = Buffer.from(state, 'base64').toString();
      const [payload] = decoded.split('.');
      const data: StatePayload = JSON.parse(payload);

      const currentTime = Math.floor(Date.now() / 1000);
      const stateAge = currentTime - data.timestamp;
      const maxAge = this.expiryMinutes * 60;

      return stateAge > maxAge;
    } catch {
      return true;
    }
  }

  /**
   * stateから生成時刻を取得
   */
  public getStateTimestamp(state: string): number | null {
    try {
      const decoded = Buffer.from(state, 'base64').toString();
      const [payload] = decoded.split('.');
      const data: StatePayload = JSON.parse(payload);
      return data.timestamp;
    } catch {
      return null;
    }
  }
}

export const oauthStateService = OAuthStateService.getInstance();