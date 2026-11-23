import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { Mailer, type MailMessage } from '../../src/core/mail/mailer.js';

/** Every email the app sent during the tests, newest last. Nothing leaves the machine. */
export const mailbox: MailMessage[] = [];

class FakeMailer {
  async send(message: MailMessage) {
    mailbox.push(message);
  }
}

/** The 4-digit code in the newest email to this address. */
export function lastCodeTo(email: string): string {
  const mail = mailbox.filter((m) => m.to === email).at(-1);
  const code = mail?.text.match(/\b\d{4}\b/)?.[0];
  if (!code) throw new Error(`No code was emailed to ${email}`);
  return code;
}

/** The real app, configured exactly like main.ts, against the tawsela_test database. */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Mailer)
    .useClass(FakeMailer)
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({ logger: false });
  configureApp(app);
  await app.init();
  return app;
}
