import * as crypto from "crypto";
import { environment } from "../config/environment";

export class EncryptionService {
  private static instance: EncryptionService;
  private readonly algorithm: string;
  private readonly key: Buffer;

  private constructor() {
    const config = environment.getEncryption();
    this.algorithm = config.algorithm;
    this.key = Buffer.from(config.key, 'hex');
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Slackトークンを暗号化（セキュアなAES-256-GCM実装）
   */
  public encryptSlackToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;

    // AAD（Additional Authenticated Data）を設定してコンテキストを認証
    const aad = Buffer.from('slack-token');
    cipher.setAAD(aad);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // AAD + IV + authTag + encryptedDataを結合して返す
    return aad.toString('hex') + ':' + iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Slackトークンを復号化
   */
  public decryptSlackToken(encryptedToken: string): string {
    const parts = encryptedToken.split(':');
    if (parts.length !== 4) {
      throw new Error('不正な暗号化データ形式');
    }

    const aad = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    // AADの検証
    if (aad.toString() !== 'slack-token') {
      throw new Error('不正なAAD: データの整合性が確認できません');
    }

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export const encryptionService = EncryptionService.getInstance();