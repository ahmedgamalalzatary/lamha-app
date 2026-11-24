'use client';

import { useState } from 'react';
import { Button, Dialog } from './ui';

/** A generated password, once (contract §2): copy it and hand it over. Admin, partner and driver accounts use it. */
export function PasswordShown({ password, onClose }: { password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog title="كلمة المرور الجديدة" onClose={onClose}>
      <p className="text-sm text-tw-ink-2">انسخ كلمة المرور وسلّمها لصاحب الحساب، لن تظهر مرة أخرى.</p>
      <p data-testid="generated-password" dir="ltr" className="rounded-xl bg-tw-input px-4 py-3 text-center font-mono text-xl font-bold tracking-wider">
        {password}
      </p>
      <div className="flex items-center gap-3">
        <Button
          tone="soft"
          className="flex-1"
          onClick={() => {
            void navigator.clipboard.writeText(password).then(() => setCopied(true));
          }}
        >
          {copied ? 'تم النسخ' : 'نسخ'}
        </Button>
        <Button onClick={onClose} className="flex-1">
          تم
        </Button>
      </div>
    </Dialog>
  );
}
