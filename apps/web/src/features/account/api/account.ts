import { useQuery } from '@tanstack/react-query';
import type { Me } from '@tawsela/shared';
import { api } from '@/core/api/client';

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api.request<Me>('/me') });
