import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ApiStatus } from '@/features/health/components/ApiStatus';

const realFetch = global.fetch;

function renderWithQuery() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  global.fetch = realFetch;
});

it('shows the API is connected, with its version', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'ok', db: 'up', version: '0.0.1', time: '' }),
  }) as unknown as typeof fetch;

  await renderWithQuery();

  expect(await screen.findByText('متصل بالخادم')).toBeTruthy();
  expect(screen.getByText('الإصدار 0.0.1')).toBeTruthy();
});

it('shows the error and retries on tap', async () => {
  const fetchMock = jest
    .fn()
    .mockRejectedValueOnce(new TypeError('Network request failed'))
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'ok', db: 'up', version: '0.0.1', time: '' }),
    });
  global.fetch = fetchMock as unknown as typeof fetch;

  await renderWithQuery();

  expect(await screen.findByText('تعذر الاتصال بالخادم')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'إعادة المحاولة' }));
  expect(await screen.findByText('متصل بالخادم')).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
