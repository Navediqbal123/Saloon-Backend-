CREATE OR REPLACE FUNCTION public.trimly_count_unique_shop_likes(target_shop_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COUNT(DISTINCT liked.customer_id)
  FROM public.liked_shops AS liked
  WHERE liked.shop_id = target_shop_id;
$$;

REVOKE ALL ON FUNCTION public.trimly_count_unique_shop_likes(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.trimly_count_unique_shop_likes(uuid)
TO service_role;
