import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { isEgyptianMobile, normalizePhone, type PartnerAccount } from '@tawsela/shared';
import * as Clipboard from 'expo-clipboard';
import { Ban, CircleCheck, KeyRound, Search, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { toast } from '@/components/Toast';
import { ApiRequestError } from '@/core/api/client';
import { errorMessage } from '@/core/api/error-message';
import { useSubmit } from '@/core/hooks/useSubmit';
import { useT } from '@/core/i18n';
import { colors, fonts, radius, spacing } from '@/core/theme';
import { partnersApi } from '../api/partners';

type Pending = { kind: 'reset' | 'disable' | 'enable'; account: PartnerAccount };
type Shown = { phone: string; password: string };

const fullName = (a: PartnerAccount) => `${a.firstName} ${a.lastName}`.trim();

/**
 * The admin's one area in the app (contract §11.2, M2): partner accounts with search; create one for a
 * store, reset its password, disable or enable it. A generated password is shown once, with copy and
 * share. Driver accounts join in Phase 12. [Open] No Tawsilty screen exists for this; it uses the
 * account screen's cards, sheets and the address-delete confirm look.
 */
export function AccountsScreen() {
  const t = useT();
  const client = useQueryClient();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);

  // Ask the server once typing pauses.
  useEffect(() => {
    const id = setTimeout(() => setSearch(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  // While a new search loads, the last results stay on screen instead of skeletons.
  const accounts = useQuery({ queryKey: ['admin', 'partners', search], queryFn: () => partnersApi.list(search), placeholderData: keepPreviousData });
  const refresh = () => client.invalidateQueries({ queryKey: ['admin', 'partners'] });

  const act = useSubmit(async ({ kind, account }: Pending) => {
    setPending(null);
    if (kind === 'reset') {
      const { password } = await partnersApi.resetPassword(account.id);
      setShown({ phone: account.phone, password });
    } else {
      await partnersApi.setDisabled(account.id, kind === 'disable');
    }
    await refresh();
  });

  const titles = { reset: t('accounts.reset'), disable: t('accounts.disable'), enable: t('accounts.enable') } as const;
  const bodies = { reset: 'accounts.resetBody', disable: 'accounts.disableBody', enable: 'accounts.enableBody' } as const;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <AppText accessibilityRole="header" weight="bold" size={24}>
          {t('accounts.title')}
        </AppText>
        <AppText color={colors.ink2}>{t('accounts.subtitle')}</AppText>
      </View>
      <View style={styles.search}>
        <Search size={20} color={colors.ink2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          accessibilityLabel={t('accounts.search')}
          placeholder={t('accounts.searchPlaceholder')}
          placeholderTextColor={colors.ink2}
          style={styles.searchInput}
        />
      </View>

      {accounts.isPending ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : accounts.isError ? (
        <View style={styles.errorBox}>
          <AppText color={colors.danger}>{errorMessage(accounts.error)}</AppText>
          <Button label={t('common.retry')} variant="soft" onPress={() => void accounts.refetch()} />
        </View>
      ) : (
        <FlatList
          data={accounts.data}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={[styles.list, accounts.data.length === 0 && styles.grow]}
          ListEmptyComponent={<EmptyState icon={Users} title={t('accounts.empty')} message={t('accounts.emptyBody')} />}
          renderItem={({ item }) => (
            <AccountCard
              account={item}
              onReset={() => setPending({ kind: 'reset', account: item })}
              onToggle={() => setPending({ kind: item.disabled ? 'enable' : 'disable', account: item })}
            />
          )}
        />
      )}

      <View style={styles.footer}>
        <Button label={t('accounts.add')} onPress={() => setAdding(true)} />
      </View>

      <ConfirmDialog
        visible={pending !== null}
        tone="primary"
        title={pending ? titles[pending.kind] : ''}
        message={pending ? t(bodies[pending.kind], { name: fullName(pending.account) }) : undefined}
        confirmLabel={t('accounts.confirm')}
        onConfirm={() => pending && void act.run(pending)}
        onCancel={() => setPending(null)}
      />
      <NewAccountSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onCreated={async (s) => {
          setAdding(false);
          setShown(s);
          await refresh();
        }}
      />
      <PasswordSheet shown={shown} onClose={() => setShown(null)} />
    </SafeAreaView>
  );
}

function AccountCard({ account, onReset, onToggle }: { account: PartnerAccount; onReset: () => void; onToggle: () => void }) {
  const t = useT();
  const name = fullName(account);
  return (
    <View testID={`account-${name}`} style={styles.card}>
      <View style={styles.cardText}>
        <View style={styles.row}>
          <AppText weight="bold" size={16}>
            {name}
          </AppText>
          {account.disabled ? (
            <View style={styles.pill}>
              <AppText size={12} weight="semibold" color={colors.danger}>
                {t('accounts.disabled')}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText color={colors.ink2}>{account.store.name}</AppText>
        <AppText color={colors.ink2}>{account.phone}</AppText>
      </View>
      <IconAction label={t('accounts.reset')} onPress={onReset}>
        <KeyRound size={20} color={colors.primary} />
      </IconAction>
      <IconAction label={t(account.disabled ? 'accounts.enable' : 'accounts.disable')} onPress={onToggle}>
        {account.disabled ? <CircleCheck size={20} color={colors.success} /> : <Ban size={20} color={colors.danger} />}
      </IconAction>
    </View>
  );
}

function IconAction({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={styles.iconAction}>
      {children}
    </Pressable>
  );
}

function NewAccountSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (s: Shown) => void }) {
  const t = useT();
  const stores = useQuery({ queryKey: ['admin', 'stores'], queryFn: partnersApi.stores, enabled: visible });
  const [storeQuery, setStoreQuery] = useState('');
  const [storeId, setStoreId] = useState<number | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = storeId !== null && firstName.trim() !== '' && isEgyptianMobile(normalizePhone(phone));
  const matching = (stores.data ?? []).filter((s) => s.name.includes(storeQuery.trim()));

  const reset = () => {
    setStoreQuery('');
    setStoreId(null);
    setFirstName('');
    setLastName('');
    setPhone('');
    setError(null);
  };

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await partnersApi.create({ storeId, firstName: firstName.trim(), lastName: lastName.trim(), phone: normalizePhone(phone) });
      reset();
      onCreated({ phone: res.account.phone, password: res.password });
    } catch (e) {
      setError(e instanceof ApiRequestError && e.code === 'PHONE_TAKEN' ? t('accounts.phoneTaken') : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} title={t('accounts.newTitle')} onClose={onClose} scroll>
      <View style={styles.sheetBody}>
        <AppText weight="semibold">{t('accounts.store')}</AppText>
        <TextField value={storeQuery} onChangeText={setStoreQuery} accessibilityLabel={t('accounts.storeSearch')} placeholder={t('accounts.storeSearch')} />
        <View accessibilityRole="radiogroup" style={styles.stores}>
          {stores.data && matching.length === 0 ? <AppText color={colors.ink2}>{t('accounts.noStores')}</AppText> : null}
          {matching.slice(0, 8).map((s) => {
            const on = s.id === storeId;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="radio"
                accessibilityLabel={s.name}
                accessibilityState={{ checked: on }}
                onPress={() => setStoreId(s.id)}
                style={[styles.storeRow, on && styles.storeRowOn]}
              >
                <View style={[styles.radio, on && styles.radioOn]} />
                <AppText weight={on ? 'bold' : 'regular'}>{s.name}</AppText>
              </Pressable>
            );
          })}
        </View>
        <TextField label={t('auth.details.firstName')} value={firstName} onChangeText={setFirstName} maxLength={100} />
        <TextField label={t('auth.details.lastName')} value={lastName} onChangeText={setLastName} maxLength={100} />
        <TextField label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01xxxxxxxxx" />
        <AppText size={12} color={colors.ink2}>
          {t('accounts.generatedNote')}
        </AppText>
        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label={t('common.save')} disabled={!ready} loading={busy} onPress={() => void save()} />
      </View>
    </BottomSheet>
  );
}

/** The generated password, once (contract §2, §11.2): copy or share it, then it is gone. */
function PasswordSheet({ shown, onClose }: { shown: Shown | null; onClose: () => void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const close = () => {
    setCopied(false);
    onClose();
  };
  return (
    <BottomSheet visible={shown !== null} title={t('accounts.passwordTitle')} onClose={close}>
      {shown ? (
        <View style={styles.sheetBody}>
          <AppText color={colors.ink2}>{t('accounts.passwordBody')}</AppText>
          <View style={styles.passwordBox}>
            <AppText testID="generated-password" weight="bold" size={22} style={styles.password}>
              {shown.password}
            </AppText>
          </View>
          <View style={styles.row}>
            <Button
              label={copied ? t('accounts.copied') : t('accounts.copy')}
              variant="soft"
              style={styles.flex}
              onPress={() => {
                void Clipboard.setStringAsync(shown.password).then(() => {
                  setCopied(true);
                  toast.show(t('accounts.copied'), 'success');
                });
              }}
            />
            <Button
              label={t('accounts.share')}
              variant="soft"
              style={styles.flex}
              onPress={() => void Share.share({ message: t('accounts.shareMessage', { phone: shown.phone, password: shown.password }) })}
            />
          </View>
          <Button label={t('accounts.done')} onPress={close} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: spacing.md, textAlign: 'right' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  grow: { flexGrow: 1 },
  skeleton: { height: 92, borderRadius: radius.md },
  errorBox: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardText: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: '#FDECEA' },
  iconAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.bg },
  footer: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  sheetBody: { gap: spacing.md, paddingVertical: spacing.md },
  stores: { gap: spacing.xs },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  storeRowOn: { backgroundColor: colors.primary50 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.line },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  passwordBox: { padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.input, alignItems: 'center' },
  password: { letterSpacing: 2, writingDirection: 'ltr' },
  flex: { flex: 1 },
});
