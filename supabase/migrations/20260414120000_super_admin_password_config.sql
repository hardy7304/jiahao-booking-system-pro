-- 平台管理（Super Admin）密碼：與單店 admin_password 分開；value 空白表示尚未設定
INSERT INTO public.system_config (store_id, key, value)
VALUES ('8e8388bf-860e-44f7-8e14-35b76c64fb52'::uuid, 'super_admin_password', '')
ON CONFLICT (store_id, key) DO NOTHING;
