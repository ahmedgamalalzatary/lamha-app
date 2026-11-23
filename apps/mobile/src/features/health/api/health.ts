import type { HealthResponse } from '@tawsela/shared';
import { api } from '@/core/api/client';

export const getHealth = () => api<HealthResponse>('/health');
