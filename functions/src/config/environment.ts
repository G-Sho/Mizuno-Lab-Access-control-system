import * as dotenv from "dotenv";

// 環境変数を読み込み（開発環境用）
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export interface EnvironmentConfig {
  slack: {
    webhookUrl: string;
    channelId: string;
    clientId: string;
    clientSecret: string;
  };
  encryption: {
    key: string;
    algorithm: string;
  };
  oauth: {
    stateSecret: string;
    expiryMinutes: number;
  };
  firebase: {
    serviceAccountId: string;
  };
}

class Environment {
  private static instance: Environment;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): Environment {
    if (!Environment.instance) {
      Environment.instance = new Environment();
    }
    return Environment.instance;
  }

  private loadConfig(): EnvironmentConfig {
    return {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channelId: process.env.SLACK_CHANNEL_ID || '',
        clientId: process.env.SLACK_CLIENT_ID || '',
        clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      },
      encryption: {
        key: process.env.ENCRYPTION_KEY || '',
        algorithm: 'aes-256-gcm',
      },
      oauth: {
        stateSecret: process.env.STATE_SECRET || process.env.ENCRYPTION_KEY || '',
        expiryMinutes: 10,
      },
      firebase: {
        serviceAccountId: 'mizuno-lab-access-control@appspot.gserviceaccount.com',
      },
    };
  }

  private validateConfig(): void {
    const required = [
      'slack.webhookUrl',
      'slack.clientId',
      'slack.clientSecret',
      'encryption.key',
      'oauth.stateSecret'
    ];

    for (const path of required) {
      const value = this.getNestedValue(this.config, path);
      if (!value) {
        throw new Error(`Required environment variable missing: ${path}`);
      }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  public get(): EnvironmentConfig {
    return { ...this.config };
  }

  public getSlack() {
    return this.config.slack;
  }

  public getEncryption() {
    return this.config.encryption;
  }

  public getOAuth() {
    return this.config.oauth;
  }

  public getFirebase() {
    return this.config.firebase;
  }
}

export const environment = Environment.getInstance();