drop policy if exists "Landlords can update their own properties" on public.properties;
create policy "Landlords can update their own properties"
  on public.properties
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Landlords can delete their own properties" on public.properties;
create policy "Landlords can delete their own properties"
  on public.properties
  for delete
  to authenticated
  using (auth.uid() = owner_id);
