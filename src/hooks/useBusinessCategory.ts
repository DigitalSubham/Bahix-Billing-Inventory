import { useQuery } from '@tanstack/react-query';
import { getProfileApi } from '../apis/authApi';
import { BusinessCategory, normalizeCategory } from '../constants/categoryFields';

/**
 * The business category drives which optional invoice fields the forms show.
 * Reads the same ['business'] profile query the settings screen writes to,
 * so changing the category refreshes every form.
 */
export const useBusinessCategory = (): BusinessCategory => {
  const { data } = useQuery({
    queryKey: ['business'],
    queryFn: getProfileApi,
    staleTime: 5 * 60 * 1000,
  });

  return normalizeCategory(data?.business_category);
};
