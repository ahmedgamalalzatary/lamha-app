import { ApiStatus } from '@/features/health/ApiStatus';

/** الرئيسية. The overview arrives in Phase 24; Phase 0 shows the dashboard reaches the API. */
export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">الرئيسية</h1>
      <ApiStatus />
    </div>
  );
}
