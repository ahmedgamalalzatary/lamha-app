import type { HomeScreen } from '@tawsela/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';

/** The customer home (contract §8.2): tiles and the invite card's rewards. */
export const useHome = () => useQuery({ queryKey: ['home'], queryFn: () => api<HomeScreen>('/catalog/home') });
