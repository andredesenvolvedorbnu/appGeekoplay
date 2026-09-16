alter table public.profiles add column if not exists website_url text;

do $$ begin
  alter table public.profiles
    add constraint profiles_website_url_length_check
    check (website_url is null or char_length(website_url) <= 500);
exception when duplicate_object then null;
end $$;
