-- ============================================================
-- Steady — Leaderboard wallets seed (run once)
-- Inserts the 16 initial wallets with source = 'manual'.
-- ON CONFLICT DO NOTHING makes this script safe to re-run.
-- ============================================================

insert into public.leaderboard_wallets (address, source)
values
  ('0xe6503009ee1a648c3775b6b8444afdddb786f1a9', 'manual'),
  ('0xa5b0edf6b55128e0ddae8e51ac538c3188401d41', 'manual'),
  ('0x6c8512516ce5669d35113a11ca8b8de322fd84f6', 'manual'),
  ('0xeadc152ac1014ace57c6b353f89adf5faffe9d55', 'manual'),
  ('0xa31441e058492bc7cfffda9aa7623c407ae83a81', 'manual'),
  ('0x4e14fc11f58b64740e66e4b1aa188a4b007c0eab', 'manual'),
  ('0xa1830e8d9f019feb448478a171bb37cc6c4c0482', 'manual'),
  ('0x939f95036d2e7b6d7419ec072bf9d967352204d2', 'manual'),
  ('0xe867fbdad3291530e41530301ecb77693850c78e', 'manual'),
  ('0x5b5d51203a0f9079f8aeb098a6523a13f298c060', 'manual'),
  ('0x03b9a189e2480d1e4c3007080b29f362282130fa', 'manual'),
  ('0x8af700ba841f30e0a3fcb0ee4c4a9d223e1efa05', 'manual'),
  ('0x519c721de735f7c9e6146d167852e60d60496a47', 'manual'),
  ('0xa65ce1d604fa901c13aa29f2126a57d9032e412b', 'manual'),
  ('0x023a3d058020fb76cca98f01b3c48c8938a22355', 'manual'),
  ('0xfd423284f6a9c73a2a3d53cab8921d6533533d97', 'manual')
on conflict (address) do nothing;
